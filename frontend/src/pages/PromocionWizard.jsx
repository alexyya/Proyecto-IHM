import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { Confirmacion } from '../components/Modal';
import { ErrorCampo, Migas, Requerido, ResumenErrores, propsCampo, useTitulo } from '../components/ui';
import { api } from '../api/client';
import { usePreferencias } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { fecha, soles } from '../utils/formato';

const PASOS = ['Información general', 'Configuración', 'Confirmación'];
const CANALES = ['Tienda física', 'Web', 'App'];
const DESCUENTOS = ['Descuento %', 'Monto fijo', 'Precio especial'];
const COMBOS = ['2×1', '3×2', 'Combo', 'Regalo por compra'];
const CON_VALOR = ['Descuento %', 'Monto fijo', 'Precio especial', 'Combo'];

const ETIQUETAS = {
  nombre: 'Nombre', codigo: 'Código', fecha_inicio: 'Fecha de inicio', fecha_fin: 'Fecha de fin',
  prioridad: 'Prioridad', canales: 'Canales de venta', marcas: 'Marcas participantes', tipo: 'Tipo de promoción',
  valor: 'Valor', conf1: 'Confirmación de datos', conf2: 'Confirmación de vigencia',
};

function etiquetaValor(tipo) {
  if (tipo === 'Descuento %') return { texto: 'Porcentaje de descuento (%)', ej: 'Ej: 20' };
  if (tipo === 'Monto fijo') return { texto: 'Monto de descuento (S/)', ej: 'Ej: 10.00' };
  if (tipo === 'Precio especial') return { texto: 'Precio especial (S/)', ej: 'Ej: 79.90' };
  return { texto: 'Precio del combo (S/)', ej: 'Ej: 39.90' };
}

/** Simulación de la promoción sobre un precio base de S/ 100. */
function simular(tipo, valor) {
  const v = Number(valor) || 0;
  switch (tipo) {
    case 'Descuento %': return { antes: 100, despues: Math.max(0, 100 - v), nota: `${v || 0} % de descuento sobre un producto de S/ 100.` };
    case 'Monto fijo': return { antes: 100, despues: Math.max(0, 100 - v), nota: `S/ ${v.toFixed(2)} menos sobre un producto de S/ 100.` };
    case 'Precio especial': return { antes: 100, despues: v, nota: 'El producto se vende a un precio especial fijo.' };
    case '2×1': return { antes: 200, despues: 100, nota: 'Lleva 2 productos de S/ 100 y paga 1.' };
    case '3×2': return { antes: 300, despues: 200, nota: 'Lleva 3 productos de S/ 100 y paga 2.' };
    case 'Combo': return { antes: 100, despues: v, nota: 'Productos seleccionados por S/ 100 se venden juntos al precio del combo.' };
    case 'Regalo por compra': return { antes: 100, despues: 100, nota: 'Por compras desde S/ 100 el cliente recibe un regalo.' };
    default: return null;
  }
}

function validarPaso(paso, f) {
  const e = {};
  if (paso === 0) {
    if (!f.nombre.trim()) e.nombre = 'Ingrese el nombre de la promoción. Ejemplo: Campaña escolar';
    else if (f.nombre.trim().length < 3) e.nombre = 'El nombre debe tener al menos 3 caracteres.';
    if (f.codigo && !/^[A-Za-z0-9]{4,20}$/.test(f.codigo.trim())) e.codigo = 'Use de 4 a 20 letras o números, sin espacios. Ejemplo: ESCOLAR26';
    if (!f.fecha_inicio) e.fecha_inicio = 'Seleccione la fecha de inicio. Ejemplo: 15/11/2026';
    if (!f.fecha_fin) e.fecha_fin = 'Seleccione la fecha de fin. Ejemplo: 30/11/2026';
    else if (f.fecha_inicio && f.fecha_fin < f.fecha_inicio) e.fecha_fin = 'La fecha de fin debe ser igual o posterior a la fecha de inicio.';
    if (!f.prioridad) e.prioridad = 'Seleccione la prioridad: Alta, Media o Baja.';
    if (!f.canales.length) e.canales = 'Seleccione al menos un canal de venta. Ejemplo: Tienda física';
  }
  if (paso === 1) {
    if (!f.marcas.length) e.marcas = 'Seleccione al menos una marca participante.';
    if (!f.tipo) e.tipo = 'Seleccione el tipo de promoción. Ejemplo: Descuento %';
    if (CON_VALOR.includes(f.tipo)) {
      const v = String(f.valor).trim();
      if (!/^\d{1,6}(\.\d{1,2})?$/.test(v) || Number(v) <= 0) {
        e.valor = f.tipo === 'Descuento %' ? 'Ingrese el porcentaje de descuento. Ejemplo: 20' : 'Ingrese el monto en soles con punto decimal. Ejemplo: 10.00';
      } else if (f.tipo === 'Descuento %' && Number(v) > 90) e.valor = 'El descuento no puede superar el 90 %. Ejemplo: 20';
    }
  }
  if (paso === 2) {
    if (!f.conf1) e.conf1 = 'Marque la casilla para confirmar que revisó marcas, tipo y valor.';
    if (!f.conf2) e.conf2 = 'Marque la casilla para confirmar la vigencia y los canales.';
  }
  return e;
}

export default function PromocionWizard() {
  useTitulo('Nueva promoción');
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { preferencias } = usePreferencias();
  const [paso, setPaso] = useState(0);
  const [marcas, setMarcas] = useState([]);
  const [errores, setErrores] = useState({});
  const [confirmar, setConfirmar] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const tituloPaso = useRef(null);
  const primeraVez = useRef(true);
  const [f, setF] = useState({
    nombre: '', codigo: '', fecha_inicio: '', fecha_fin: '', prioridad: 'Media', canales: ['Tienda física'],
    marcas: [], tipo: 'Descuento %', valor: '', conf1: false, conf2: false,
  });

  useEffect(() => { api.get('/catalogos').then((c) => setMarcas(c.marcas)).catch(() => {}); }, []);
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return; }
    tituloPaso.current?.focus();
  }, [paso]);

  const cambiar = (c, v) => {
    setF((x) => ({ ...x, [c]: v }));
    if (errores[c]) setErrores((e) => { const n = { ...e }; delete n[c]; return n; });
  };
  const alternar = (c, valor) => cambiar(c, f[c].includes(valor) ? f[c].filter((x) => x !== valor) : [...f[c], valor]);

  function siguiente(e) {
    e.preventDefault();
    const err = validarPaso(paso, f);
    setErrores(err);
    if (Object.keys(err).length) return;
    if (paso < 2) setPaso(paso + 1);
    else setConfirmar(true);
  }

  async function publicar() {
    setPublicando(true);
    try {
      const r = await api.post('/promociones', {
        nombre: f.nombre, codigo: f.codigo.trim().toUpperCase(), fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin,
        prioridad: f.prioridad, canales: f.canales, marcas: f.marcas, tipo: f.tipo, valor: f.valor,
      });
      mostrar(`${r.mensaje} (código ${r.codigo}, estado ${r.estado}).`, 'exito');
      navigate('/promociones');
    } catch (ex) {
      setConfirmar(false);
      setPublicando(false);
      if (ex.errores) {
        setErrores(ex.errores);
        if (ex.errores.nombre || ex.errores.codigo || ex.errores.fecha_inicio || ex.errores.fecha_fin || ex.errores.canales || ex.errores.prioridad) setPaso(0);
        else if (ex.errores.marcas || ex.errores.tipo || ex.errores.valor) setPaso(1);
      } else mostrar(ex.message, 'error');
    }
  }

  const p = (c, o) => propsCampo(c, errores, o);
  const sim = simular(f.tipo, f.valor);
  const nombresMarcas = marcas.filter((m) => f.marcas.includes(m.id)).map((m) => m.nombre);

  return (
    <>
      <Migas items={[{ texto: 'Promociones', a: '/promociones' }, { texto: 'Nueva promoción' }]} />
      <div className="cabecera-pagina">
        <div>
          <h1>Registrar Promoción Comercial</h1>
          <p>Configure y publique la promoción en 3 pasos.</p>
        </div>
      </div>

      <nav aria-label="Progreso de la promoción">
        <ol className="pasos">
          {PASOS.map((t, i) => (
            <li key={t} className={`paso${i < paso ? ' hecho' : ''}`} aria-current={i === paso ? 'step' : undefined}>
              <span className="paso-num" aria-hidden="true">{i < paso ? <Icon name="check" /> : i + 1}</span>
              <span>
                Paso {i + 1}: {t}
                <span className="sr-only">{i < paso ? ' (completado)' : i === paso ? ' (paso actual)' : ' (pendiente)'}</span>
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <ResumenErrores errores={errores} etiquetas={ETIQUETAS} titulo="No se puede continuar" />

      <form onSubmit={siguiente} noValidate data-atajo-guardar>
        <div className="wizard-grid">
          <section className="tarjeta" aria-labelledby="titulo-paso">
            <h2 id="titulo-paso" ref={tituloPaso} tabIndex={-1} style={{ marginBottom: '1rem' }}>
              Paso {paso + 1}: {PASOS[paso]}
            </h2>
            {preferencias.ayuda_formularios && paso < 2 && (
              <p className="linea-ayuda"><Icon name="info" /><span>Los campos con <span aria-hidden="true">*</span><span className="sr-only">asterisco</span> son obligatorios.</span></p>
            )}

            {paso === 0 && (
              <>
                <div className="form-grid">
                  <div className="campo">
                    <label htmlFor="campo-nombre">Nombre de la promoción <Requerido /></label>
                    <input {...p('nombre', { requerido: true })} className="control" type="text" maxLength={120} placeholder="Ej: Campaña escolar" value={f.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
                    <ErrorCampo campo="nombre" error={errores.nombre} />
                  </div>
                  <div className="campo">
                    <label htmlFor="campo-codigo">Código (opcional)</label>
                    <input {...p('codigo', { ayuda: true })} className="control" type="text" maxLength={20} placeholder="Ej: ESCOLAR26" value={f.codigo} onChange={(e) => cambiar('codigo', e.target.value)} />
                    <p className="ayuda-campo" id="ayuda-codigo">Si lo deja vacío se generará automáticamente.</p>
                    <ErrorCampo campo="codigo" error={errores.codigo} />
                  </div>
                  <div className="campo">
                    <label htmlFor="campo-fecha_inicio">Fecha de inicio <Requerido /></label>
                    <input {...p('fecha_inicio', { requerido: true })} className="control" type="date" value={f.fecha_inicio} onChange={(e) => cambiar('fecha_inicio', e.target.value)} />
                    <ErrorCampo campo="fecha_inicio" error={errores.fecha_inicio} />
                  </div>
                  <div className="campo">
                    <label htmlFor="campo-fecha_fin">Fecha de fin <Requerido /></label>
                    <input {...p('fecha_fin', { requerido: true, ayuda: true })} className="control" type="date" min={f.fecha_inicio || undefined} value={f.fecha_fin} onChange={(e) => cambiar('fecha_fin', e.target.value)} />
                    <p className="ayuda-campo" id="ayuda-fecha_fin">Debe ser igual o posterior a la fecha de inicio.</p>
                    <ErrorCampo campo="fecha_fin" error={errores.fecha_fin} />
                  </div>
                  <div className="campo">
                    <label htmlFor="campo-prioridad">Prioridad <Requerido /></label>
                    <select {...p('prioridad', { requerido: true })} className="control" value={f.prioridad} onChange={(e) => cambiar('prioridad', e.target.value)}>
                      <option value="Alta">Alta</option>
                      <option value="Media">Media</option>
                      <option value="Baja">Baja</option>
                    </select>
                    <ErrorCampo campo="prioridad" error={errores.prioridad} />
                  </div>
                </div>
                <fieldset className="grupo" aria-describedby={errores.canales ? 'error-canales' : undefined}>
                  <legend>Canales de venta <Requerido /></legend>
                  <div className="opciones">
                    {CANALES.map((c, i) => (
                      <label className="check" key={c} htmlFor={i === 0 ? 'campo-canales' : `canal-${i}`}>
                        <input type="checkbox" id={i === 0 ? 'campo-canales' : `canal-${i}`} checked={f.canales.includes(c)} onChange={() => alternar('canales', c)} />
                        {c}
                      </label>
                    ))}
                  </div>
                  <ErrorCampo campo="canales" error={errores.canales} />
                </fieldset>
              </>
            )}

            {paso === 1 && (
              <>
                <fieldset className="grupo" aria-describedby={errores.marcas ? 'error-marcas' : undefined}>
                  <legend>Marcas participantes <Requerido /></legend>
                  <div className="opciones">
                    {marcas.map((m, i) => (
                      <label className="check" key={m.id} htmlFor={i === 0 ? 'campo-marcas' : `marca-${m.id}`}>
                        <input type="checkbox" id={i === 0 ? 'campo-marcas' : `marca-${m.id}`} checked={f.marcas.includes(m.id)} onChange={() => alternar('marcas', m.id)} />
                        {m.nombre}
                      </label>
                    ))}
                  </div>
                  <ErrorCampo campo="marcas" error={errores.marcas} />
                </fieldset>

                <div className="form-grid">
                  <fieldset className="grupo">
                    <legend>Descuentos</legend>
                    {DESCUENTOS.map((t, i) => (
                      <label className="check" key={t} htmlFor={i === 0 ? 'campo-tipo' : `tipo-d${i}`}>
                        <input type="radio" name="tipo" id={i === 0 ? 'campo-tipo' : `tipo-d${i}`} value={t} checked={f.tipo === t} onChange={() => cambiar('tipo', t)} />
                        {t}
                      </label>
                    ))}
                  </fieldset>
                  <fieldset className="grupo">
                    <legend>Combos y regalos</legend>
                    {COMBOS.map((t, i) => (
                      <label className="check" key={t} htmlFor={`tipo-c${i}`}>
                        <input type="radio" name="tipo" id={`tipo-c${i}`} value={t} checked={f.tipo === t} onChange={() => cambiar('tipo', t)} />
                        {t}
                      </label>
                    ))}
                  </fieldset>
                </div>
                <ErrorCampo campo="tipo" error={errores.tipo} />

                {CON_VALOR.includes(f.tipo) ? (
                  <div className="campo" style={{ maxWidth: '20rem' }}>
                    <label htmlFor="campo-valor">{etiquetaValor(f.tipo).texto} <Requerido /></label>
                    <input {...p('valor', { requerido: true })} className="control" type="text" inputMode="decimal" placeholder={etiquetaValor(f.tipo).ej} value={f.valor} onChange={(e) => cambiar('valor', e.target.value)} />
                    <ErrorCampo campo="valor" error={errores.valor} />
                  </div>
                ) : (
                  <p className="ayuda-campo">Este tipo de promoción no requiere un valor adicional.</p>
                )}
              </>
            )}

            {paso === 2 && (
              <>
                <dl className="resumen-lista">
                  <dt>Nombre</dt><dd>{f.nombre}</dd>
                  <dt>Código</dt><dd>{f.codigo.trim().toUpperCase() || 'Se generará automáticamente'}</dd>
                  <dt>Vigencia</dt><dd>{fecha(f.fecha_inicio)} – {fecha(f.fecha_fin)}</dd>
                  <dt>Prioridad</dt><dd>{f.prioridad}</dd>
                  <dt>Canales</dt><dd>{f.canales.join(', ')}</dd>
                  <dt>Marcas</dt><dd>{nombresMarcas.join(', ')}</dd>
                  <dt>Tipo</dt><dd>{f.tipo}{CON_VALOR.includes(f.tipo) ? ` · ${f.tipo === 'Descuento %' ? `${f.valor} %` : soles(f.valor)}` : ''}</dd>
                </dl>
                <fieldset className="grupo">
                  <legend>Antes de publicar <Requerido /></legend>
                  <label className="check" htmlFor="campo-conf1">
                    <input type="checkbox" id="campo-conf1" aria-describedby={errores.conf1 ? 'error-conf1' : undefined} checked={f.conf1} onChange={(e) => cambiar('conf1', e.target.checked)} />
                    Revisé las marcas, el tipo y el valor de la promoción.
                  </label>
                  <ErrorCampo campo="conf1" error={errores.conf1} />
                  <label className="check" htmlFor="campo-conf2">
                    <input type="checkbox" id="campo-conf2" aria-describedby={errores.conf2 ? 'error-conf2' : undefined} checked={f.conf2} onChange={(e) => cambiar('conf2', e.target.checked)} />
                    Confirmo la vigencia y los canales de venta.
                  </label>
                  <ErrorCampo campo="conf2" error={errores.conf2} />
                </fieldset>
              </>
            )}

            <div className="form-acciones">
              {paso === 0 ? (
                <button type="button" className="btn btn-secundario" onClick={() => navigate('/promociones')}>Cancelar</button>
              ) : (
                <button type="button" className="btn btn-secundario" onClick={() => { setErrores({}); setPaso(paso - 1); }}>
                  <Icon name="volver" />Volver
                </button>
              )}
              <button type="submit" className="btn btn-primario">
                {paso === 0 && 'Continuar al paso 2'}
                {paso === 1 && 'Continuar al paso 3'}
                {paso === 2 && 'Publicar promoción'}
              </button>
            </div>
          </section>

          <section className="preview-promo" aria-labelledby="titulo-preview">
            <h2 id="titulo-preview">Vista previa</h2>
            <p className="estado-texto">{f.nombre || 'Nombre de la promoción'} · {f.tipo}</p>
            {sim && CON_VALOR.includes(f.tipo) && !(Number(f.valor) > 0) && (
              <p>Ingrese el valor en el paso 2 para ver la simulación sobre un producto de S/ 100.</p>
            )}
            {sim && (!CON_VALOR.includes(f.tipo) || Number(f.valor) > 0) && (
              <>
                <p className="preview-precio">
                  <s aria-hidden="true">{soles(sim.antes)}</s>
                  <span aria-hidden="true">→</span>
                  <span aria-hidden="true">{soles(sim.despues)}</span>
                  <span className="sr-only">Precio antes {soles(sim.antes)}, precio con promoción {soles(sim.despues)}</span>
                </p>
                <p>{sim.nota}</p>
              </>
            )}
            <p className="estado-texto">
              {f.fecha_inicio ? `Vigencia: ${fecha(f.fecha_inicio)} – ${fecha(f.fecha_fin) || '…'}` : 'Defina la vigencia en el paso 1.'}
            </p>
          </section>
        </div>
      </form>

      {confirmar && (
        <Confirmacion
          titulo="Publicar promoción"
          mensaje={`¿Publicar la promoción «${f.nombre}»? Estará visible en ${f.canales.join(', ')} desde el ${fecha(f.fecha_inicio)}.`}
          textoConfirmar="Publicar"
          ocupado={publicando}
          onCancel={() => setConfirmar(false)}
          onConfirm={publicar}
        />
      )}
    </>
  );
}
