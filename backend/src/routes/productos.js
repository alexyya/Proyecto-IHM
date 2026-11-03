const router = require('express').Router();
const { pool, query } = require('../db');
const { asyncHandler, HttpError, esVacio, hoyISO, textoCampos } = require('../utils');

const UNIDADES = ['ml', 'l', 'g', 'kg', 'und'];

// Imagen del producto: data URL JPG o PNG de hasta 2 MB (se guarda en productos.imagen)
const IMAGEN_MAX_BYTES = 2 * 1024 * 1024;
const RE_DATA_URL = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/;

/** Separa un data URL en { tipo, bytes } o devuelve null si no es válido. */
function decodificarImagen(dataUrl) {
  const m = RE_DATA_URL.exec(String(dataUrl || ''));
  if (!m) return null;
  return { tipo: m[1], bytes: Buffer.from(m[2], 'base64') };
}

/**
 * Valida la imagen enviada. undefined = no cambiar; null o '' = quitar imagen;
 * texto = data URL JPG/PNG de máximo 2 MB. Devuelve { error } o { valor }.
 */
function validarImagen(valor) {
  if (valor === undefined) return { valor: undefined };
  if (valor === null || valor === '') return { valor: null };
  const img = decodificarImagen(valor);
  if (!img) return { error: 'La imagen debe ser un archivo JPG o PNG. Ejemplo: botella.jpg' };
  const esJpg = img.bytes[0] === 0xff && img.bytes[1] === 0xd8 && img.bytes[2] === 0xff;
  const esPng = img.bytes.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if ((img.tipo === 'image/jpeg' && !esJpg) || (img.tipo === 'image/png' && !esPng)) {
    return { error: 'El archivo no es una imagen JPG o PNG válida. Elija otra imagen.' };
  }
  if (img.bytes.length > IMAGEN_MAX_BYTES) {
    return { error: `La imagen pesa ${(img.bytes.length / 1048576).toFixed(1)} MB. El máximo permitido es 2 MB.` };
  }
  return { valor: String(valor) };
}

const SQL_LISTA = `
  SELECT p.id, p.codigo, p.nombre, p.presentacion, p.precio, p.contenido, p.unidad,
         p.stock, p.stock_minimo, p.estado, p.fecha_registro,
         (p.imagen IS NOT NULL) AS tiene_imagen,
         p.marca_id, m.nombre AS marca,
         p.modelo_id, o.nombre AS modelo,
         p.subcategoria_id, s.nombre AS subcategoria,
         c.id AS categoria_id, c.nombre AS categoria
  FROM productos p
  JOIN marcas m ON m.id = p.marca_id
  LEFT JOIN modelos o ON o.id = p.modelo_id
  JOIN subcategorias s ON s.id = p.subcategoria_id
  JOIN categorias c ON c.id = s.categoria_id`;

/**
 * Valida los datos de un producto. Devuelve { errores, datos } con mensajes
 * claros en español y ejemplos de formato (heurística de prevención de errores).
 */
async function validarProducto(body) {
  const errores = {};
  const b = body || {};

  if (esVacio(b.marca_id)) errores.marca_id = 'Seleccione la marca del producto. Ejemplo: Gloria';
  if (esVacio(b.nombre)) {
    errores.nombre = 'Ingrese el nombre del producto. Ejemplo: Leche Evaporada Entera';
  } else if (String(b.nombre).trim().length < 3) {
    errores.nombre = 'El nombre debe tener al menos 3 caracteres. Ejemplo: Arroz Extra';
  } else if (String(b.nombre).trim().length > 120) {
    errores.nombre = 'El nombre no debe superar los 120 caracteres.';
  }
  if (esVacio(b.presentacion)) errores.presentacion = 'Ingrese la presentación del producto. Ejemplo: Lata, Bolsa o Botella';
  if (esVacio(b.categoria_id)) errores.categoria_id = 'Seleccione una categoría. Ejemplo: Lácteos';
  if (esVacio(b.subcategoria_id)) errores.subcategoria_id = 'Seleccione una subcategoría. Ejemplo: Leche';

  const precioTxt = String(b.precio ?? '').trim();
  if (precioTxt === '') {
    errores.precio = 'Ingrese el precio en soles. Ejemplo: 49.90';
  } else if (!/^\d{1,8}(\.\d{1,2})?$/.test(precioTxt) || Number(precioTxt) <= 0) {
    errores.precio = 'Ingrese el precio en soles con punto decimal. Ejemplo: 49.90';
  }

  const contTxt = String(b.contenido ?? '').trim();
  if (contTxt === '') {
    errores.contenido = 'Ingrese el contenido neto. Ejemplo: 400';
  } else if (!/^\d{1,8}(\.\d{1,2})?$/.test(contTxt) || Number(contTxt) <= 0) {
    errores.contenido = 'Ingrese el contenido neto como número mayor que 0. Ejemplo: 400 o 1.5';
  }

  if (esVacio(b.unidad)) errores.unidad = 'Seleccione la unidad de medida. Ejemplo: g';
  else if (!UNIDADES.includes(b.unidad)) errores.unidad = 'Seleccione una unidad válida: ml, l, g, kg o und.';

  const stockTxt = String(b.stock ?? '').trim();
  if (stockTxt === '') {
    errores.stock = 'Ingrese el stock inicial en unidades. Ejemplo: 120';
  } else if (!/^\d{1,7}$/.test(stockTxt)) {
    errores.stock = 'El stock debe ser un número entero sin decimales. Ejemplo: 120';
  }

  const estado = b.estado === 'Inactivo' ? 'Inactivo' : 'Activo';

  const imagen = validarImagen(b.imagen);
  if (imagen.error) errores.imagen = imagen.error;

  // Verificar que la marca y la subcategoría existan y sean coherentes
  if (!errores.marca_id) {
    const m = await query('SELECT id FROM marcas WHERE id = ?', [b.marca_id]);
    if (!m.length) errores.marca_id = 'La marca seleccionada no existe. Elija una de la lista.';
  }
  if (!errores.subcategoria_id) {
    const s = await query('SELECT id, categoria_id FROM subcategorias WHERE id = ?', [b.subcategoria_id]);
    if (!s.length) errores.subcategoria_id = 'La subcategoría seleccionada no existe. Elija una de la lista.';
    else if (!errores.categoria_id && Number(s[0].categoria_id) !== Number(b.categoria_id)) {
      errores.subcategoria_id = 'La subcategoría no pertenece a la categoría elegida. Ejemplo: Lácteos › Leche';
    }
  }

  // Modelo (opcional): si se indica, debe pertenecer a la marca elegida
  let modeloId = null;
  if (!esVacio(b.modelo_id)) {
    const o = await query('SELECT id, marca_id FROM modelos WHERE id = ?', [b.modelo_id]);
    if (!o.length) errores.modelo_id = 'El modelo seleccionado no existe. Elija uno de la lista o déjelo vacío.';
    else if (!errores.marca_id && Number(o[0].marca_id) !== Number(b.marca_id)) {
      errores.modelo_id = 'El modelo no pertenece a la marca elegida. Ejemplo: Gloria › Lata 400 g';
    } else modeloId = Number(b.modelo_id);
  }

  return {
    errores,
    datos: {
      nombre: String(b.nombre || '').trim(),
      marca_id: Number(b.marca_id),
      modelo_id: modeloId,
      subcategoria_id: Number(b.subcategoria_id),
      presentacion: String(b.presentacion || '').trim(),
      precio: Number(precioTxt),
      contenido: Number(contTxt),
      unidad: b.unidad,
      stock: parseInt(stockTxt, 10),
      estado,
      imagen: imagen.valor,   // undefined = sin cambios
    },
  };
}

/** Genera el siguiente código SKU-xxxxx disponible. */
async function generarCodigo() {
  for (let i = 0; i < 20; i += 1) {
    const codigo = `SKU-${Math.floor(10000 + Math.random() * 90000)}`;
    const existe = await query('SELECT id FROM productos WHERE codigo = ?', [codigo]);
    if (!existe.length) return codigo;
  }
  throw new HttpError(500, 'No se pudo generar un código de producto único.');
}

// GET /api/productos?q=&categoria=&marca=
router.get('/', asyncHandler(async (req, res) => {
  const { q, categoria, marca, estado } = req.query;
  const where = [];
  const params = [];
  if (!esVacio(q)) {
    where.push('(p.nombre LIKE ? OR p.codigo LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (!esVacio(categoria)) { where.push('c.id = ?'); params.push(categoria); }
  if (!esVacio(marca)) { where.push('m.id = ?'); params.push(marca); }
  if (!esVacio(estado)) { where.push('p.estado = ?'); params.push(estado); }
  const sql = `${SQL_LISTA} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY p.fecha_registro DESC, p.id DESC`;
  res.json(await query(sql, params));
}));

// POST /api/productos/importar  { filas: [{ fila, marca, nombre, modelo, presentacion, categoria,
//   subcategoria, precio, contenido, unidad, stock }] }
// Busca marca, categoría, subcategoría y modelo por NOMBRE (sin distinguir mayúsculas ni tildes),
// valida cada fila con las mismas reglas del formulario e inserta las válidas en una sola
// transacción con código y fecha automáticos. Responde { importados, errores: [{ fila, mensaje }] }.
const MAX_IMPORTAR = 500;
const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
const num = (v) => String(v ?? '').trim().replace(',', '.');

router.post('/importar', asyncHandler(async (req, res) => {
  const filas = Array.isArray(req.body?.filas) ? req.body.filas : null;
  if (!filas || !filas.length) throw new HttpError(400, 'No se recibieron filas para importar. Use la plantilla CSV.');
  if (filas.length > MAX_IMPORTAR) throw new HttpError(400, `Se pueden importar como máximo ${MAX_IMPORTAR} productos por archivo.`);

  const [marcas, subcats, modelos] = await Promise.all([
    query('SELECT id, nombre FROM marcas'),
    query('SELECT s.id, s.nombre, s.categoria_id, c.nombre AS categoria FROM subcategorias s JOIN categorias c ON c.id = s.categoria_id'),
    query('SELECT id, nombre, marca_id FROM modelos'),
  ]);

  const errores = [];
  const validos = [];
  for (let i = 0; i < filas.length; i += 1) {
    const f = filas[i] || {};
    const nFila = Number(f.fila) || i + 2;
    const prev = [];
    const marca = marcas.find((m) => norm(m.nombre) === norm(f.marca));
    if (esVacio(f.marca)) prev.push('Falta la marca');
    else if (!marca) prev.push(`La marca «${String(f.marca).trim()}» no existe`);
    const delaCat = subcats.filter((s) => norm(s.categoria) === norm(f.categoria));
    if (esVacio(f.categoria)) prev.push('Falta la categoría');
    else if (!delaCat.length) prev.push(`La categoría «${String(f.categoria).trim()}» no existe`);
    const sub = delaCat.find((s) => norm(s.nombre) === norm(f.subcategoria));
    if (esVacio(f.subcategoria)) prev.push('Falta la subcategoría');
    else if (delaCat.length && !sub) prev.push(`La subcategoría «${String(f.subcategoria).trim()}» no existe en ${delaCat[0].categoria}`);
    let modeloId = '';
    if (!esVacio(f.modelo) && marca) {
      const mod = modelos.find((o) => Number(o.marca_id) === Number(marca.id) && norm(o.nombre) === norm(f.modelo));
      if (!mod) prev.push(`El modelo «${String(f.modelo).trim()}» no existe para ${marca.nombre}`);
      else modeloId = mod.id;
    }
    const { errores: errVal, datos } = await validarProducto({
      marca_id: marca ? marca.id : '', modelo_id: modeloId, nombre: f.nombre, presentacion: f.presentacion,
      categoria_id: sub ? sub.categoria_id : '', subcategoria_id: sub ? sub.id : '',
      precio: num(f.precio), contenido: num(f.contenido), unidad: norm(f.unidad), stock: String(f.stock ?? '').trim(), estado: 'Activo',
    });
    // los errores de marca/categoría ya se explicaron por nombre
    ['marca_id', 'categoria_id', 'subcategoria_id', 'modelo_id'].forEach((k) => { if (prev.length) delete errVal[k]; });
    const todos = [...prev, ...Object.values(errVal)];
    if (todos.length) errores.push({ fila: nFila, mensaje: todos.join('; ') });
    else validos.push(datos);
  }

  let importados = 0;
  if (validos.length) {
    const usados = new Set();
    const codigos = [];
    for (let i = 0; i < validos.length; i += 1) {
      let c;
      do { c = await generarCodigo(); } while (usados.has(c));
      usados.add(c); codigos.push(c);
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (let i = 0; i < validos.length; i += 1) {
        const d = validos[i];
        const [r] = await conn.query(
          `INSERT INTO productos (codigo, nombre, marca_id, modelo_id, subcategoria_id, presentacion, precio, contenido, unidad, stock, estado, fecha_registro)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Activo', ?)`,
          [codigos[i], d.nombre, d.marca_id, d.modelo_id, d.subcategoria_id, d.presentacion, d.precio, d.contenido, d.unidad, d.stock, hoyISO()]
        );
        if (d.stock > 0) {
          await conn.query(
            "INSERT INTO movimientos (producto_id, usuario_id, tipo, cantidad, motivo, fecha) VALUES (?, ?, 'Entrada', ?, 'Stock inicial (importación CSV)', NOW())",
            [r.insertId, req.usuario.id, d.stock]
          );
        }
      }
      await conn.commit();
      importados = validos.length;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
  res.status(importados ? 201 : 200).json({ importados, errores });
}));

// GET /api/productos/:id (incluye la imagen como data URL)
router.get('/:id', asyncHandler(async (req, res) => {
  const filas = await query(`${SQL_LISTA.replace('p.fecha_registro,', 'p.fecha_registro, p.imagen,')} WHERE p.id = ?`, [req.params.id]);
  if (!filas.length) throw new HttpError(404, 'El producto no existe o fue eliminado.');
  res.json(filas[0]);
}));

// GET /api/productos/:id/imagen → bytes de la imagen (miniaturas de la tabla)
router.get('/:id/imagen', asyncHandler(async (req, res) => {
  const filas = await query('SELECT imagen FROM productos WHERE id = ?', [req.params.id]);
  const img = filas.length ? decodificarImagen(filas[0].imagen) : null;
  if (!img) throw new HttpError(404, 'El producto no tiene imagen.');
  res.setHeader('Content-Type', img.tipo);
  res.setHeader('Content-Length', img.bytes.length);
  res.setHeader('Cache-Control', 'private, no-cache');
  res.end(img.bytes);
}));

// POST /api/productos
router.post('/', asyncHandler(async (req, res) => {
  const { errores, datos } = await validarProducto(req.body);
  if (Object.keys(errores).length) {
    throw new HttpError(400, `No se pudo guardar: revisa ${textoCampos(Object.keys(errores).length)}.`, errores);
  }
  const codigo = await generarCodigo();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO productos (codigo, nombre, marca_id, modelo_id, subcategoria_id, presentacion, precio, contenido, unidad, stock, estado, fecha_registro, imagen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo, datos.nombre, datos.marca_id, datos.modelo_id, datos.subcategoria_id, datos.presentacion, datos.precio,
        datos.contenido, datos.unidad, datos.stock, datos.estado, hoyISO(), datos.imagen ?? null]
    );
    if (datos.stock > 0) {
      await conn.query(
        "INSERT INTO movimientos (producto_id, usuario_id, tipo, cantidad, motivo, fecha) VALUES (?, ?, 'Entrada', ?, 'Stock inicial del producto', NOW())",
        [r.insertId, req.usuario.id, datos.stock]
      );
    }
    await conn.commit();
    const [producto] = await query(`${SQL_LISTA} WHERE p.id = ?`, [r.insertId]);
    res.status(201).json({ mensaje: 'Producto registrado correctamente', producto });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

// PUT /api/productos/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const existe = await query('SELECT id FROM productos WHERE id = ?', [req.params.id]);
  if (!existe.length) throw new HttpError(404, 'El producto no existe o fue eliminado.');
  const { errores, datos } = await validarProducto(req.body);
  if (Object.keys(errores).length) {
    throw new HttpError(400, `No se pudo guardar: revisa ${textoCampos(Object.keys(errores).length)}.`, errores);
  }
  await query(
    `UPDATE productos SET nombre = ?, marca_id = ?, modelo_id = ?, subcategoria_id = ?, presentacion = ?, precio = ?,
       contenido = ?, unidad = ?, stock = ?, estado = ? WHERE id = ?`,
    [datos.nombre, datos.marca_id, datos.modelo_id, datos.subcategoria_id, datos.presentacion, datos.precio,
      datos.contenido, datos.unidad, datos.stock, datos.estado, req.params.id]
  );
  // imagen: undefined = se conserva; null = se elimina; data URL = se reemplaza
  if (datos.imagen !== undefined) {
    await query('UPDATE productos SET imagen = ? WHERE id = ?', [datos.imagen, req.params.id]);
  }
  const [producto] = await query(`${SQL_LISTA} WHERE p.id = ?`, [req.params.id]);
  res.json({ mensaje: 'Producto actualizado correctamente', producto });
}));

// DELETE /api/productos/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const filas = await query('SELECT nombre FROM productos WHERE id = ?', [req.params.id]);
  if (!filas.length) throw new HttpError(404, 'El producto no existe o ya fue eliminado.');
  await query('DELETE FROM movimientos WHERE producto_id = ?', [req.params.id]);
  await query('DELETE FROM productos WHERE id = ?', [req.params.id]);
  res.json({ mensaje: `Producto «${filas[0].nombre}» eliminado correctamente` });
}));

module.exports = router;
