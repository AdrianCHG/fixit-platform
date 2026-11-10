import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// CONFIGURACIÓN DE MULTER PARA ACTUALIZAR AVATAR
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
      cb(new Error('Solo se permiten imágenes (JPG, PNG, WEBP)'));
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
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB por documento
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = /pdf|jpeg|jpg|png|webp/;
    const esExtValida = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
    const esMimeValido = tiposPermitidos.test(file.mimetype) || file.mimetype === 'application/pdf';
    if (esExtValida && esMimeValido) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF o imágenes (JPG, PNG)'));
    }
  }
});

// Obtener técnicos y sus especialidades para el catálogo público
router.get('/', async (_req, res) => {
  try {
    const [tecnicos] = await pool.query(`
      SELECT
        u.id,
        u.nombre_completo AS nombre,
        u.telefono,
        p.biografia,
        p.anios_experiencia,
        p.estado_verificacion,
        p.avatar_url,
        p.tarifa_hora_min,
        p.tarifa_hora_max,
        p.calificacion_prom AS calificacion,
        p.nro_reseñas AS resenas,
        p.acepta_reservas
      FROM usuarios u
      INNER JOIN perfiles_tecnico p
        ON p.usuario_id = u.id
      WHERE u.rol = 'TECNICO'
        AND u.estado = 'ACTIVO'
      ORDER BY p.calificacion_prom DESC, p.nro_reseñas DESC
    `);

    if (tecnicos.length === 0) {
      return res.json({ success: true, data: [] });
    }

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
      especialidades: especialidadesPorTecnico[tecnico.id] || [],
      categorias: categoriasPorTecnico[tecnico.id] || [],
      equipos: equiposPorTecnico[tecnico.id] || [],
      modalidades: modalidadesPorTecnico[tecnico.id] || [],
      zonas_atencion: zonasPorTecnico[tecnico.id] || []
    }));

    return res.json({ success: true, data: resultado });
  } catch (error) {
    console.error('Error al obtener técnicos:', error);
    return res.status(500).json({ success: false, message: 'No se pudo cargar el catálogo de técnicos' });
  }
});


// RUTA PRIVADA: Obtener mi propio perfil de técnico (Para el Dashboard)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    
    if (req.user.rol !== 'TECNICO') {
      return res.status(403).json({ success: false, message: 'Acceso denegado. Área exclusiva para técnicos.' });
    }

    const [tecnicos] = await pool.query(`
      SELECT
        u.id, u.nombre_completo AS nombre, u.correo, u.telefono, u.tipo_documento, u.nro_documento, u.estado,
        p.biografia, p.anios_experiencia, p.estado_verificacion,
        p.avatar_url,
        p.tarifa_hora_min, p.tarifa_hora_max,
        p.calificacion_prom AS calificacion, p.nro_reseñas AS resenas, p.acepta_reservas
      FROM usuarios u
      INNER JOIN perfiles_tecnico p ON p.usuario_id = u.id
      WHERE u.id = ? AND u.rol = 'TECNICO'
    `, [userId]);

    if (tecnicos.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontró tu perfil de técnico' });
    }

    const tecnico = tecnicos[0];

    // Consultamos desde documentos_tecnico que ya existe en tu BD
    const [certificaciones] = await pool.query(`
      SELECT id, tipo, url_archivo AS archivo_url, estado, creado_en
      FROM documentos_tecnico
      WHERE tecnico_id = ?
    `, [userId]);

    const resultado = {
      ...tecnico,
      calificacion: Number(tecnico.calificacion),
      resenas: Number(tecnico.resenas),
      certificaciones: certificaciones
    };

    return res.json({ success: true, data: resultado });

  } catch (error) {
    console.error('Error al obtener perfil propio del técnico:', error);
    return res.status(500).json({ success: false, message: 'Error al cargar tu dashboard personal' });
  }
});


// RUTA PRIVADA: Actualizar mi propio perfil de técnico
router.put('/me', authenticateToken, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.sub;

    if (req.user.rol !== 'TECNICO') {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }

    const { nombre, telefono, biografia, anios_experiencia, tarifa_hora_min, tarifa_hora_max } = req.body;

    await pool.query(
      `UPDATE usuarios SET nombre_completo = ?, telefono = ? WHERE id = ?`,
      [nombre, telefono, userId]
    );

    let avatarQueryPart = '';
    let queryParams = [biografia, anios_experiencia, tarifa_hora_min, tarifa_hora_max];

    if (req.file) {
      const nuevaRutaAvatar = `/uploads/avatars/${req.file.filename}`;
      const [perfilActual] = await pool.query(`SELECT avatar_url FROM perfiles_tecnico WHERE usuario_id = ?`, [userId]);
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

    await pool.query(
      `UPDATE perfiles_tecnico 
       SET biografia = ?, anios_experiencia = ?, tarifa_hora_min = ?, tarifa_hora_max = ? ${avatarQueryPart}
       WHERE usuario_id = ?`,
      queryParams
    );

    return res.json({ success: true, message: 'Perfil actualizado correctamente en la base de datos.' });

  } catch (error) {
    console.error('Error al actualizar perfil del técnico:', error);
    return res.status(500).json({ success: false, message: 'Error interno al actualizar el perfil.' });
  }
});


// RUTA PRIVADA: Subir certificados o antecedentes a documentos_tecnico
router.post('/me/certificaciones', authenticateToken, uploadCert.single('archivo'), async (req, res) => {
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

    // 1. Validar límite total de 5 documentos
    const [docsActuales] = await pool.query(
      `SELECT id, tipo, url_archivo FROM documentos_tecnico WHERE tecnico_id = ?`,
      [userId]
    );

    if (docsActuales.length >= 5 && tipo !== 'ANTECEDENTES') {
      fs.unlinkSync(path.join(process.cwd(), archivoUrl));
      return res.status(400).json({ success: false, message: 'Has alcanzado el límite máximo de 5 documentos permitidos.' });
    }

    // 2. Regla de Antecedentes: Solo 1 documento vigente (reemplaza si ya existe)
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

    // 3. Insertar nuevo documento con UUID
    const docId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO documentos_tecnico (id, tecnico_id, tipo, url_archivo, estado) VALUES (?, ?, ?, ?, 'PENDIENTE')`,
      [docId, userId, tipo, archivoUrl]
    );

    return res.json({ success: true, message: 'Documento subido exitosamente y pendiente de revisión.' });

  } catch (error) {
    console.error('Error al subir certificado:', error);
    return res.status(500).json({ success: false, message: 'Error interno al procesar el archivo.' });
  }
});


router.get('/:id', async (req, res) => {
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
      return res.status(404).json({ success: false, message: 'Técnico no encontrado' });
    }

    const tecnico = tecnicos[0];

    const [especialidades] = await pool.query(`
      SELECT e.nombre FROM tecnico_especialidades te INNER JOIN especialidades e ON e.id = te.especialidad_id WHERE te.tecnico_id = ?
    `, [id]);

    const [certificaciones] = await pool.query(`
      SELECT id, tipo, url_archivo AS archivo_url, estado FROM documentos_tecnico WHERE tecnico_id = ?
    `, [id]);

    const [zonasAtencion] = await pool.query(`
      SELECT d.nombre AS distrito, d.ciudad FROM cobertura_tecnico ct INNER JOIN distritos d ON d.id = ct.distrito_id WHERE ct.tecnico_id = ? ORDER BY d.nombre
    `, [id]);

    const resultado = {
      ...tecnico,
      calificacion: Number(tecnico.calificacion),
      resenas: Number(tecnico.resenas),
      especialidades: especialidades.map(e => e.nombre),
      certificaciones: certificaciones,
      zonas_atencion: zonasAtencion
    };
    return res.json({ success: true, data: resultado });

  } catch (error) {
    console.error('Error al obtener perfil del técnico:', error);
    return res.status(500).json({ success: false, message: 'Error al cargar el perfil' });
  }
});

export default router;