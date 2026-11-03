// Borradores de formularios: autoguardado por usuario y formulario
const router = require('express').Router();
const { query } = require('../db');
const { asyncHandler, HttpError } = require('../utils');

const validarNombre = (f) => {
  if (!/^[a-z0-9_-]{2,60}$/i.test(String(f || ''))) throw new HttpError(400, 'Nombre de formulario no válido.');
};

// GET /api/borradores/:formulario
router.get('/:formulario', asyncHandler(async (req, res) => {
  validarNombre(req.params.formulario);
  const filas = await query(
    'SELECT datos, actualizado_en FROM borradores WHERE usuario_id = ? AND formulario = ?',
    [req.usuario.id, req.params.formulario]
  );
  if (!filas.length) return res.json({ borrador: null });
  let { datos } = filas[0];
  if (typeof datos === 'string') {
    try { datos = JSON.parse(datos); } catch (e) { datos = {}; }
  }
  return res.json({ borrador: { datos, actualizado_en: filas[0].actualizado_en } });
}));

// PUT /api/borradores/:formulario  { datos: {...} }
router.put('/:formulario', asyncHandler(async (req, res) => {
  validarNombre(req.params.formulario);
  const datos = (req.body && req.body.datos) || {};
  const existe = await query(
    'SELECT id FROM borradores WHERE usuario_id = ? AND formulario = ?',
    [req.usuario.id, req.params.formulario]
  );
  if (existe.length) {
    await query('UPDATE borradores SET datos = ?, actualizado_en = NOW() WHERE id = ?', [JSON.stringify(datos), existe[0].id]);
  } else {
    await query(
      'INSERT INTO borradores (usuario_id, formulario, datos, actualizado_en) VALUES (?, ?, ?, NOW())',
      [req.usuario.id, req.params.formulario, JSON.stringify(datos)]
    );
  }
  const [fila] = await query(
    'SELECT actualizado_en FROM borradores WHERE usuario_id = ? AND formulario = ?',
    [req.usuario.id, req.params.formulario]
  );
  res.json({ mensaje: 'Borrador guardado', actualizado_en: fila.actualizado_en });
}));

// DELETE /api/borradores/:formulario
router.delete('/:formulario', asyncHandler(async (req, res) => {
  validarNombre(req.params.formulario);
  await query('DELETE FROM borradores WHERE usuario_id = ? AND formulario = ?', [req.usuario.id, req.params.formulario]);
  res.json({ mensaje: 'Borrador descartado' });
}));

module.exports = router;
