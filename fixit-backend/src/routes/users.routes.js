import { Router } from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Obtener el perfil del usuario autenticado (incluyendo su dirección y coordenadas)
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
          u.id, u.correo, u.nombre_completo, u.telefono,
          u.tipo_documento, u.nro_documento, u.rol, u.estado,
          u.correo_verificado_en, u.creado_en, u.actualizado_en,
          d.distrito_id, d.calle, d.referencia, d.latitud, d.longitud
       FROM usuarios u
       LEFT JOIN direcciones d ON u.id = d.usuario_id AND d.es_principal = 1
       WHERE u.id = ? 
       LIMIT 1`,
      [req.user.sub]
    );

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado.'
      });
    }

    return res.json({ ok: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// Actualizar los datos del perfil y la dirección del usuario autenticado
router.put('/me', authenticateToken, async (req, res, next) => {
  // Obtenemos una conexión exclusiva del pool para manejar una transacción segura
  const connection = await pool.getConnection();

  try {
    const {
      nombre_completo,
      telefono,
      tipo_documento,
      nro_documento,
      distrito_id,
      calle,
      referencia,
      latitud,   // <-- Añadido
      longitud   // <-- Añadido
    } = req.body;

    if (!nombre_completo || !tipo_documento || !nro_documento) {
      connection.release();
      return res.status(400).json({
        ok: false,
        message: 'Nombre completo, tipo de documento y número de documento son obligatorios.'
      });
    }

    // Iniciamos la transacción
    await connection.beginTransaction();

    // 1. Actualizamos la tabla de usuarios
    await connection.execute(
      `UPDATE usuarios
       SET nombre_completo = ?,
           telefono = ?,
           tipo_documento = ?,
           nro_documento = ?
       WHERE id = ?`,
      [
        nombre_completo.trim(),
        telefono ? telefono.trim() : null,
        tipo_documento,
        nro_documento.trim(),
        req.user.sub
      ]
    );

    // 2. Gestionamos la tabla de direcciones (si el frontend envía datos de dirección)
    if (distrito_id && calle) {
      // Verificamos si el usuario ya tiene una dirección registrada
      const [dirRows] = await connection.execute(
        `SELECT id FROM direcciones WHERE usuario_id = ? LIMIT 1`,
        [req.user.sub]
      );

      if (dirRows.length > 0) {
        // Hacemos UPDATE si ya existe (incluyendo latitud y longitud)
        await connection.execute(
          `UPDATE direcciones 
           SET distrito_id = ?, calle = ?, referencia = ?, latitud = ?, longitud = ?, es_principal = 1 
           WHERE usuario_id = ?`,
          [
            distrito_id, 
            calle.trim(), 
            referencia ? referencia.trim() : null,
            latitud || null,    // <-- Añadido
            longitud || null,   // <-- Añadido
            req.user.sub
          ]
        );
      } else {
        // Hacemos INSERT si es su primera dirección (incluyendo latitud y longitud)
        await connection.execute(
          `INSERT INTO direcciones (id, usuario_id, distrito_id, calle, referencia, latitud, longitud, es_principal)
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, 1)`,
          [
            req.user.sub,
            distrito_id,
            calle.trim(),
            referencia ? referencia.trim() : null,
            latitud || null,    // <-- Añadido
            longitud || null    // <-- Añadido
          ]
        );
      }
    }

    // Confirmamos la transacción (ambas tablas se guardan al mismo tiempo)
    await connection.commit();

    // 3. Devolvemos los datos frescos actualizados (incluyendo latitud y longitud)
    const [updatedRows] = await connection.execute(
      `SELECT 
          u.id, u.correo, u.nombre_completo, u.telefono,
          u.tipo_documento, u.nro_documento, u.rol, u.estado,
          d.distrito_id, d.calle, d.referencia, d.latitud, d.longitud
       FROM usuarios u
       LEFT JOIN direcciones d ON u.id = d.usuario_id AND d.es_principal = 1
       WHERE u.id = ? 
       LIMIT 1`,
      [req.user.sub]
    );

    connection.release();

    return res.json({
      ok: true,
      message: 'Datos y dirección actualizados correctamente.',
      data: updatedRows[0]
    });

  } catch (error) {
    // Si algo falla, revertimos todos los cambios para no dejar datos corruptos
    await connection.rollback();
    connection.release();
    next(error);
  }
});

export default router;