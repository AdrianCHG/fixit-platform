import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool } from '../db.js';

const router = Router();

// CONFIGURACIÓN DE MULTER (Con validación de peso y tipo)
const storage = multer.diskStorage({
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

// Filtro para aceptar solo imágenes reales
const fileFilter = (req, file, cb) => {
  const tiposPermitidos = /jpeg|jpg|png|webp/;
  const esExtValida = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
  const esMimeValido = tiposPermitidos.test(file.mimetype);

  if (esExtValida && esMimeValido) {
    return cb(null, true);
  } else {
    cb(new Error('Formato de imagen no válido. Solo se permiten archivos JPG, PNG o WEBP.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 🚩 Límite estricto de 2 Megabytes (2MB)
  },
  fileFilter: fileFilter
});

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================
function publicUser(user) {
  return {
    id: user.id,
    correo: user.correo,
    nombre_completo: user.nombre_completo,
    telefono: user.telefono,
    tipo_documento: user.tipo_documento,
    nro_documento: user.nro_documento,
    rol: user.rol,
    estado: user.estado,
    correo_verificado_en: user.correo_verificado_en,
    creado_en: user.creado_en,
    actualizado_en: user.actualizado_en
  };
}

function createToken(user) {
  return jwt.sign(
    { sub: user.id, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

// ==========================================
// RUTAS
// ==========================================

// Registro de usuario (Cliente)
router.post('/register', async (req, res, next) => {
  try {
    const {
      correo,
      contrasena,
      nombre_completo,
      telefono = null,
      tipo_documento = null,
      nro_documento = null
    } = req.body;

    if (!correo || !contrasena || !nombre_completo) {
      return res.status(400).json({
        ok: false,
        message: 'correo, contrasena y nombre_completo son obligatorios.'
      });
    }

    if (contrasena.length < 8) {
      return res.status(400).json({
        ok: false,
        message: 'La contraseña debe tener al menos 8 caracteres.'
      });
    }

    const normalizedEmail = String(correo).trim().toLowerCase();
    const [existing] = await pool.execute(
      'SELECT id FROM usuarios WHERE correo = ? LIMIT 1',
      [normalizedEmail]
    );

    if (existing.length) {
      return res.status(409).json({
        ok: false,
        message: 'El correo ya está registrado.'
      });
    }

    const id = randomUUID();
    const hash = await bcrypt.hash(contrasena, 12);

    await pool.execute(
      `INSERT INTO usuarios
       (id, correo, hash_contrasena, nombre_completo, telefono,
        tipo_documento, nro_documento, rol, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CLIENTE', 'ACTIVO')`,
      [id, normalizedEmail, hash, nombre_completo.trim(), telefono, tipo_documento, nro_documento]
    );

    const [rows] = await pool.execute(
      `SELECT id, correo, nombre_completo, telefono, tipo_documento,
              nro_documento, rol, estado, correo_verificado_en,
              creado_en, actualizado_en
       FROM usuarios WHERE id = ?`,
      [id]
    );

    const user = rows[0];
    const token = createToken(user);

    return res.status(201).json({
      ok: true,
      message: 'Usuario registrado correctamente.',
      data: { user: publicUser(user), token }
    });
  } catch (error) {
    next(error);
  }
});

// Neva Ruta: Registro de Técnico (Usa multer para capturar 'avatar')
router.post('/registro-tecnico', upload.single('avatar'), async (req, res, next) => {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const {
      correo,
      contrasena,
      nombre_completo,
      telefono,
      tipo_documento,
      nro_documento,
      anios_experiencia,
      tarifa_hora_min,
      tarifa_hora_max,
      biografia
    } = req.body;

    // 1. Validaciones básicas
    if (!correo || !contrasena || !nombre_completo || !req.file) {
      await conexion.rollback();
      return res.status(400).json({
        ok: false,
        message: 'Faltan datos obligatorios o la foto de perfil.'
      });
    }

    const normalizedEmail = String(correo).trim().toLowerCase();
    const [existing] = await conexion.execute(
      'SELECT id FROM usuarios WHERE correo = ? LIMIT 1',
      [normalizedEmail]
    );

    if (existing.length) {
      await conexion.rollback();
      return res.status(409).json({
        ok: false,
        message: 'El correo ya está registrado.'
      });
    }

    const id = randomUUID();
    const hash = await bcrypt.hash(contrasena, 12);
    
    // Generar la ruta relativa de la imagen para guardarla en BD (CORRECCIÓN APLICADA AQUÍ)
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // 2. Insertar en tabla `usuarios` (Rol: TECNICO)
    await conexion.execute(
      `INSERT INTO usuarios
       (id, correo, hash_contrasena, nombre_completo, telefono,
        tipo_documento, nro_documento, rol, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'TECNICO', 'ACTIVO')`,
      [id, normalizedEmail, hash, nombre_completo.trim(), telefono, tipo_documento, nro_documento]
    );

    // 3. Insertar en tabla `perfiles_tecnico` (Estado Verificación: PENDIENTE)
    await conexion.execute(
      `INSERT INTO perfiles_tecnico
       (usuario_id, biografia, anios_experiencia, estado_verificacion, 
        tarifa_hora_min, tarifa_hora_max, calificacion_prom, nro_reseñas, acepta_reservas, avatar_url)
       VALUES (?, ?, ?, 'PENDIENTE', ?, ?, 0, 0, 0, ?)`,
      [
        id, 
        biografia, 
        parseInt(anios_experiencia) || 0, 
        parseFloat(tarifa_hora_min) || 0, 
        parseFloat(tarifa_hora_max) || 0,
        avatarUrl
      ]
    );

    await conexion.commit();

    return res.status(201).json({
      ok: true,
      message: 'Postulación enviada correctamente. Pendiente de aprobación.'
    });
  } catch (error) {
    await conexion.rollback();
    next(error);
  } finally {
    conexion.release();
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({
        ok: false,
        message: 'correo y contrasena son obligatorios.'
      });
    }

    const normalizedEmail = String(correo).trim().toLowerCase();
    const [rows] = await pool.execute(
      `SELECT id, correo, hash_contrasena, nombre_completo, telefono,
              tipo_documento, nro_documento, rol, estado,
              correo_verificado_en, creado_en, actualizado_en
       FROM usuarios WHERE correo = ? LIMIT 1`,
      [normalizedEmail]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({
        ok: false,
        message: 'Correo o contraseña incorrectos.'
      });
    }

    if (String(user.estado).toUpperCase() !== 'ACTIVO') {
      return res.status(403).json({
        ok: false,
        message: 'La cuenta no está activa.'
      });
    }

    const validPassword = await bcrypt.compare(contrasena, user.hash_contrasena);
    if (!validPassword) {
      return res.status(401).json({
        ok: false,
        message: 'Correo o contraseña incorrectos.'
      });
    }

    const token = createToken(user);
    return res.json({
      ok: true,
      message: 'Inicio de sesión correcto.',
      data: { user: publicUser(user), token }
    });
  } catch (error) {
    next(error);
  }
});

export default router;