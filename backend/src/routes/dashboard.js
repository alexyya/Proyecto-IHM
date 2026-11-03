const router = require('express').Router();
const { query } = require('../db');
const { asyncHandler, hoyISO } = require('../utils');

// GET /api/dashboard
router.get('/', asyncHandler(async (req, res) => {
  // por_vencer: promociones activas que terminan hoy o en los próximos 3 días
  const [[totales], [promos], [bajo]] = await Promise.all([
    query("SELECT COUNT(*) AS total_productos, SUM(estado = 'Activo') AS activos, COALESCE(SUM(stock),0) AS unidades FROM productos"),
    query("SELECT COUNT(*) AS activas, SUM(fecha_fin BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)) AS por_vencer FROM promociones WHERE estado = 'Activo'"),
    query("SELECT COUNT(*) AS stock_bajo FROM productos WHERE estado = 'Activo' AND stock <= stock_minimo"),
  ]);

  const actividad = await query(`
    SELECT m.id, m.tipo, m.cantidad, m.motivo, m.fecha,
           p.codigo, p.nombre AS producto, u.nombre AS usuario
    FROM movimientos m
    JOIN productos p ON p.id = m.producto_id
    JOIN usuarios u ON u.id = m.usuario_id
    ORDER BY m.fecha DESC, m.id DESC
    LIMIT 4`);

  // Ingresos (entradas) por día de los últimos 5 días, incluido hoy
  const filas = await query(`
    SELECT DATE(fecha) AS dia, SUM(cantidad) AS total
    FROM movimientos
    WHERE tipo = 'Entrada' AND fecha >= DATE_SUB(CURDATE(), INTERVAL 4 DAY)
    GROUP BY DATE(fecha)`);
  const mapa = {};
  filas.forEach((f) => { mapa[String(f.dia).slice(0, 10)] = Number(f.total); });
  const ingresos = [];
  for (let i = 4; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dia = hoyISO(d);
    ingresos.push({ dia, total: mapa[dia] || 0 });
  }

  const stockBajo = await query(`
    SELECT id, codigo, nombre, stock, stock_minimo FROM productos
    WHERE estado = 'Activo' AND stock <= stock_minimo ORDER BY stock ASC`);

  res.json({
    totales: {
      productos: Number(totales.total_productos),
      activos: Number(totales.activos || 0),
      unidades: Number(totales.unidades),
      promocionesActivas: Number(promos.activas),
      promocionesPorVencer: Number(promos.por_vencer || 0),
      stockBajo: Number(bajo.stock_bajo),
    },
    productosStockBajo: stockBajo,
    actividad,
    ingresos,
  });
}));

module.exports = router;
