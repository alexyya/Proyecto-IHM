// Importación de productos desde CSV (plantilla «Descargar plantilla»).
// Lee archivos separados por coma o punto y coma (Excel en español usa «;»),
// con comillas dobles, saltos de línea CRLF y marca BOM de UTF-8.

export const COLUMNAS = ['marca', 'nombre', 'modelo', 'presentacion', 'categoria', 'subcategoria', 'precio', 'contenido', 'unidad', 'stock'];
const OBLIGATORIAS = ['marca', 'nombre', 'presentacion', 'categoria', 'subcategoria', 'precio', 'contenido', 'unidad', 'stock'];
const UNIDADES = ['ml', 'l', 'g', 'kg', 'und'];
export const MAX_FILAS = 500;

/** Texto en minúsculas, sin tildes ni espacios extra (comparación por nombre). */
export const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

/** Convierte el texto CSV en una matriz de celdas. */
export function leerCSV(texto) {
  const t = String(texto).replace(/^﻿/, '');
  const primera = t.split(/\r?\n/, 1)[0] || '';
  const contar = (c) => primera.split(c).length - 1;
  const sep = contar(';') > contar(',') ? ';' : ',';
  const filas = [];
  let fila = [];
  let celda = '';
  let comillas = false;
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    if (comillas) {
      if (c === '"') {
        if (t[i + 1] === '"') { celda += '"'; i += 1; } else comillas = false;
      } else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(celda); celda = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i += 1;
      fila.push(celda); filas.push(fila); fila = []; celda = '';
    } else celda += c;
  }
  if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }
  return { separador: sep, filas: filas.filter((f) => f.some((x) => String(x).trim() !== '')) };
}

/**
 * Convierte la matriz en objetos con las columnas de la plantilla.
 * Devuelve { error } si falta el encabezado o alguna columna obligatoria.
 */
export function filasDesdeCSV(texto) {
  const { filas } = leerCSV(texto);
  if (!filas.length) return { error: 'El archivo está vacío. Use la plantilla «Descargar plantilla» y agregue al menos un producto.' };
  const cab = filas[0].map(normalizar);
  const faltan = OBLIGATORIAS.filter((c) => !cab.includes(c));
  if (faltan.length) {
    return { error: `Faltan columnas en el encabezado: ${faltan.join(', ')}. La primera fila debe ser: ${COLUMNAS.join(', ')}.` };
  }
  const datos = filas.slice(1);
  if (!datos.length) return { error: 'El archivo solo tiene el encabezado. Agregue al menos un producto debajo.' };
  if (datos.length > MAX_FILAS) return { error: `El archivo tiene ${datos.length} filas. El máximo por importación es ${MAX_FILAS}.` };
  return {
    filas: datos.map((f, i) => {
      const o = { fila: i + 2 };   // número de fila en Excel (la 1 es el encabezado)
      COLUMNAS.forEach((c) => { const k = cab.indexOf(c); o[c] = k >= 0 ? String(f[k] ?? '').trim() : ''; });
      return o;
    }),
  };
}

const numero = (v) => String(v ?? '').trim().replace(',', '.');

/** Valida una fila contra los catálogos. Devuelve la lista de errores en texto. */
export function validarFila(f, catalogos) {
  const err = [];
  OBLIGATORIAS.forEach((c) => { if (!f[c]) err.push(`Falta «${c}»`); });
  const marca = f.marca && catalogos.marcas.find((m) => normalizar(m.nombre) === normalizar(f.marca));
  if (f.marca && !marca) err.push(`La marca «${f.marca}» no existe`);
  const cat = f.categoria && catalogos.categorias.find((c) => normalizar(c.nombre) === normalizar(f.categoria));
  if (f.categoria && !cat) err.push(`La categoría «${f.categoria}» no existe`);
  if (cat && f.subcategoria) {
    const sub = catalogos.subcategorias.find((s) => Number(s.categoria_id) === Number(cat.id) && normalizar(s.nombre) === normalizar(f.subcategoria));
    if (!sub) err.push(`La subcategoría «${f.subcategoria}» no existe en ${cat.nombre}`);
  }
  if (marca && f.modelo) {
    const mod = catalogos.modelos.find((o) => Number(o.marca_id) === Number(marca.id) && normalizar(o.nombre) === normalizar(f.modelo));
    if (!mod) err.push(`El modelo «${f.modelo}» no existe para ${marca.nombre} (puede dejarlo vacío)`);
  }
  if (f.nombre && f.nombre.length < 3) err.push('El nombre debe tener al menos 3 caracteres');
  if (f.precio && !(/^\d{1,8}(\.\d{1,2})?$/.test(numero(f.precio)) && Number(numero(f.precio)) > 0)) err.push(`Precio «${f.precio}» no es un número válido (ej.: 4.20)`);
  if (f.contenido && !(/^\d{1,8}(\.\d{1,2})?$/.test(numero(f.contenido)) && Number(numero(f.contenido)) > 0)) err.push(`Contenido «${f.contenido}» no es un número válido (ej.: 400)`);
  if (f.unidad && !UNIDADES.includes(normalizar(f.unidad))) err.push(`Unidad «${f.unidad}» no válida (ml, l, g, kg o und)`);
  if (f.stock && !/^\d{1,7}$/.test(String(f.stock).trim())) err.push(`Stock «${f.stock}» debe ser un número entero (ej.: 120)`);
  return err;
}
