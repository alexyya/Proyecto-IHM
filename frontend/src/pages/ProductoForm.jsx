import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { Confirmacion } from '../components/Modal';
import ImportarProductos from '../components/ImportarProductos';
import {
  ErrorCampo, Migas, Requerido, ResumenErrores, Switch, propsCampo, useTitulo,
} from '../components/ui';
import { api, avisarCambioStock } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePreferencias } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { aCSV, descargarArchivo, fecha, hora } from '../utils/formato';

const VACIO = {
  marca_id: '', modelo_id: '', nombre: '', presentacion: '', categoria_id: '', subcategoria_id: '',
  precio: '', contenido: '', unidad: '', stock: '', estado: 'Activo',
};

const ETIQUETAS = {
  marca_id: 'Marca', modelo_id: 'Modelo', nombre: 'Nombre del producto', presentacion: 'Presentación', categoria_id: 'Categoría',
  subcategoria_id: 'Subcategoría', precio: 'Precio (S/)', contenido: 'Contenido neto', unidad: 'Unidad de medida',
  stock: 'Stock inicial', imagen: 'Imagen del producto',
};

// Imagen del producto: JPG o PNG de hasta 2 MB (la misma regla se valida en el servidor)
const IMAGEN_TIPOS = ['image/jpeg', 'image/png'];
const IMAGEN_MAX = 2 * 1024 * 1024;

/** Tamaño legible: 220 KB o 1.4 MB */
const tamano = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const tipoCorto = (tipo) => (tipo === 'image/png' ? 'PNG' : 'JPG');

/** Datos de una imagen guardada (data URL) para mostrarla en el bloque Multimedia. */
function imagenDesdeDataUrl(dataUrl, nombre) {
  const tipo = /^data:(image\/[a-z]+);/.exec(dataUrl)?.[1] || 'image/jpeg';
  const b64 = dataUrl.split(',')[1] || '';
  const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
  return { dataUrl, nombre, tipo, bytes, guardada: true };
}

const leerComoDataUrl = (archivo) => new Promise((ok, falla) => {
  const lector = new FileReader();
  lector.onload = () => ok(lector.result);
  lector.onerror = () => falla(new Error('No se pudo leer el archivo.'));
  lector.readAsDataURL(archivo);
});

const hoyTexto = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/**
 * Interpreta el nombre de un modelo como «Bolsa 2 kg» o «Botella 1.5 L» y devuelve
 * { presentacion: 'Bolsa', contenido: '2', unidad: 'kg' } para autocompletar el formulario.
 */
function desglosarModelo(nombre = '') {
  const m = String(nombre).trim().match(/^(.*?)\s*([\d]+(?:[.,]\d+)?)\s*(kg|g|ml|l|und|unidades?)\.?$/i);
  if (!m) return null;
  let unidad = m[3].toLowerCase();
  if (unidad.startsWith('unidad')) unidad = 'und';
  return { presentacion: m[1].trim(), contenido: m[2].replace(',', '.'), unidad };
}

const UNIDADES = [
  { v: 'ml', t: 'ml (mililitros)' }, { v: 'l', t: 'l (litros)' }, { v: 'g', t: 'g (gramos)' },
  { v: 'kg', t: 'kg (kilogramos)' }, { v: 'und', t: 'und (unidades)' },
];

const FORM_BORRADOR = 'producto';

/** Validación en el cliente (la misma regla se aplica en el servidor). */
export function validar(f) {
  const e = {};
  if (!f.marca_id) e.marca_id = 'Seleccione la marca del producto. Ejemplo: Gloria';
  if (!f.nombre.trim()) e.nombre = 'Ingrese el nombre del producto. Ejemplo: Leche Evaporada Entera';
  else if (f.nombre.trim().length < 3) e.nombre = 'El nombre debe tener al menos 3 caracteres. Ejemplo: Arroz Extra';
  if (!f.presentacion.trim()) e.presentacion = 'Ingrese la presentación del producto. Ejemplo: Lata, Bolsa o Botella';
  if (!f.categoria_id) e.categoria_id = 'Seleccione una categoría. Ejemplo: Lácteos';
  if (!f.subcategoria_id) e.subcategoria_id = 'Seleccione una subcategoría. Ejemplo: Leche';
  const precio = String(f.precio).trim();
  if (!precio) e.precio = 'Ingrese el precio en soles. Ejemplo: 49.90';
  else if (!/^\d{1,8}(\.\d{1,2})?$/.test(precio) || Number(precio) <= 0) e.precio = 'Ingrese el precio en soles con punto decimal. Ejemplo: 49.90';
  const cont = String(f.contenido).trim();
  if (!cont) e.contenido = 'Ingrese el contenido neto. Ejemplo: 400';
  else if (!/^\d{1,8}(\.\d{1,2})?$/.test(cont) || Number(cont) <= 0) e.contenido = 'Ingrese el contenido neto como número mayor que 0. Ejemplo: 400 o 1.5';
  if (!f.unidad) e.unidad = 'Seleccione la unidad de medida. Ejemplo: g';
  const stock = String(f.stock).trim();
  if (!stock) e.stock = 'Ingrese el stock inicial en unidades. Ejemplo: 120';
  else if (!/^\d{1,7}$/.test(stock)) e.stock = 'El stock debe ser un número entero sin decimales. Ejemplo: 120';
  return e;
}

export default function ProductoForm() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  useTitulo(esEdicion ? 'Editar producto' : 'Registrar producto');
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { preferencias } = usePreferencias();
  const { mostrar } = useToast();

  const [catalogos, setCatalogos] = useState({ categorias: [], subcategorias: [], marcas: [], modelos: [] });
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [confirmar, setConfirmar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [imagen, setImagen] = useState(null);
  const [autocompletado, setAutocompletado] = useState('');            // { dataUrl, nombre, tipo, bytes, guardada }
  const [avisoImagen, setAvisoImagen] = useState('');
  const [borrador, setBorrador] = useState(null);       // { hora } si se recuperó un borrador
  const [estadoBorrador, setEstadoBorrador] = useState('');
  const [cargado, setCargado] = useState(!esEdicion);
  const modificado = useRef(false);
  const archivoRef = useRef(null);

  const usarBorradores = !esEdicion && preferencias.guardar_borradores;
  const claveLocal = `pv_borrador_${FORM_BORRADOR}_${usuario?.id}`;

  useEffect(() => {
    api.get('/catalogos').then(setCatalogos).catch((e) => mostrar(e.message, 'error'));
  }, [mostrar]);

  // Edición: cargar producto
  useEffect(() => {
    if (!esEdicion) return;
    api.get(`/productos/${id}`)
      .then((p) => {
        setForm({
          marca_id: String(p.marca_id), modelo_id: p.modelo_id ? String(p.modelo_id) : '', nombre: p.nombre, presentacion: p.presentacion || '',
          categoria_id: String(p.categoria_id), subcategoria_id: String(p.subcategoria_id),
          precio: Number(p.precio).toFixed(2), contenido: String(Number(p.contenido)), unidad: p.unidad || '',
          stock: String(p.stock), estado: p.estado, codigo: p.codigo, fecha_registro: p.fecha_registro,
        });
        if (p.imagen) setImagen(imagenDesdeDataUrl(p.imagen, `Imagen de ${p.nombre}`));
        setCargado(true);
      })
      .catch((e) => { mostrar(e.message, 'error'); navigate('/productos'); });
  }, [esEdicion, id, navigate, mostrar]);

  // Registro: recuperar borrador (API y, como respaldo, localStorage)
  useEffect(() => {
    if (!usarBorradores) return;
    let activo = true;
    const aplicar = (datos, cuando) => {
      if (!activo || !datos || !Object.values(datos).some((v) => v && v !== 'Activo')) return;
      setForm({ ...VACIO, ...datos });
      setBorrador({ hora: cuando });
    };
    api.get(`/borradores/${FORM_BORRADOR}`)
      .then((r) => {
        if (r.borrador) aplicar(r.borrador.datos, hora(r.borrador.actualizado_en));
        else {
          const local = JSON.parse(localStorage.getItem(claveLocal) || 'null');
          if (local) aplicar(local.datos, local.hora);
        }
      })
      .catch(() => {
        try {
          const local = JSON.parse(localStorage.getItem(claveLocal) || 'null');
          if (local) aplicar(local.datos, local.hora);
        } catch { /* sin borrador */ }
      });
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usarBorradores]);

  // Autoguardado con retardo (debounce) mientras el usuario escribe
  useEffect(() => {
    if (!usarBorradores || !modificado.current) return undefined;
    const t = setTimeout(async () => {
      const ahora = new Date();
      const hhmm = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
      try { localStorage.setItem(claveLocal, JSON.stringify({ datos: form, hora: hhmm })); } catch { /* ignorar */ }
      try {
        await api.put(`/borradores/${FORM_BORRADOR}`, { datos: form });
        setEstadoBorrador(`Borrador guardado automáticamente a las ${hhmm}`);
      } catch {
        setEstadoBorrador(`Borrador guardado en este equipo a las ${hhmm}`);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [form, usarBorradores, claveLocal]);

  const modelos = useMemo(
    () => catalogos.modelos.filter((o) => String(o.marca_id) === String(form.marca_id)),
    [catalogos.modelos, form.marca_id]
  );

  const subcategorias = useMemo(
    () => catalogos.subcategorias.filter((s) => String(s.categoria_id) === String(form.categoria_id)),
    [catalogos.subcategorias, form.categoria_id]
  );

  function cambiar(campo, valor) {
    modificado.current = true;
    setForm((f) => {
      const nuevo = { ...f, [campo]: valor };
      if (campo === 'categoria_id') nuevo.subcategoria_id = '';
      if (campo === 'marca_id') nuevo.modelo_id = '';
      // Al elegir un modelo («Bolsa 2 kg») se completan presentación, contenido y unidad (se pueden editar)
      if (campo === 'modelo_id' && valor) {
        const modelo = catalogos.modelos.find((o) => String(o.id) === String(valor));
        const d = desglosarModelo(modelo?.nombre);
        if (d) {
          if (d.presentacion) nuevo.presentacion = d.presentacion;
          nuevo.contenido = d.contenido;
          nuevo.unidad = d.unidad;
          setAutocompletado(`Se completaron Presentación, Contenido neto y Unidad a partir del modelo «${modelo.nombre}». Puede cambiarlos si es necesario.`);
        }
      }
      return nuevo;
    });
    if (campo === 'modelo_id' && !valor) setAutocompletado('');
    if (campo === 'modelo_id' && valor) {
      setErrores((e) => { const c = { ...e }; delete c.presentacion; delete c.contenido; delete c.unidad; return c; });
    }
    if (errores[campo]) {
      setErrores((e) => { const c = { ...e }; delete c[campo]; return c; });
    }
  }

  async function descartarBorrador() {
    try { localStorage.removeItem(claveLocal); } catch { /* ignorar */ }
    try { await api.del(`/borradores/${FORM_BORRADOR}`); } catch { /* ignorar */ }
    modificado.current = false;
    setForm(VACIO);
    setBorrador(null);
    setEstadoBorrador('');
    mostrar('Borrador descartado. El formulario quedó en blanco.', 'info');
    document.getElementById('campo-marca_id')?.focus();
  }

  function enviar(e) {
    e.preventDefault();
    const err = validar(form);
    setErrores(err);
    if (Object.keys(err).length === 0) setConfirmar(true);
  }

  async function guardar() {
    setGuardando(true);
    const cuerpo = { ...form, imagen: imagen ? imagen.dataUrl : null };
    delete cuerpo.codigo;
    delete cuerpo.fecha_registro;
    try {
      const r = esEdicion ? await api.put(`/productos/${id}`, cuerpo) : await api.post('/productos', cuerpo);
      if (!esEdicion) {
        try { localStorage.removeItem(claveLocal); } catch { /* ignorar */ }
        api.del(`/borradores/${FORM_BORRADOR}`).catch(() => {});
      }
      setConfirmar(false);
      mostrar(esEdicion ? 'Producto actualizado correctamente' : 'Producto registrado correctamente', 'exito');
      avisarCambioStock();
      navigate('/productos', { state: { nuevo: r.producto?.id } });
    } catch (ex) {
      setConfirmar(false);
      setGuardando(false);
      if (ex.errores) setErrores(ex.errores);
      else mostrar(ex.message, 'error');
    }
  }

  function descargarPlantilla() {
    const csv = aCSV([
      ['marca', 'nombre', 'modelo', 'presentacion', 'categoria', 'subcategoria', 'precio', 'contenido', 'unidad', 'stock'],
      ['Gloria', 'Leche Evaporada Entera', 'Lata 400 g', 'Lata', 'Lácteos', 'Leche', '4.20', '400', 'g', '120'],
    ]);
    descargarArchivo('plantilla_productos.csv', csv);
    mostrar('Plantilla descargada: plantilla_productos.csv', 'info');
  }

  function errorImagen(mensaje) {
    setErrores((e) => ({ ...e, imagen: mensaje }));
    setAvisoImagen('');
    if (archivoRef.current) archivoRef.current.value = '';
  }

  async function elegirImagen(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!IMAGEN_TIPOS.includes(archivo.type)) {
      errorImagen(`El archivo «${archivo.name}» no es JPG ni PNG. Elija una imagen JPG o PNG. Ejemplo: botella.jpg`);
      return;
    }
    if (archivo.size > IMAGEN_MAX) {
      errorImagen(`La imagen «${archivo.name}» pesa ${tamano(archivo.size)}. El máximo permitido es 2 MB.`);
      return;
    }
    try {
      const dataUrl = await leerComoDataUrl(archivo);
      modificado.current = true;
      setImagen({ dataUrl, nombre: archivo.name, tipo: archivo.type, bytes: archivo.size, guardada: false });
      setErrores((er) => { const c = { ...er }; delete c.imagen; return c; });
      setAvisoImagen(`Imagen ${archivo.name} cargada correctamente.`);
    } catch (ex) {
      errorImagen(ex.message);
    }
  }

  function quitarImagen() {
    setImagen(null);
    setAvisoImagen('Imagen eliminada. Se guardará el producto sin imagen.');
    if (archivoRef.current) archivoRef.current.value = '';
    archivoRef.current?.focus();
  }

  function alTeclear(e) {
    if (e.key === 'Escape' && preferencias.atajos_teclado && !document.querySelector('[data-modal]')) {
      e.preventDefault();
      navigate('/productos');
    }
  }

  const p = (campo, opts) => propsCampo(campo, errores, opts);
  const titulo = esEdicion ? 'Editar Producto' : 'Registrar Producto';

  if (!cargado) return <p className="cargando" role="status">Cargando producto…</p>;

  return (
    <>
      <Migas items={[{ texto: 'Productos', a: '/productos' }, { texto: titulo }]} />
      <div className="cabecera-pagina">
        <div>
          <h1>{titulo}</h1>
          <p>{esEdicion ? `Código ${form.codigo}. Actualice los datos y guarde los cambios.` : 'Complete los datos del producto. El código y la fecha de registro se generan automáticamente.'}</p>
        </div>
        {!esEdicion && (
          <div className="grupo-botones">
            <button type="button" className="btn btn-secundario" onClick={descargarPlantilla}>
              <Icon name="descargar" />Descargar plantilla
            </button>
            <ImportarProductos catalogos={catalogos} onImportado={() => { avisarCambioStock(); }} />
          </div>
        )}
      </div>

      {borrador && (
        <div className="banner banner-info" role="status">
          <Icon name="info" />
          <span>Borrador recuperado (guardado a las {borrador.hora}).</span>
          <button type="button" className="btn btn-secundario" onClick={descartarBorrador}>Descartar borrador</button>
        </div>
      )}

      <ResumenErrores errores={errores} etiquetas={ETIQUETAS} />

      <form className="tarjeta form-producto" onSubmit={enviar} noValidate data-atajo-guardar onKeyDown={alTeclear} aria-labelledby="titulo-form">
        <div className="form-cabecera">
          <h2 id="titulo-form">Datos del producto</h2>
          <p className="chip-datos">
            <span>Código: {esEdicion ? form.codigo : '(automático)'}</span>
            <span aria-hidden="true"> · </span>
            <span>Fecha de registro: {esEdicion ? fecha(form.fecha_registro) : hoyTexto()}</span>
          </p>
        </div>
        {preferencias.ayuda_formularios && (
          <p className="linea-ayuda">
            <Icon name="info" />
            <span>
              Los campos con <span aria-hidden="true">*</span><span className="sr-only">asterisco</span> son obligatorios.
              {preferencias.atajos_teclado && <> Atajos: <kbd>Alt</kbd> + <kbd>G</kbd> guardar · <kbd>Esc</kbd> cancelar.</>}
            </span>
          </p>
        )}

        <fieldset className="bloque">
          <legend>Información básica</legend>
          <div className="form-grid">
            <div className="campo">
              <label htmlFor="campo-marca_id">Marca <Requerido /></label>
              <select {...p('marca_id', { requerido: true })} className="control" value={form.marca_id} onChange={(e) => cambiar('marca_id', e.target.value)}>
                <option value="">Seleccione una marca</option>
                {catalogos.marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
              <ErrorCampo campo="marca_id" error={errores.marca_id} />
            </div>
            <div className="campo">
              <label htmlFor="campo-modelo_id">Modelo (opcional)</label>
              <select {...p('modelo_id', { ayuda: true })} className="control" value={form.modelo_id} onChange={(e) => cambiar('modelo_id', e.target.value)}>
                <option value="">{!form.marca_id ? 'Primero elija una marca' : (modelos.length ? 'Sin modelo' : 'Esta marca no tiene modelos')}</option>
                {modelos.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
              </select>
              <p className="ayuda-campo" id="ayuda-modelo_id">
                Formato o envase de la marca. Ej: Lata 400 g. Al elegirlo se completan presentación, contenido y unidad. Puede agregar modelos en <Link to="/productos?tab=modelos">Productos › Modelos</Link>.
              </p>
              <p className="ayuda-campo aviso-autocompletado" role="status" aria-live="polite">{autocompletado}</p>
              <ErrorCampo campo="modelo_id" error={errores.modelo_id} />
            </div>
            <div className="campo">
              <label htmlFor="campo-nombre">Nombre del producto <Requerido /></label>
              <input {...p('nombre', { requerido: true })} className="control" type="text" maxLength={120} autoComplete="off"
                placeholder="Ej: Leche Evaporada Entera" value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
              <ErrorCampo campo="nombre" error={errores.nombre} />
            </div>
            <div className="campo">
              <label htmlFor="campo-presentacion">Presentación <Requerido /></label>
              <input {...p('presentacion', { requerido: true })} className="control" type="text" maxLength={80} autoComplete="off"
                placeholder="Ej: Lata, Bolsa o Botella" value={form.presentacion} onChange={(e) => cambiar('presentacion', e.target.value)} />
              <ErrorCampo campo="presentacion" error={errores.presentacion} />
            </div>
            <div className="campo">
              <label htmlFor="campo-categoria_id">Categoría <Requerido /></label>
              <select {...p('categoria_id', { requerido: true })} className="control" value={form.categoria_id} onChange={(e) => cambiar('categoria_id', e.target.value)}>
                <option value="">Seleccione una categoría</option>
                {catalogos.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <ErrorCampo campo="categoria_id" error={errores.categoria_id} />
            </div>
            <div className="campo">
              <label htmlFor="campo-subcategoria_id">Subcategoría <Requerido /></label>
              <select {...p('subcategoria_id', { requerido: true, ayuda: !form.categoria_id })} className="control" value={form.subcategoria_id}
                onChange={(e) => cambiar('subcategoria_id', e.target.value)}>
                <option value="">{form.categoria_id ? 'Seleccione una subcategoría' : 'Primero elija una categoría'}</option>
                {subcategorias.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              {!form.categoria_id && <p className="ayuda-campo" id="ayuda-subcategoria_id">Las subcategorías se muestran según la categoría elegida.</p>}
              <ErrorCampo campo="subcategoria_id" error={errores.subcategoria_id} />
            </div>
          </div>
        </fieldset>

        <fieldset className="bloque">
          <legend>Precio y medidas</legend>
          <div className="form-grid">
            <div className="campo">
              <label htmlFor="campo-precio">Precio (S/) <Requerido /></label>
              <div className="prefijo">
                <span aria-hidden="true">S/</span>
                <input {...p('precio', { requerido: true, ayuda: true })} className="control" type="text" inputMode="decimal" autoComplete="off"
                  placeholder="Ej: 49.90" value={form.precio} onChange={(e) => cambiar('precio', e.target.value)} />
              </div>
              <p className="ayuda-campo" id="ayuda-precio">Use punto para los decimales.</p>
              <ErrorCampo campo="precio" error={errores.precio} />
            </div>
            <div className="campo">
              <label htmlFor="campo-contenido">Contenido neto <Requerido /></label>
              <input {...p('contenido', { requerido: true })} className="control" type="text" inputMode="decimal" autoComplete="off"
                placeholder="Ej: 400" value={form.contenido} onChange={(e) => cambiar('contenido', e.target.value)} />
              <ErrorCampo campo="contenido" error={errores.contenido} />
            </div>
            <div className="campo">
              <label htmlFor="campo-unidad">Unidad de medida <Requerido /></label>
              <select {...p('unidad', { requerido: true })} className="control" value={form.unidad} onChange={(e) => cambiar('unidad', e.target.value)}>
                <option value="">Seleccione la unidad</option>
                {UNIDADES.map((u) => <option key={u.v} value={u.v}>{u.t}</option>)}
              </select>
              <ErrorCampo campo="unidad" error={errores.unidad} />
            </div>
            <div className="campo">
              <label htmlFor="campo-stock">{esEdicion ? 'Stock actual' : 'Stock inicial'} <Requerido /></label>
              <input {...p('stock', { requerido: true })} className="control" type="text" inputMode="numeric" autoComplete="off"
                placeholder="Ej: 120" value={form.stock} onChange={(e) => cambiar('stock', e.target.value)} />
              <ErrorCampo campo="stock" error={errores.stock} />
            </div>
            <div className="campo">
              <span className="etiqueta" id="etiqueta-estado">Estado del producto</span>
              <div className="toggle-estado">
                <Switch
                  id="campo-estado"
                  checked={form.estado === 'Activo'}
                  onChange={(v) => cambiar('estado', v ? 'Activo' : 'Inactivo')}
                  labelledBy="etiqueta-estado"
                  textos={['Activo', 'Inactivo']}
                />
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="bloque">
          <legend>Multimedia</legend>
          <div className={`zona-archivo${errores.imagen ? ' con-error' : ''}`}>
            {imagen ? (
              <img src={imagen.dataUrl} alt={`Vista previa de la imagen del producto ${form.nombre || ''}`.trim()} className="miniatura" />
            ) : (
              <span className="miniatura" aria-hidden="true"><Icon name="imagen" /></span>
            )}
            <div className="archivo-info">
              {imagen ? (
                <>
                  <p className="archivo-nombre">{imagen.nombre}</p>
                  <p className="archivo-ok">
                    <Icon name="check" />
                    <span>{tipoCorto(imagen.tipo)} · {tamano(imagen.bytes)} · {imagen.guardada ? 'Imagen guardada' : 'Imagen cargada correctamente'}</span>
                  </p>
                </>
              ) : (
                <p className="archivo-nombre">Imagen del producto (opcional)</p>
              )}
              <p className="ayuda-campo" id="ayuda-imagen">
                Formatos JPG o PNG, máximo 2 MB.{imagen ? ' Elija otra imagen para reemplazarla.' : ' Se muestra una vista previa antes de guardar.'}
              </p>
              <ErrorCampo campo="imagen" error={errores.imagen} />
            </div>
            <div className="archivo-acciones">
              <input
                ref={archivoRef}
                id="campo-imagen"
                className="archivo-oculto"
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                aria-describedby={`ayuda-imagen${errores.imagen ? ' error-imagen' : ''}`}
                aria-invalid={errores.imagen ? 'true' : undefined}
                onChange={elegirImagen}
              />
              <label htmlFor="campo-imagen" className="btn btn-secundario btn-archivo">
                <Icon name="subir" />{imagen ? 'Cambiar imagen' : 'Seleccionar imagen'}
              </label>
              {imagen && (
                <button type="button" className="btn btn-enlace-peligro" onClick={quitarImagen}>
                  Eliminar<span className="sr-only"> imagen</span>
                </button>
              )}
            </div>
            <p className="sr-only" role="status" aria-live="polite">{avisoImagen}</p>
          </div>
        </fieldset>

        <p className="estado-texto" role="status" aria-live="polite">{usarBorradores ? estadoBorrador : ''}</p>

        <div className="form-acciones">
          <button type="button" className="btn btn-secundario" onClick={() => navigate('/productos')}>Cancelar</button>
          <button type="submit" className="btn btn-primario"><Icon name="guardar" />{esEdicion ? 'Guardar cambios' : 'Guardar producto'}</button>
        </div>
      </form>

      {confirmar && (
        <Confirmacion
          titulo={esEdicion ? 'Confirmar cambios' : 'Confirmar registro'}
          mensaje={esEdicion ? `¿Guardar los cambios del producto «${form.nombre}»?` : `¿Registrar el producto «${form.nombre}»?`}
          textoConfirmar={esEdicion ? 'Guardar' : 'Registrar'}
          ocupado={guardando}
          onCancel={() => setConfirmar(false)}
          onConfirm={guardar}
        />
      )}
    </>
  );
}
