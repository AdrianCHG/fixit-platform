import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/distritos - Listar todos los distritos ordenados alfabéticamente
router.get('/', async (_req, res, next) => {
    try {
        const [distritos] = await pool.query(
            'SELECT id, nombre, ciudad, ubigeo FROM distritos ORDER BY nombre ASC'
        );
        return res.json({
            success: true,
            data: distritos
        });
    } catch (error) {
        next(error); // Delegamos al manejador global de errores del servidor
    }
});

export default router;