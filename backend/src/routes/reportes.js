const router = require('express').Router();
const { query } = require('../db');
const { asyncHandler, HttpError, esVacio, hoyISO } = require('../utils');

const esFecha = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f || '')) && !Number.isNaN(Date.parse(f));

/** Valida el rango de fechas (opcional). Devuelve { desde, hasta } o lanza 400 con mensajes claros. */
function rango(q, { porDefectoDias } = {}) {
  let { desde, hasta } = q;
  const errores = {};
  if (!esVacio(desde) && !esFecha(desde)) errores.desde = 'Ingrese la fecha «Desde» con el formato día/mes/año. Ejemplo: 01/11/2026';
  if (!esVacio(hasta) && !esFecha(hasta)) errores.hasta = 'Ingrese la fecha «Hasta» con el formato día/mes/año. Ejemplo: 30/11/2026';
  if (!Object.keys(errores).length && !esVacio(desde) && !esVacio(hasta) && desde > hasta) {
    errores.hasta = 'La fecha «Hasta» debe ser igual o posterior a la fecha «Desde».';
  }
  if (Object.keys(errores).length) throw new HttpError(400, 'Revise las fechas del filtro.', errores);
  if (porDefectoDias) {
    if (esVacio(hasta)) hasta = hoyISO();
    if (esVacio(desde)) {
      const d = new Date(`${hasta}T00:00:00`);
      d.setDate(d.getDate() - (porDefectoDias - 1));
      desde = hoyISO(d);
    }
  }
  return { desde: esVacio(desde) ? null : desde, hasta: esVacio(hasta) ? null : hasta };
}

/** Filtros comunes por categoría y marca sobre la tabla de productos (alias p, s). */
function filtrosProducto(q, where, params) {
  if (!esVacio(q.categoria)) { where.push('s.categoria_id = ?'); params.push(q.categoria); }
  if (!esVacio(q.marca)) { where.push('p.marca_id = ?'); params.push(q.marca); }
}

// GET /api/reportes/productos?categoria=&marca=&desde=&hasta=   (fechas = fecha de registro)
router.get('/productos', asyncHandler(async (req, res) => {
  const { desde, hasta } = rango(req.query);
  const where = [];
  const params = [];
  filtrosProducto(req.query, where, params);
  if (desde) { where.push('p.fecha_registro >= ?'); params.push(desde); }
  if (hasta) { where.push('p.fecha_registro <= ?'); params.push(hasta); }
  const W = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const productos = await query(`
    SELECT p.id, p.codigo, p.nombre, p.precio, p.stock, p.stock_minimo, p.estado, p.fecha_registro,
           m.nombre AS marca, c.id AS categoria_id, c.nombre AS categoria, s.nombre AS subcategoria
    FROM productos p
    JOIN marcas m ON m.id = p.marca_id
    JOIN subcategorias s ON s.id = p.subcategoria_id
    JOIN categorias c ON c.id = s.categoria_id
    ${W}
    ORDER BY c.nombre, p.nombre`, params);

  const mapa = new Map();
  productos.forEach((p) => {
    const g = mapa.get(p.categoria) || { categoria: p.categoria, productos: 0, activos: 0, unidades: 0, valor: 0 };
    g.productos += 1;
    if (p.estado === 'Activo') g.activos += 1;
    g.unidades += Number(p.stock);
    g.valor += Number(p.precio) * Number(p.stock);
    mapa.set(p.categoria, g);
  });
  const porCategoria = [...mapa.values()].map((g) => ({ ...g, valor: Math.round(g.valor * 100) / 100 }));

  res.json({
    filtros: { desde, hasta },
    kpis: {
      productos: productos.length,
      activos: productos.filter((p) => p.estado === 'Activo').length,
      categorias: porCategoria.length,
      valor: Math.round(porCategoria.reduce((s, g) => s + g.valor, 0) * 100) / 100,
    },
    porCategoria,
    productos,
  });
}));

// GET /api/reportes/inventario?categoria=&marca=&desde=&hasta=  (por defecto, últimos 7 días)
router.get('/inventario', asyncHandler(async (req, res) => {
  const { desde, hasta } = rango(req.query, { porDefectoDias: 7 });
  const dias = Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000) + 1;
  if (dias > 31) {
    throw new HttpError(400, 'Revise las fechas del filtro.', { hasta: 'Elija un periodo de 31 días como máximo. Ejemplo: del 01/11/2026 al 30/11/2026' });
  }

  const whereP = [];
  const paramsP = [];
  filtrosProducto(req.query, whereP, paramsP);

  const movs = await query(`
    SELECT DATE(mv.fecha) AS dia, mv.tipo, SUM(mv.cantidad) AS total
    FROM movimientos mv
    JOIN productos p ON p.id = mv.producto_id
    JOIN subcategorias s ON s.id = p.subcategoria_id
    WHERE DATE(mv.fecha) BETWEEN ? AND ? ${whereP.length ? `AND ${whereP.join(' AND ')}` : ''}
    GROUP BY DATE(mv.fecha), mv.tipo`, [desde, hasta, ...paramsP]);
  const mapa = {};
  movs.forEach((m) => {
    const k = String(m.dia).slice(0, 10);
    mapa[k] = mapa[k] || { entradas: 0, salidas: 0 };
    mapa[k][m.tipo === 'Entrada' ? 'entradas' : 'salidas'] += Number(m.total);
  });
  const porDia = [];
  for (let i = 0; i < dias; i += 1) {
    const d = new Date(`${desde}T00:00:00`);
    d.setDate(d.getDate() + i);
    const k = hoyISO(d);
    porDia.push({ dia: k, entradas: mapa[k]?.entradas || 0, salidas: mapa[k]?.salidas || 0 });
  }

  const W = whereP.length ? `AND ${whereP.join(' AND ')}` : '';
  const stockBajo = await query(`
    SELECT p.id, p.codigo, p.nombre, p.stock, p.stock_minimo, m.nombre AS marca, c.nombre AS categoria
    FROM productos p
    JOIN marcas m ON m.id = p.marca_id
    JOIN subcategorias s ON s.id = p.subcategoria_id
    JOIN categorias c ON c.id = s.categoria_id
    WHERE p.estado = 'Activo' AND p.stock <= p.stock_minimo ${W}
    ORDER BY p.stock ASC`, paramsP);
  const [tot] = await query(`
    SELECT COALESCE(SUM(p.stock), 0) AS unidades, COUNT(*) AS productos
    FROM productos p JOIN subcategorias s ON s.id = p.subcategoria_id
    WHERE p.estado = 'Activo' ${W}`, paramsP);

  res.json({
    filtros: { desde, hasta },
    kpis: {
      unidades: Number(tot.unidades),
      productos: Number(tot.productos),
      stockBajo: stockBajo.length,
      entradas: porDia.reduce((s, d) => s + d.entradas, 0),
      salidas: porDia.reduce((s, d) => s + d.salidas, 0),
    },
    porDia,
    stockBajo,
  });
}));

// GET /api/reportes/promociones?estado=&marca=&desde=&hasta=  (promociones vigentes en el periodo)
router.get('/promociones', asyncHandler(async (req, res) => {
  const { desde, hasta } = rango(req.query);
  const where = [];
  const params = [];
  if (!esVacio(req.query.estado)) { where.push('pr.estado = ?'); params.push(req.query.estado); }
  if (!esVacio(req.query.marca)) {
    where.push('pr.id IN (SELECT promocion_id FROM promocion_marcas WHERE marca_id = ?)');
    params.push(req.query.marca);
  }
  if (desde) { where.push('pr.fecha_fin >= ?'); params.push(desde); }
  if (hasta) { where.push('pr.fecha_inicio <= ?'); params.push(hasta); }
  const promociones = await query(`
    SELECT pr.id, pr.codigo, pr.nombre, pr.tipo, pr.valor, pr.fecha_inicio, pr.fecha_fin, pr.estado, pr.prioridad,
           GROUP_CONCAT(m.nombre ORDER BY m.nombre SEPARATOR ', ') AS marcas
    FROM promociones pr
    LEFT JOIN promocion_marcas pm ON pm.promocion_id = pr.id
    LEFT JOIN marcas m ON m.id = pm.marca_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    GROUP BY pr.id
    ORDER BY CASE pr.estado WHEN 'Activo' THEN 1 WHEN 'Programado' THEN 2 ELSE 3 END, pr.fecha_fin ASC`, params);

  const hoy = hoyISO();
  const en7 = new Date(); en7.setDate(en7.getDate() + 7);
  const limite = hoyISO(en7);
  const porEstado = ['Activo', 'Programado', 'Inactivo'].map((estado) => ({
    estado, total: promociones.filter((p) => p.estado === estado).length,
  }));
  res.json({
    filtros: { desde, hasta },
    kpis: {
      total: promociones.length,
      activas: porEstado[0].total,
      porVencer: promociones.filter((p) => p.estado === 'Activo' && p.fecha_fin >= hoy && p.fecha_fin <= limite).length,
      programadas: porEstado[1].total,
    },
    porEstado,
    promociones,
    hoy,
  });
}));

// ---------------- Historial de reportes generados ----------------
const TIPOS = ['productos', 'inventario', 'promociones'];

// GET /api/reportes/historial  → últimos 10 reportes generados
router.get('/historial', asyncHandler(async (req, res) => {
  const filas = await query(`
    SELECT r.id, r.tipo, r.fecha_desde, r.fecha_hasta, r.filtros, r.registros, r.generado_en, u.nombre AS usuario
    FROM reportes r JOIN usuarios u ON u.id = r.usuario_id
    ORDER BY r.generado_en DESC, r.id DESC LIMIT 10`);
  res.json(filas);
}));

// POST /api/reportes/historial  { tipo, desde, hasta, filtros, registros }
router.post('/historial', asyncHandler(async (req, res) => {
  const { tipo, filtros, registros } = req.body || {};
  if (!TIPOS.includes(tipo)) throw new HttpError(400, 'Tipo de reporte no válido. Use productos, inventario o promociones.');
  const { desde, hasta } = rango(req.body || {});
  const r = await query(
    'INSERT INTO reportes (usuario_id, tipo, fecha_desde, fecha_hasta, filtros, registros) VALUES (?, ?, ?, ?, ?, ?)',
    [req.usuario.id, tipo, desde, hasta, String(filtros || 'Sin filtros').slice(0, 255), Number(registros) || 0]
  );
  res.status(201).json({ id: r.insertId, mensaje: 'Reporte registrado en el historial.' });
}));

module.exports = router;
