import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { testConnection } from './db.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import incidenciasRoutes from './routes/incidencias.routes.js';
import tecnicosRoutes from './routes/tecnicos.routes.js';
import triajeRoutes from './routes/triaje.routes.js';
import citasRoutes from './routes/citas.routes.js';
import distritosRoutes from './routes/distritos.routes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middlewares de seguridad y configuración general
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Endpoint de verificación de estado (Health Check)
app.get('/health', async (_req, res) => {
  try {
    await testConnection();
    res.json({ ok: true, service: 'fixit-backend', database: 'connected' });
  } catch {
    res.status(503).json({ ok: false, service: 'fixit-backend', database: 'disconnected' });
  }
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/incidencias', incidenciasRoutes);
app.use('/api/triaje', triajeRoutes);
app.use('/api/tecnicos', tecnicosRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/distritos', distritosRoutes);

// Carpeta estática para servir archivos multimedia subidos (Avatares, certificados, fotos)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Middleware para rutas no encontradas (404)
app.use((_req, res) => {
  res.status(404).json({ ok: false, message: 'Ruta no encontrada.' });
});

// Middleware global de manejo de errores
app.use((error, _req, res, _next) => {
  console.error('❌ Error capturado en el servidor:', error);
  res.status(500).json({
    ok: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor.'
      : error.message
  });
});

// Inicialización de la base de datos y encendido del servidor
try {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 FixIT API ejecutándose en http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('❌ No se pudo conectar a MySQL:', error.message);
  process.exit(1);
}