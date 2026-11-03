// Utilidades compartidas por las rutas

/** Envuelve un controlador async para que Express reciba los errores. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Error HTTP con mensaje y, opcionalmente, errores por campo. */
class HttpError extends Error {
  constructor(status, mensaje, errores) {
    super(mensaje);
    this.status = status;
    this.errores = errores;
  }
}

const esVacio = (v) => v === undefined || v === null || String(v).trim() === '';

/** Convierte un valor booleano de MySQL (0/1) o de JSON a booleano JS. */
const aBool = (v) => v === true || v === 1 || v === '1' || v === 'true';

/** Fecha local en formato AAAA-MM-DD. */
function hoyISO(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** "1 campo" / "3 campos" */
const textoCampos = (n) => `${n} ${n === 1 ? 'campo' : 'campos'}`;

module.exports = { asyncHandler, HttpError, esVacio, aBool, hoyISO, textoCampos };
