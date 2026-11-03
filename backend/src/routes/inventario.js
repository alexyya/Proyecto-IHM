const router = require('express').Router();
const { pool, query } = require('../db');
const { asyncHandler, HttpError, esVacio, textoCampos } = require('../utils');

// GET /api/inventario/movimientos
router.get('/movimientos', asyncHandler(async (req, res) => {
  const filas = await query(`
    SELECT m.id, m.tipo, m.cantidad, m.motivo, m.fecha,
           p.id AS producto_id, p.codigo, p.nombre AS producto, u.nombre AS usuario
    FROM movimientos m
    JOIN productos p ON p.id = m.producto_id
    JOIN usuarios u ON u.id = m.usuario_id
    ORDER BY m.fecha DESC, m.id DESC
    LIMIT 200`);
  res.json(filas);
}));

// POST /api/inventario/ingresos  { producto_id, cantidad, motivo }
router.post('/ingresos', asyncHandler(async (req, res) => {
  const { producto_id, cantidad, motivo } = req.body || {};
  const errores = {};
  if (esVacio(producto_id)) errores.producto_id = 'Seleccione el producto que ingresa al almacén. Ejemplo: SKU-10045 Leche Evaporada Entera';
  const cantTxt = String(cantidad ?? '').trim();
  if (cantTxt === '') errores.cantidad = 'Ingrese la cantidad recibida en unidades. Ejemplo: 50';
  else if (!/^\d{1,6}$/.test(cantTxt) || Number(cantTxt) <= 0) errores.cantidad = 'La cantidad debe ser un número entero mayor que 0. Ejemplo: 50';
  if (esVacio(motivo)) errores.motivo = 'Indique el motivo del ingreso. Ejemplo: Reposición de proveedor';
  else if (String(motivo).length > 150) errores.motivo = 'El motivo no debe superar los 150 caracteres.';

  if (!errores.producto_id) {
    const p = await query('SELECT id FROM productos WHERE id = ?', [producto_id]);
    if (!p.length) errores.producto_id = 'El producto seleccionado no existe.';
  }
  if (Object.keys(errores).length) {
    throw new HttpError(400, `No se pudo registrar: revisa ${textoCampos(Object.keys(errores).length)}.`, errores);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "INSERT INTO movimientos (producto_id, usuario_id, tipo, cantidad, motivo, fecha) VALUES (?, ?, 'Entrada', ?, ?, NOW())",
      [producto_id, req.usuario.id, Number(cantTxt), String(motivo).trim()]
    );
    await conn.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [Number(cantTxt), producto_id]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  const [producto] = await query('SELECT id, codigo, nombre, stock FROM productos WHERE id = ?', [producto_id]);
  res.status(201).json({ mensaje: `Ingreso registrado. Nuevo stock de ${producto.nombre}: ${producto.stock} und`, producto });
}));

module.exports = router;
