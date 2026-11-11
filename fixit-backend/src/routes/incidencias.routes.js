import express from 'express';
import { randomUUID } from 'node:crypto';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configuración de Multer para guardar las imágenes de incidencias
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/incidencias/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

// Filtro para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('El archivo no es una imagen válida.'), false);
  }
};

// Middleware configurado (permite hasta 3 imágenes, máx 5MB c/u)
const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// --- RUTAS ---

// Obtener catálogos de tipos de equipo y categorías
router.get('/catalogos', async (req, res, next) => {
  try {
    const [tiposEquipo] = await pool.query(`
      SELECT id, codigo, nombre
      FROM tipos_equipo
      ORDER BY 
        CASE 
          WHEN LOWER(nombre) LIKE 'otro%' THEN 1 
          ELSE 0 
        END ASC,
        nombre ASC
    `);

    const [categorias] = await pool.query(`
      SELECT id, codigo, nombre
      FROM categorias_problema
      ORDER BY 
        CASE 
          WHEN LOWER(nombre) LIKE 'otro%' THEN 1
          WHEN LOWER(nombre) LIKE 'no estoy%' THEN 1
          WHEN LOWER(nombre) LIKE '%seguro%' THEN 1
          ELSE 0 
        END ASC,
        nombre ASC
    `);

    return res.json({
      success: true,
      data: { tiposEquipo, categorias }
    });
  } catch (error) {
    next(error);
  }
});

// Registrar nueva incidencia con hasta 3 fotos adjuntas
router.post('/', authenticateToken, upload.array('fotos', 3), async (req, res, next) => {
  let connection;

  try {
    const { tipo_equipo_id, categoria_id, descripcion } = req.body;

    if (!tipo_equipo_id || !descripcion || descripcion.trim() === '') {
      return res.status(400).json({ success: false, message: 'Faltan datos obligatorios.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const incidenciaId = randomUUID();
    const clienteId = req.user.sub;
    const categoriaId = categoria_id || null;

    await connection.query(
      `INSERT INTO incidencias (id, cliente_id, tipo_equipo_id, categoria_id, descripcion, estado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [incidenciaId, clienteId, tipo_equipo_id, categoriaId, descripcion.trim(), 'REPORTADA']
    );

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const adjuntoId = randomUUID();
        const urlArchivo = file.path.replace(/\\/g, '/'); 

        await connection.query(
          `INSERT INTO adjuntos_incidencia (id, incidencia_id, url_archivo, tipo_mime, tamano_bytes)
           VALUES (?, ?, ?, ?, ?)`,
          [adjuntoId, incidenciaId, urlArchivo, file.mimetype, file.size]
        );
      }
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Incidencia y fotos registradas correctamente.',
      data: { id: incidenciaId }
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error al revertir transacción de incidencia:', rollbackError);
      }
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
});

// Obtener incidencias del cliente autenticado
router.get('/mis-incidencias', authenticateToken, async (req, res, next) => {
  try {
    const clienteId = req.user.sub;

    const [incidencias] = await pool.query(
      `SELECT i.id, i.descripcion, i.estado, i.creado_en,
        te.nombre AS tipo_equipo, cp.nombre AS categoria
       FROM incidencias i
       LEFT JOIN tipos_equipo te ON te.id = i.tipo_equipo_id
       LEFT JOIN categorias_problema cp ON cp.id = i.categoria_id
       WHERE i.cliente_id = ?
       ORDER BY i.creado_en DESC`,
      [clienteId]
    );

    return res.json({ success: true, data: incidencias });
  } catch (error) {
    next(error);
  }
});

// Obtener el detalle de una incidencia específica (con sus fotos)
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const incidenciaId = req.params.id;
    const clienteId = req.user.sub;

    const [incidencias] = await pool.query(
      `SELECT i.id, i.descripcion, i.estado, i.creado_en, i.actualizado_en,
        te.nombre AS tipo_equipo, cp.nombre AS categoria
       FROM incidencias i
       LEFT JOIN tipos_equipo te ON te.id = i.tipo_equipo_id
       LEFT JOIN categorias_problema cp ON cp.id = i.categoria_id
       WHERE i.id = ? AND i.cliente_id = ? LIMIT 1`,
      [incidenciaId, clienteId]
    );

    if (incidencias.length === 0) {
      return res.status(404).json({ success: false, message: 'Incidencia no encontrada.' });
    }

    const [fotos] = await pool.query(
      `SELECT url_archivo FROM adjuntos_incidencia WHERE incidencia_id = ?`,
      [incidenciaId]
    );

    const incidenciaData = incidencias[0];
    incidenciaData.fotos = fotos.map(f => f.url_archivo);

    return res.json({ success: true, data: incidenciaData });
  } catch (error) {
    next(error);
  }
});

export default router;