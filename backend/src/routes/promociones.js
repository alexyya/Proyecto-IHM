const router = require('express').Router();
const { pool, query } = require('../db');
const { asyncHandler, HttpError, esVacio, hoyISO, textoCampos } = require('../utils');

const TIPOS = ['Descuento %', 'Monto fijo', 'Precio especial', '2×1', '3×2', 'Combo', 'Regalo por compra'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];
const CANALES = ['Tienda física', 'Web', 'App'];
const fechaValida = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f || '')) && !Number.isNaN(Date.parse(f));

// GET /api/promociones?q=&estado=
router.get('/', asyncHandler(async (req, res) => {
  const { q, estado } = req.query;
  const where = [];
  const params = [];
  if (!esVacio(q)) {
    where.push('(pr.nombre LIKE ? OR pr.codigo LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (!esVacio(estado)) { where.push('pr.estado = ?'); params.push(estado); }
  const filas = await query(`
    SELECT pr.*, GROUP_CONCAT(m.nombre ORDER BY m.nombre SEPARATOR ', ') AS marcas
    FROM promociones pr
    LEFT JOIN promocion_marcas pm ON pm.promocion_id = pr.id
    LEFT JOIN marcas m ON m.id = pm.marca_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    GROUP BY pr.id
    ORDER BY CASE pr.estado WHEN 'Activo' THEN 1 WHEN 'Programado' THEN 2 ELSE 3 END, pr.fecha_inicio DESC`, params);
  res.json(filas);
}));

// POST /api/promociones
router.post('/', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const errores = {};
  if (esVacio(b.nombre)) errores.nombre = 'Ingrese el nombre de la promoción. Ejemplo: Campaña escolar';
  else if (String(b.nombre).trim().length < 3) errores.nombre = 'El nombre debe tener al menos 3 caracteres.';
  if (!esVacio(b.codigo) && !/^[A-Z0-9]{4,20}$/.test(String(b.codigo).trim().toUpperCase())) {
    errores.codigo = 'Use de 4 a 20 letras o números, sin espacios. Ejemplo: ESCOLAR26';
  }
  if (!fechaValida(b.fecha_inicio)) errores.fecha_inicio = 'Seleccione la fecha de inicio. Ejemplo: 2026-11-15';
  if (!fechaValida(b.fecha_fin)) errores.fecha_fin = 'Seleccione la fecha de fin. Ejemplo: 2026-11-30';
  else if (!errores.fecha_inicio && b.fecha_fin < b.fecha_inicio) {
    errores.fecha_fin = 'La fecha de fin debe ser igual o posterior a la fecha de inicio.';
  }
  if (!PRIORIDADES.includes(b.prioridad)) errores.prioridad = 'Seleccione la prioridad: Alta, Media o Baja.';
  const canales = Array.isArray(b.canales) ? b.canales.filter((c) => CANALES.includes(c)) : [];
  if (!canales.length) errores.canales = 'Seleccione al menos un canal de venta. Ejemplo: Tienda física';
  const marcas = Array.isArray(b.marcas) ? b.marcas.map(Number).filter(Boolean) : [];
  if (!marcas.length) errores.marcas = 'Seleccione al menos una marca participante.';
  if (!TIPOS.includes(b.tipo)) errores.tipo = 'Seleccione el tipo de promoción. Ejemplo: Descuento %';
  const valorTxt = String(b.valor ?? '').trim();
  const requiereValor = ['Descuento %', 'Monto fijo', 'Precio especial', 'Combo'].includes(b.tipo);
  if (requiereValor) {
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(valorTxt) || Number(valorTxt) <= 0) {
      errores.valor = b.tipo === 'Descuento %'
        ? 'Ingrese el porcentaje de descuento. Ejemplo: 20'
        : 'Ingrese el monto en soles con punto decimal. Ejemplo: 10.00';
    } else if (b.tipo === 'Descuento %' && Number(valorTxt) > 90) {
      errores.valor = 'El descuento no puede superar el 90 %. Ejemplo: 20';
    }
  }
  if (Object.keys(errores).length) {
    throw new HttpError(400, `No se pudo publicar: revisa ${textoCampos(Object.keys(errores).length)}.`, errores);
  }

  let codigo = String(b.codigo || '').trim().toUpperCase();
  if (!codigo) {
    const base = String(b.nombre).normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8) || 'PROMO';
    codigo = `${base}${String(new Date().getFullYear()).slice(2)}`;
    let n = 1;
    // eslint-disable-next-line no-await-in-loop
    while ((await query('SELECT id FROM promociones WHERE codigo = ?', [codigo])).length) {
      codigo = `${base}${n}`;
      n += 1;
    }
  } else if ((await query('SELECT id FROM promociones WHERE codigo = ?', [codigo])).length) {
    throw new HttpError(400, 'No se pudo publicar: revisa 1 campo.', { codigo: `El código ${codigo} ya existe. Ejemplo: ${codigo}B` });
  }

  const estado = b.fecha_inicio > hoyISO() ? 'Programado' : 'Activo';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO promociones (codigo, nombre, tipo, valor, fecha_inicio, fecha_fin, estado, prioridad, canales)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo, String(b.nombre).trim(), b.tipo, requiereValor ? Number(valorTxt) : 0,
        b.fecha_inicio, b.fecha_fin, estado, b.prioridad, canales.join(',')]
    );
    for (const marcaId of marcas) {
      // eslint-disable-next-line no-await-in-loop
      await conn.query('INSERT INTO promocion_marcas (promocion_id, marca_id) VALUES (?, ?)', [r.insertId, marcaId]);
    }
    await conn.commit();
    res.status(201).json({ mensaje: `Promoción «${String(b.nombre).trim()}» publicada correctamente`, id: r.insertId, codigo, estado });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

// DELETE /api/promociones/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const filas = await query('SELECT nombre FROM promociones WHERE id = ?', [req.params.id]);
  if (!filas.length) throw new HttpError(404, 'La promoción no existe o ya fue eliminada.');
  await query('DELETE FROM promocion_marcas WHERE promocion_id = ?', [req.params.id]);
  await query('DELETE FROM promociones WHERE id = ?', [req.params.id]);
  res.json({ mensaje: `Promoción «${filas[0].nombre}» eliminada correctamente` });
}));

module.exports = router;
