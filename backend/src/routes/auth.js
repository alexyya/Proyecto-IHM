const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { asyncHandler, esVacio } = require('../utils');
const { firmarToken, requireAuth } = require('../middleware/auth');

const SQL_USUARIO = `
  SELECT u.id, u.nombre, u.correo, u.password_hash, r.nombre AS rol
  FROM usuarios u JOIN roles r ON r.id = u.rol_id`;

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { correo, password } = req.body || {};
  const errores = {};
  if (esVacio(correo)) errores.correo = 'Ingrese su correo corporativo. Ejemplo: usuario@spsa.com.pe';
  if (esVacio(password)) errores.password = 'Ingrese su contraseña.';
  if (Object.keys(errores).length) {
    return res.status(400).json({ mensaje: 'Complete los campos obligatorios.', errores });
  }

  const filas = await query(`${SQL_USUARIO} WHERE u.correo = ?`, [String(correo).trim().toLowerCase()]);
  const usuario = filas[0];
  const ok = usuario && (await bcrypt.compare(String(password), usuario.password_hash));
  if (!ok) {
    return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos. Verifique sus datos e inténtelo nuevamente.' });
  }
  delete usuario.password_hash;
  return res.json({ token: firmarToken(usuario), usuario });
}));

// GET /api/auth/me
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const filas = await query(`${SQL_USUARIO} WHERE u.id = ?`, [req.usuario.id]);
  if (!filas[0]) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
  delete filas[0].password_hash;
  return res.json({ usuario: filas[0] });
}));

module.exports = router;
