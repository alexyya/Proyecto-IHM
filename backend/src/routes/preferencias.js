const router = require('express').Router();
const { query } = require('../db');
const { asyncHandler, aBool } = require('../utils');

// El tamaño del texto no se guarda: depende solo del zoom del navegador (Ctrl + / Ctrl + rueda).
// Módulo «Apoyo visual»: alto_contraste, foco_reforzado.
// Módulo «Ayuda en formularios»: guardar_borradores, ayuda_formularios, atajos_teclado, aviso_sesion.
const BOOLEANOS = ['alto_contraste', 'foco_reforzado', 'guardar_borradores', 'ayuda_formularios', 'aviso_sesion', 'atajos_teclado'];
const POR_DEFECTO = {
  alto_contraste: false, foco_reforzado: false, guardar_borradores: true,
  ayuda_formularios: true, aviso_sesion: true, atajos_teclado: true,
};

function normalizar(fila) {
  const r = {};
  BOOLEANOS.forEach((k) => { r[k] = aBool(fila[k]); });
  return r;
}

// GET /api/preferencias
router.get('/', asyncHandler(async (req, res) => {
  const filas = await query('SELECT * FROM preferencias_accesibilidad WHERE usuario_id = ?', [req.usuario.id]);
  res.json(filas.length ? normalizar(filas[0]) : POR_DEFECTO);
}));

// PUT /api/preferencias
router.put('/', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const v = BOOLEANOS.map((k) => (aBool(b[k]) ? 1 : 0));
  const existe = await query('SELECT usuario_id FROM preferencias_accesibilidad WHERE usuario_id = ?', [req.usuario.id]);
  if (existe.length) {
    await query(
      `UPDATE preferencias_accesibilidad SET ${BOOLEANOS.map((k) => `${k} = ?`).join(', ')} WHERE usuario_id = ?`,
      [...v, req.usuario.id]
    );
  } else {
    await query(
      `INSERT INTO preferencias_accesibilidad (usuario_id, ${BOOLEANOS.join(', ')}) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.usuario.id, ...v]
    );
  }
  const filas = await query('SELECT * FROM preferencias_accesibilidad WHERE usuario_id = ?', [req.usuario.id]);
  res.json({ mensaje: 'Preferencias guardadas correctamente', preferencias: normalizar(filas[0]) });
}));

module.exports = router;
