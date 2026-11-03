// Punto de entrada de la API · Sistema de Gestión Comercial (Plaza Vea - caso académico)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { query } = require('./db');
const { requireAuth } = require('./middleware/auth');

const app = express();
app.use(cors());
// 4 MB: admite la imagen del producto (máx. 2 MB, ~2.7 MB en base64) y el resto del formulario
app.use(express.json({ limit: '4mb' }));

// Rutas públicas
app.get('/api/salud', (req, res) => res.json({ ok: true, servicio: 'plazavea-ihm-api' }));
app.use('/api/auth', require('./routes/auth'));

// Rutas protegidas
app.use('/api/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/api/catalogos', requireAuth, require('./routes/catalogos'));
app.use('/api/productos', requireAuth, require('./routes/productos'));
app.use('/api/inventario', requireAuth, require('./routes/inventario'));
app.use('/api/promociones', requireAuth, require('./routes/promociones'));
app.use('/api/preferencias', requireAuth, require('./routes/preferencias'));
app.use('/api/borradores', requireAuth, require('./routes/borradores'));
app.use('/api/reportes', requireAuth, require('./routes/reportes'));

// 404 de la API
app.use('/api', (req, res) => res.status(404).json({ mensaje: 'Recurso no encontrado.' }));

// Manejador de errores centralizado
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ mensaje: 'Los datos enviados son demasiado grandes. La imagen debe pesar como máximo 2 MB.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es un JSON válido.' });
  }
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ mensaje: err.message, errores: err.errores });
  }
  console.error('[ERROR]', err);
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ mensaje: 'Ya existe un registro con ese nombre o código.' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return res.status(409).json({ mensaje: 'No se puede eliminar porque otros registros lo usan.' });
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
    return res.status(503).json({ mensaje: 'No se pudo conectar con la base de datos. Revise backend/.env.' });
  }
  return res.status(500).json({ mensaje: 'Ocurrió un error inesperado en el servidor.' });
});

/**
 * Si la tabla de usuarios está vacía (por ejemplo, se ejecutó solo schema.sql),
 * crea los roles y usuarios de prueba con contraseñas cifradas por bcryptjs.
 */
async function asegurarUsuariosDePrueba() {
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM usuarios');
  if (Number(total) > 0) return;
  const roles = ['Administrador', 'Coordinador Comercial', 'Encargado de Inventario'];
  for (const nombre of roles) {
    await query('INSERT IGNORE INTO roles (nombre) VALUES (?)', [nombre]);
  }
  const usuarios = [
    ['Diana Rojas', 'admin@spsa.com.pe', 'Admin123', 'Administrador'],
    ['Carlos Mendoza', 'coordinador@spsa.com.pe', 'Coord123', 'Coordinador Comercial'],
    ['Lucía Quispe', 'inventario@spsa.com.pe', 'Inv123', 'Encargado de Inventario'],
  ];
  for (const [nombre, correo, clave, rol] of usuarios) {
    const hash = await bcrypt.hash(clave, 10);
    const [r] = await query('SELECT id FROM roles WHERE nombre = ?', [rol]);
    const res = await query('INSERT INTO usuarios (nombre, correo, password_hash, rol_id) VALUES (?, ?, ?, ?)', [
      nombre, correo, hash, r.id,
    ]);
    await query('INSERT INTO preferencias_accesibilidad (usuario_id) VALUES (?)', [res.insertId]);
  }
  console.log('Usuarios de prueba creados automáticamente.');
}

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, async () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
  try {
    await query('SELECT 1');
    console.log(`Conectado a MySQL (${process.env.DB_NAME || 'plazavea_ihm'}).`);
    await asegurarUsuariosDePrueba();
  } catch (e) {
    console.error('No se pudo conectar a MySQL:', e.message);
    console.error('Verifique que MySQL esté iniciado y que backend/.env tenga el usuario y la contraseña correctos.');
  }
});
