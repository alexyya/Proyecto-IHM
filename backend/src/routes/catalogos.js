const router = require('express').Router();
const { query } = require('../db');
const { asyncHandler, HttpError, esVacio } = require('../utils');

/** Valida un nombre de catálogo (2 a 80 caracteres) y devuelve el texto limpio. */
function validarNombre(valor, ejemplo, campo = 'nombre') {
  const nombre = String(valor ?? '').trim().replace(/\s+/g, ' ');
  if (!nombre) throw new HttpError(400, 'No se pudo guardar: revisa 1 campo.', { [campo]: `Ingrese el nombre. Ejemplo: ${ejemplo}` });
  if (nombre.length < 2) throw new HttpError(400, 'No se pudo guardar: revisa 1 campo.', { [campo]: `El nombre debe tener al menos 2 caracteres. Ejemplo: ${ejemplo}` });
  if (nombre.length > 80) throw new HttpError(400, 'No se pudo guardar: revisa 1 campo.', { [campo]: 'El nombre no debe superar los 80 caracteres.' });
  return nombre;
}

const duplicado = (texto) => new HttpError(409, texto, { nombre: texto });

// GET /api/catalogos  → categorías, subcategorías, marcas y modelos (con conteos de uso)
router.get('/', asyncHandler(async (req, res) => {
  const [categorias, subcategorias, marcas, modelos] = await Promise.all([
    query(`SELECT c.id, c.nombre,
             (SELECT COUNT(*) FROM subcategorias s WHERE s.categoria_id = c.id) AS subcategorias,
             (SELECT COUNT(*) FROM productos p JOIN subcategorias s ON s.id = p.subcategoria_id WHERE s.categoria_id = c.id) AS productos
           FROM categorias c ORDER BY c.nombre`),
    query(`SELECT s.id, s.categoria_id, s.nombre,
             (SELECT COUNT(*) FROM productos p WHERE p.subcategoria_id = s.id) AS productos
           FROM subcategorias s ORDER BY s.nombre`),
    query(`SELECT m.id, m.nombre,
             (SELECT COUNT(*) FROM productos p WHERE p.marca_id = m.id) AS productos,
             (SELECT COUNT(*) FROM modelos o WHERE o.marca_id = m.id) AS modelos
           FROM marcas m ORDER BY m.nombre`),
    query(`SELECT o.id, o.marca_id, o.nombre, m.nombre AS marca,
             (SELECT COUNT(*) FROM productos p WHERE p.modelo_id = o.id) AS productos
           FROM modelos o JOIN marcas m ON m.id = o.marca_id ORDER BY m.nombre, o.nombre`),
  ]);
  const num = (filas, campos) => filas.map((f) => { const r = { ...f }; campos.forEach((c) => { r[c] = Number(f[c] || 0); }); return r; });
  res.json({
    categorias: num(categorias, ['subcategorias', 'productos']),
    subcategorias: num(subcategorias, ['productos']),
    marcas: num(marcas, ['productos', 'modelos']),
    modelos: num(modelos, ['productos']),
  });
}));

// ---------- Marcas ----------
router.post('/marcas', asyncHandler(async (req, res) => {
  const nombre = validarNombre(req.body?.nombre, 'Gloria');
  if ((await query('SELECT id FROM marcas WHERE nombre = ?', [nombre])).length) {
    throw duplicado(`La marca «${nombre}» ya está registrada. Use otro nombre.`);
  }
  const r = await query('INSERT INTO marcas (nombre) VALUES (?)', [nombre]);
  res.status(201).json({ mensaje: `Marca «${nombre}» agregada correctamente`, id: r.insertId });
}));

router.delete('/marcas/:id', asyncHandler(async (req, res) => {
  const [m] = await query('SELECT nombre FROM marcas WHERE id = ?', [req.params.id]);
  if (!m) throw new HttpError(404, 'La marca no existe o ya fue eliminada.');
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM productos WHERE marca_id = ?', [req.params.id]);
  if (Number(n) > 0) {
    throw new HttpError(409, `No se puede eliminar la marca «${m.nombre}» porque tiene ${n} ${Number(n) === 1 ? 'producto' : 'productos'}. Primero cambie la marca de esos productos o elimínelos.`);
  }
  const [{ p }] = await query('SELECT COUNT(*) AS p FROM promocion_marcas WHERE marca_id = ?', [req.params.id]);
  if (Number(p) > 0) {
    throw new HttpError(409, `No se puede eliminar la marca «${m.nombre}» porque participa en ${p} ${Number(p) === 1 ? 'promoción' : 'promociones'}.`);
  }
  await query('DELETE FROM modelos WHERE marca_id = ?', [req.params.id]);
  await query('DELETE FROM marcas WHERE id = ?', [req.params.id]);
  res.json({ mensaje: `Marca «${m.nombre}» eliminada correctamente` });
}));

// ---------- Modelos ----------
router.post('/modelos', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const errores = {};
  if (esVacio(b.marca_id)) errores.marca_id = 'Seleccione la marca del modelo. Ejemplo: Gloria';
  let nombre = '';
  try { nombre = validarNombre(b.nombre, 'Lata 400 g'); } catch (e) { errores.nombre = e.errores.nombre; }
  if (!errores.marca_id && !(await query('SELECT id FROM marcas WHERE id = ?', [b.marca_id])).length) {
    errores.marca_id = 'La marca seleccionada no existe. Elija una de la lista.';
  }
  if (Object.keys(errores).length) {
    throw new HttpError(400, `No se pudo guardar: revisa ${Object.keys(errores).length === 1 ? '1 campo' : `${Object.keys(errores).length} campos`}.`, errores);
  }
  if ((await query('SELECT id FROM modelos WHERE marca_id = ? AND nombre = ?', [b.marca_id, nombre])).length) {
    throw duplicado(`El modelo «${nombre}» ya existe para esa marca.`);
  }
  const r = await query('INSERT INTO modelos (marca_id, nombre) VALUES (?, ?)', [b.marca_id, nombre]);
  res.status(201).json({ mensaje: `Modelo «${nombre}» agregado correctamente`, id: r.insertId });
}));

router.delete('/modelos/:id', asyncHandler(async (req, res) => {
  const [m] = await query('SELECT nombre FROM modelos WHERE id = ?', [req.params.id]);
  if (!m) throw new HttpError(404, 'El modelo no existe o ya fue eliminado.');
  // Los productos que lo usaban quedan sin modelo (el campo es opcional)
  await query('UPDATE productos SET modelo_id = NULL WHERE modelo_id = ?', [req.params.id]);
  await query('DELETE FROM modelos WHERE id = ?', [req.params.id]);
  res.json({ mensaje: `Modelo «${m.nombre}» eliminado correctamente` });
}));

// ---------- Categorías ----------
router.post('/categorias', asyncHandler(async (req, res) => {
  const nombre = validarNombre(req.body?.nombre, 'Panadería');
  if ((await query('SELECT id FROM categorias WHERE nombre = ?', [nombre])).length) {
    throw duplicado(`La categoría «${nombre}» ya está registrada. Use otro nombre.`);
  }
  const r = await query('INSERT INTO categorias (nombre) VALUES (?)', [nombre]);
  res.status(201).json({ mensaje: `Categoría «${nombre}» agregada correctamente`, id: r.insertId });
}));

router.delete('/categorias/:id', asyncHandler(async (req, res) => {
  const [c] = await query('SELECT nombre FROM categorias WHERE id = ?', [req.params.id]);
  if (!c) throw new HttpError(404, 'La categoría no existe o ya fue eliminada.');
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM subcategorias WHERE categoria_id = ?', [req.params.id]);
  if (Number(n) > 0) {
    throw new HttpError(409, `No se puede eliminar la categoría «${c.nombre}» porque tiene ${n} ${Number(n) === 1 ? 'subcategoría' : 'subcategorías'}. Elimínelas primero.`);
  }
  await query('DELETE FROM categorias WHERE id = ?', [req.params.id]);
  res.json({ mensaje: `Categoría «${c.nombre}» eliminada correctamente` });
}));

// ---------- Subcategorías ----------
router.post('/subcategorias', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const errores = {};
  if (esVacio(b.categoria_id)) errores.categoria_id = 'Seleccione la categoría a la que pertenece. Ejemplo: Lácteos';
  let nombre = '';
  try { nombre = validarNombre(b.nombre, 'Mantequilla'); } catch (e) { errores.nombre = e.errores.nombre; }
  if (!errores.categoria_id && !(await query('SELECT id FROM categorias WHERE id = ?', [b.categoria_id])).length) {
    errores.categoria_id = 'La categoría seleccionada no existe. Elija una de la lista.';
  }
  if (Object.keys(errores).length) {
    throw new HttpError(400, `No se pudo guardar: revisa ${Object.keys(errores).length === 1 ? '1 campo' : `${Object.keys(errores).length} campos`}.`, errores);
  }
  if ((await query('SELECT id FROM subcategorias WHERE categoria_id = ? AND nombre = ?', [b.categoria_id, nombre])).length) {
    throw duplicado(`La subcategoría «${nombre}» ya existe en esa categoría.`);
  }
  const r = await query('INSERT INTO subcategorias (categoria_id, nombre) VALUES (?, ?)', [b.categoria_id, nombre]);
  res.status(201).json({ mensaje: `Subcategoría «${nombre}» agregada correctamente`, id: r.insertId });
}));

router.delete('/subcategorias/:id', asyncHandler(async (req, res) => {
  const [s] = await query('SELECT nombre FROM subcategorias WHERE id = ?', [req.params.id]);
  if (!s) throw new HttpError(404, 'La subcategoría no existe o ya fue eliminada.');
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM productos WHERE subcategoria_id = ?', [req.params.id]);
  if (Number(n) > 0) {
    throw new HttpError(409, `No se puede eliminar la subcategoría «${s.nombre}» porque tiene ${n} ${Number(n) === 1 ? 'producto' : 'productos'}.`);
  }
  await query('DELETE FROM subcategorias WHERE id = ?', [req.params.id]);
  res.json({ mensaje: `Subcategoría «${s.nombre}» eliminada correctamente` });
}));

module.exports = router;
