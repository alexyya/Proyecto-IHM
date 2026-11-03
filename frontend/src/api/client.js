// Cliente HTTP para la API (usa el proxy /api de Vite)

const CLAVE_TOKEN = 'pv_token';

export function obtenerToken() {
  try {
    return localStorage.getItem(CLAVE_TOKEN) || sessionStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token, recordar) {
  try {
    localStorage.removeItem(CLAVE_TOKEN);
    sessionStorage.removeItem(CLAVE_TOKEN);
    if (token) (recordar ? localStorage : sessionStorage).setItem(CLAVE_TOKEN, token);
  } catch {
    /* almacenamiento no disponible */
  }
}

export class ApiError extends Error {
  constructor(status, mensaje, errores) {
    super(mensaje);
    this.status = status;
    this.errores = errores || null;
  }
}

async function solicitar(metodo, ruta, cuerpo) {
  const cabeceras = { Accept: 'application/json' };
  const token = obtenerToken();
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  let resp;
  try {
    resp = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución (puerto 4000).');
  }

  let datos = null;
  const texto = await resp.text();
  if (texto) {
    try { datos = JSON.parse(texto); } catch { datos = { mensaje: texto }; }
  }
  if (!resp.ok) {
    if (resp.status === 401 && ruta !== '/auth/login') {
      window.dispatchEvent(new CustomEvent('pv:sesion-expirada'));
    }
    throw new ApiError(resp.status, (datos && datos.mensaje) || 'Ocurrió un error inesperado.', datos && datos.errores);
  }
  return datos;
}

/** Descarga un recurso binario autenticado (p. ej. la imagen de un producto) como Blob. */
async function obtenerBlob(ruta) {
  const token = obtenerToken();
  const resp = await fetch(`/api${ruta}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!resp.ok) throw new ApiError(resp.status, 'No se pudo cargar el archivo.');
  return resp.blob();
}

export const api = {
  blob: obtenerBlob,
  get: (ruta) => solicitar('GET', ruta),
  post: (ruta, cuerpo) => solicitar('POST', ruta, cuerpo ?? {}),
  put: (ruta, cuerpo) => solicitar('PUT', ruta, cuerpo ?? {}),
  del: (ruta) => solicitar('DELETE', ruta),
};

/** Construye una query string ignorando valores vacíos. */
export function qs(params) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') s.set(k, v);
  });
  const t = s.toString();
  return t ? `?${t}` : '';
}

/** Notifica a la interfaz que cambió el stock (para actualizar la campana). */
export const avisarCambioStock = () => window.dispatchEvent(new CustomEvent('pv:stock'));
