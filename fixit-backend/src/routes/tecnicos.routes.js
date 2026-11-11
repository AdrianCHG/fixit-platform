import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// CONFIGURACIÓN DE MULTER PARA AVATAR
// ==========================================
const storageAvatar = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/avatars';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const uploadAvatar = multer({ 
  storage: storageAvatar,
  limits: { fileSize: 2 * 1024 * 1024 }, // Límite de 2MB
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|webp/;
    const esExtValida = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
    const esMimeValido = tiposPermitidos.test(file.mimetype);
    if (esExtValida && esMimeValido) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPG, PNG, WEBP).'));
    }
  }
});

// ==========================================
// CONFIGURACIÓN DE MULTER PARA CERTIFICADOS
// ==========================================
const storageCert = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/certificados';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `cert-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const uploadCert = multer({ 
  storage: storageCert,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = /pdf|jpeg|jpg|png|webp/;
    const esExtValida = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
    const esMimeValido = tiposPermitidos.test(file.mimetype) || file.mimetype === 'application/pdf';
    if (esExtValida && esMimeValido) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF o imágenes (JPG, PNG).'));
    }
  }
});

// ==========================================
// RUTAS
// ==========================================

// Catálogo global de modalidades de servicio
router.get('/modalidades', async (_req, res, next) => {
  try {
    const [modalidades] = await pool.query(
      `SELECT id, codigo, nombre FROM modalidades_servicio ORDER BY nombre`
    );
    return res.json({ success: true, data: modalidades });
  } catch (error) {
    next(error);
  }
});

// Obtener técnicos (CON SOPORTE PARA FILTROS DE DISTANCIA Y DISPONIBILIDAD)
router.get('/', async (req, res, next) => {
  try {
    // Capturamos los filtros de la URL (Query Params)
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const cercania = parseFloat(req.query.cercania);
    const disponibilidad = req.query.disponibilidad;

    let selectFields = `
      u.id, u.nombre_completo AS nombre, u.telefono,
      p.biografia, p.anios_experiencia, p.estado_verificacion,
      p.avatar_url, p.tarifa_hora_min, p.tarifa_hora_max,
      p.calificacion_prom AS calificacion, p.nro_reseñas AS resenas, p.acepta_reservas
    `;
    let joinClauses = `INNER JOIN perfiles_tecnico p ON p.usuario_id = u.id`;
    let whereClauses = [`u.rol = 'TECNICO'`, `u.estado = 'ACTIVO'`];
    const queryParams = [];

    // 1. FILTRO DE CERCANÍA (Fórmula de Haversine nativa en SQL)
    if (!isNaN(lat) && !isNaN(lng)) {
      selectFields += `, 
        (6371 * acos(
          cos(radians(?)) * cos(radians(d.latitud)) * 
          cos(radians(d.longitud) - radians(?)) + 
          sin(radians(?)) * sin(radians(d.latitud))
        )) AS distancia
      `;
      queryParams.push(lat, lng, lat);
      // Hacemos JOIN con la dirección para obtener la ubicación del taller del técnico
      joinClauses += ` LEFT JOIN direcciones d ON d.usuario_id = u.id AND d.es_principal = 1`;
    } else {
      selectFields += `, NULL AS distancia`;
    }

    // 2. FILTRO DE DISPONIBILIDAD
    if (disponibilidad === 'hoy' || disponibilidad === 'inmediata') {
      whereClauses.push(`p.acepta_reservas = 1`);
    }

    // Construimos la consulta base
    let queryStr = `SELECT ${selectFields} FROM usuarios u ${joinClauses} WHERE ${whereClauses.join(' AND ')}`;

    // Si pasaron los kilómetros deseados, filtramos los resultados matemáticamente
    if (!isNaN(lat) && !isNaN(lng) && !isNaN(cercania) && cercania > 0) {
      queryStr += ` HAVING distancia <= ?`;
      queryParams.push(cercania);
    }

    // Ordenamiento final
    queryStr += ` ORDER BY p.calificacion_prom DESC, p.nro_reseñas DESC`;

    const [tecnicos] = await pool.query(queryStr, queryParams);

    if (tecnicos.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // El resto del código de agrupaciones se mantiene intacto para optimización
    const ids = tecnicos.map((tecnico) => tecnico.id);
    const placeholders = ids.map(() => '?').join(', ');

    const [especialidades] = await pool.query(
      `SELECT te.tecnico_id, e.nombre FROM tecnico_especialidades te INNER JOIN especialidades e ON e.id = te.especialidad_id WHERE te.tecnico_id IN (${placeholders}) ORDER BY e.nombre`,
      ids
    );

    const [categorias] = await pool.query(
      `SELECT tc.tecnico_id, c.nombre FROM tecnico_categorias tc INNER JOIN categorias_problema c ON c.id = tc.categoria_id WHERE tc.tecnico_id IN (${placeholders}) ORDER BY c.nombre`,
      ids
    );

    const [equipos] = await pool.query(
      `SELECT tt.tecnico_id, t.codigo, t.nombre FROM tecnico_tipos_equipo tt INNER JOIN tipos_equipo t ON t.id = tt.tipo_equipo_id WHERE tt.tecnico_id IN (${placeholders}) ORDER BY t.nombre`,
      ids
    );

    const [modalidades] = await pool.query(
      `SELECT tm.tecnico_id, m.codigo, m.nombre FROM tecnico_modalidades tm INNER JOIN modalidades_servicio m ON m.id = tm.modalidad_id WHERE tm.tecnico_id IN (${placeholders}) ORDER BY m.nombre`,
      ids
    );

    const [zonasAtencion] = await pool.query(
      `SELECT ct.tecnico_id, d.nombre AS distrito, d.ciudad FROM cobertura_tecnico ct INNER JOIN distritos d ON d.id = ct.distrito_id WHERE ct.tecnico_id IN (${placeholders}) ORDER BY d.nombre`,
      ids
    );

    const agrupar = (filas, idCampo, transformar) => {
      const resultado = {};
      for (const fila of filas) {
        if (!resultado[fila[idCampo]]) {
          resultado[fila[idCampo]] = [];
        }
        resultado[fila[idCampo]].push(transformar(fila));
      }
      return resultado;
    };

    const especialidadesPorTecnico = agrupar(especialidades, 'tecnico_id', (fila) => fila.nombre);
    const categoriasPorTecnico = agrupar(categorias, 'tecnico_id', (fila) => fila.nombre);
    const equiposPorTecnico = agrupar(equipos, 'tecnico_id', (fila) => ({ codigo: fila.codigo, nombre: fila.nombre }));
    const zonasPorTecnico = agrupar(zonasAtencion, 'tecnico_id', (fila) => ({ distrito: fila.distrito, ciudad: fila.ciudad }));
    const modalidadesPorTecnico = agrupar(modalidades, 'tecnico_id', (fila) => ({ codigo: fila.codigo, nombre: fila.nombre }));

    const resultado = tecnicos.map((tecnico) => ({
      ...tecnico,
      calificacion: Number(tecnico.calificacion),
      resenas: Number(tecnico.resenas),
      tarifa_hora_min: tecnico.tarifa_hora_min === null ? null : Number(tecnico.tarifa_hora_min),
      tarifa_hora_max: tecnico.tarifa_hora_max === null ? null : Number(tecnico.tarifa_hora_max),
      distancia_km: tecnico.distancia !== null ? Number(tecnico.distancia).toFixed(2) : null, // NUEVO CAMPO
      especialidades: especialidadesPorTecnico[tecnico.id] || [],
      categorias: categoriasPorTecnico[tecnico.id] || [],
      equipos: equiposPorTecnico[tecnico.id] || [],
      modalidades: modalidadesPorTecnico[tecnico.id] || [],
      zonas_atencion: zonasPorTecnico[tecnico.id] || []
    }));

    return res.json({ success: true, data: resultado });
  } catch (error) {
    next(error);
  }
});

// RUTA PRIVADA: Obtener mi propio perfil de técnico (Dashboard)
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.sub;
    
    if (req.user.rol !== 'TECNICO') {
      return res.status(403).json({ success: false, message: 'Acceso denegado. Área exclusiva para técnicos.' });
    }

    // AÑADIDO: LEFT JOIN con tabla direcciones
    const [tecnicos] = await pool.query(`
      SELECT
        u.id, u.nombre_completo AS nombre, u.correo, u.telefono, u.tipo_documento, u.nro_documento, u.estado,
        p.biografia, p.anios_experiencia, p.estado_verificacion,
        p.avatar_url, p.tarifa_hora_min, p.tarifa_hora_max,
        p.calificacion_prom AS calificacion, p.nro_reseñas AS resenas, p.acepta_reservas,
        d.distrito_id, d.calle, d.referencia, d.latitud, d.longitud
      FROM usuarios u
      INNER JOIN perfiles_tecnico p ON p.usuario_id = u.id
      LEFT JOIN direcciones d ON d.usuario_id = u.id AND d.es_principal = 1
      WHERE u.id = ? AND u.rol = 'TECNICO'
    `, [userId]);

    if (tecnicos.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontró tu perfil de técnico.' });
    }

    const tecnico = tecnicos[0];

    const [certificaciones] = await pool.query(`
      SELECT id, tipo, url_archivo AS archivo_url, estado, creado_en
      FROM documentos_tecnico
      WHERE tecnico_id = ?
    `, [userId]);

    const [cobertura] = await pool.query(`
      SELECT d.id AS distrito_id, d.nombre AS nombre_distrito 
      FROM cobertura_tecnico ct
      JOIN distritos d ON ct.distrito_id = d.id
      WHERE ct.tecnico_id = ?
    `, [userId]);

    const [modalidades] = await pool.query(`
      SELECT m.id AS modalidad_id, m.nombre AS nombre_modalidad 
      FROM tecnico_modalidades tm
      JOIN modalidades_servicio m ON tm.modalidad_id = m.id
      WHERE tm.tecnico_id = ?
    `, [userId]);

    const resultado = {
      ...tecnico,
      calificacion: Number(tecnico.calificacion),
      resenas: Number(tecnico.resenas),
      certificaciones: certificaciones,
      cobertura: cobertura,
      modalidades: modalidades
    };

    return res.json({ success: true, data: resultado });
  } catch (error) {
    next(error);
  }
});

// RUTA PRIVADA: Actualizar mi propio perfil de técnico
router.put('/me', authenticateToken, uploadAvatar.single('avatar'), async (req, res, next) => {
  let connection;

  try {
    const userId = req.user.sub;

    if (req.user.rol !== 'TECNICO') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    // AÑADIDO: Recepción de campos de dirección
    const { 
      nombre, telefono, biografia, anios_experiencia, tarifa_hora_min, tarifa_hora_max,
      distrito_id, calle, referencia, latitud, longitud 
    } = req.body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `UPDATE usuarios SET nombre_completo = ?, telefono = ? WHERE id = ?`,
      [nombre, telefono, userId]
    );

    let avatarQueryPart = '';
    let queryParams = [biografia, anios_experiencia, tarifa_hora_min, tarifa_hora_max];

    if (req.file) {
      const nuevaRutaAvatar = `/uploads/avatars/${req.file.filename}`;
      const [perfilActual] = await connection.query(`SELECT avatar_url FROM perfiles_tecnico WHERE usuario_id = ?`, [userId]);
      if (perfilActual.length > 0 && perfilActual[0].avatar_url) {
        const rutaAntiguaDir = path.join(process.cwd(), perfilActual[0].avatar_url);
        if (fs.existsSync(rutaAntiguaDir)) {
          fs.unlinkSync(rutaAntiguaDir); 
        }
      }

      avatarQueryPart = `, avatar_url = ?`;
      queryParams.push(nuevaRutaAvatar);
    }

    queryParams.push(userId);

    await connection.query(
      `UPDATE perfiles_tecnico 
       SET biografia = ?, anios_experiencia = ?, tarifa_hora_min = ?, tarifa_hora_max = ? ${avatarQueryPart}
       WHERE usuario_id = ?`,
      queryParams
    );

    // AÑADIDO: GUARDAR UBICACIÓN (TALLER) DEL TÉCNICO EN TABLA DIRECCIONES
    if (distrito_id && calle) {
      const [dirRows] = await connection.query(
        `SELECT id FROM direcciones WHERE usuario_id = ? LIMIT 1`,
        [userId]
      );

      if (dirRows.length > 0) {
        await connection.query(
          `UPDATE direcciones 
           SET distrito_id = ?, calle = ?, referencia = ?, latitud = ?, longitud = ?, es_principal = 1 
           WHERE usuario_id = ?`,
          [distrito_id, calle, referencia || null, latitud || null, longitud || null, userId]
        );
      } else {
        await connection.query(
          `INSERT INTO direcciones (id, usuario_id, distrito_id, calle, referencia, latitud, longitud, es_principal)
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, 1)`,
          [userId, distrito_id, calle, referencia || null, latitud || null, longitud || null]
        );
      }
    }

    // GUARDAR COBERTURA DE DISTRITOS
    if (req.body.cobertura) {
      const distritosSeleccionados = JSON.parse(req.body.cobertura);
      await connection.query('DELETE FROM cobertura_tecnico WHERE tecnico_id = ?', [userId]);
      if (distritosSeleccionados.length > 0) {
        const values = distritosSeleccionados.map(distritoId => [userId, distritoId]);
        await connection.query('INSERT INTO cobertura_tecnico (tecnico_id, distrito_id) VALUES ?', [values]);
      }
    }

    // GUARDAR MODALIDADES DE TRABAJO
    if (req.body.modalidades) {
      const modalidadesSeleccionadas = JSON.parse(req.body.modalidades);
      await connection.query('DELETE FROM tecnico_modalidades WHERE tecnico_id = ?', [userId]);
      if (modalidadesSeleccionadas.length > 0) {
        const valuesMod = modalidadesSeleccionadas.map(modId => [userId, modId]);
        await connection.query('INSERT INTO tecnico_modalidades (tecnico_id, modalidad_id) VALUES ?', [valuesMod]);
      }
    }

    await connection.commit();

    return res.json({ success: true, message: 'Perfil actualizado correctamente en la base de datos.' });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error al revertir actualización de perfil:', rollbackError);
      }
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
});

// RUTA PRIVADA: Subir certificados o antecedentes
router.post('/me/certificaciones', authenticateToken, uploadCert.single('archivo'), async (req, res, next) => {
  try {
    const userId = req.user.sub;

    if (req.user.rol !== 'TECNICO') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    const { tipo } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Debe adjuntar un archivo válido.' });
    }

    const archivoUrl = `/uploads/certificados/${req.file.filename}`;

    const [docsActuales] = await pool.query(
      `SELECT id, tipo, url_archivo FROM documentos_tecnico WHERE tecnico_id = ?`,
      [userId]
    );

    if (docsActuales.length >= 5 && tipo !== 'ANTECEDENTES') {
      fs.unlinkSync(path.join(process.cwd(), archivoUrl));
      return res.status(400).json({ success: false, message: 'Has alcanzado el límite máximo de 5 documentos permitidos.' });
    }

    if (tipo === 'ANTECEDENTES') {
      const antecedenteExistente = docsActuales.find(doc => doc.tipo === 'ANTECEDENTES');
      if (antecedenteExistente) {
        const rutaAntigua = path.join(process.cwd(), antecedenteExistente.url_archivo);
        if (fs.existsSync(rutaAntigua)) {
          fs.unlinkSync(rutaAntigua);
        }
        await pool.query(
          `UPDATE documentos_tecnico SET tipo = ?, url_archivo = ?, estado = 'PENDIENTE' WHERE id = ?`,
          [tipo, archivoUrl, antecedenteExistente.id]
        );
        return res.json({ success: true, message: 'Certificado de antecedentes actualizado correctamente.' });
      }
    }

    const docId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO documentos_tecnico (id, tecnico_id, tipo, url_archivo, estado) VALUES (?, ?, ?, ?, 'PENDIENTE')`,
      [docId, userId, tipo, archivoUrl]
    );

    return res.json({ success: true, message: 'Documento subido exitosamente y pendiente de revisión.' });
  } catch (error) {
    next(error);
  }
});

// Obtener perfil público de un técnico por ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [tecnicos] = await pool.query(`
      SELECT
        u.id, u.nombre_completo AS nombre, u.telefono,
        p.biografia, p.anios_experiencia, p.estado_verificacion,
        p.avatar_url,
        p.tarifa_hora_min, p.tarifa_hora_max,
        p.calificacion_prom AS calificacion, p.nro_reseñas AS resenas, p.acepta_reservas
      FROM usuarios u
      INNER JOIN perfiles_tecnico p ON p.usuario_id = u.id
      WHERE u.id = ? AND u.rol = 'TECNICO' AND u.estado = 'ACTIVO'
    `, [id]);

    if (tecnicos.length === 0) {
      return res.status(404).json({ success: false, message: 'Técnico no encontrado.' });
    }

    const tecnico = tecnicos[0];

    const [especialidades] = await pool.query(`
      SELECT e.nombre FROM tecnico_especialidades te INNER JOIN especialidades e ON e.id = te.especialidad_id WHERE te.tecnico_id = ?
    `, [id]);

    const [certificaciones] = await pool.query(`
      SELECT id, tipo, url_archivo AS archivo_url, estado FROM documentos_tecnico WHERE tecnico_id = ?
    `, [id]);

    const [zonasAtencion] = await pool.query(`
      SELECT d.id AS distrito_id, d.nombre AS nombre_distrito, d.ciudad 
      FROM cobertura_tecnico ct 
      INNER JOIN distritos d ON d.id = ct.distrito_id 
      WHERE ct.tecnico_id = ? 
      ORDER BY d.nombre
    `, [id]);

    const [modalidades] = await pool.query(`
      SELECT m.id AS modalidad_id, m.nombre AS nombre_modalidad, m.codigo 
      FROM tecnico_modalidades tm 
      JOIN modalidades_servicio m ON m.id = tm.modalidad_id 
      WHERE tm.tecnico_id = ?
    `, [id]);

    const resultado = {
      ...tecnico,
      calificacion: Number(tecnico.calificacion),
      resenas: Number(tecnico.resenas),
      especialidades: especialidades.map(e => e.nombre),
      certificaciones: certificaciones,
      zonas_atencion: zonasAtencion,
      modalidades: modalidades
    };
    return res.json({ success: true, data: resultado });
  } catch (error) {
    next(error);
  }
});

export default router;