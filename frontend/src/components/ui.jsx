// Componentes de interfaz reutilizables
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { esStockBajo } from '../utils/formato';
import { api } from '../api/client';

/** Actualiza el título del documento por ruta (WCAG 2.4.2). */
export function useTitulo(titulo) {
  useEffect(() => {
    document.title = `${titulo} – Sistema de Gestión Comercial`;
  }, [titulo]);
}

/** Indicador de stock: color + ícono + texto (nunca solo color). */
export function IndicadorStock({ producto }) {
  const bajo = esStockBajo(producto);
  if (bajo) {
    return (
      <span className="stock stock-bajo">
        <Icon name="alerta" />
        {producto.stock} und <span className="stock-texto">· Stock bajo</span>
      </span>
    );
  }
  return (
    <span className="stock stock-normal">
      <span className="punto" aria-hidden="true" />
      {producto.stock} und
    </span>
  );
}

/**
 * Miniatura de 40 px del producto. Si tiene imagen, la descarga con el token de
 * sesión (GET /api/productos/:id/imagen); si no, muestra un ícono de imagen.
 * Es decorativa: el nombre del producto ya está escrito al lado.
 */
export function MiniaturaProducto({ producto }) {
  const [url, setUrl] = useState(null);
  const tiene = Number(producto.tiene_imagen) === 1;
  useEffect(() => {
    if (!tiene) { setUrl(null); return undefined; }
    let activo = true;
    let creada = null;
    api.blob(`/productos/${producto.id}/imagen`)
      .then((b) => { if (activo) { creada = URL.createObjectURL(b); setUrl(creada); } })
      .catch(() => {});
    return () => { activo = false; if (creada) URL.revokeObjectURL(creada); };
  }, [producto.id, tiene]);
  if (url) return <img className="mini-producto" src={url} alt="" />;
  return <span className="mini-producto vacia" aria-hidden="true"><Icon name="imagen" /></span>;
}

/** Insignia de estado con ícono y texto. */
export function EstadoBadge({ estado }) {
  const mapa = {
    Activo: ['badge-activo', 'check'],
    Programado: ['badge-programado', 'calendario'],
    Inactivo: ['badge-inactivo', 'cerrar'],
  };
  const [clase, icono] = mapa[estado] || mapa.Inactivo;
  return (
    <span className={`badge ${clase}`}>
      <Icon name={icono} />
      {estado}
    </span>
  );
}

/** Interruptor accesible con texto de estado visible. */
export function Switch({ id, checked, onChange, disabled = false, labelledBy, describedBy, textos = ['Activado', 'Desactivado'] }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className="switch-pista" aria-hidden="true" />
      <span className="switch-estado" aria-hidden="true">{checked ? textos[0] : textos[1]}</span>
    </button>
  );
}

/**
 * Resumen de errores (WCAG 3.3.1): aparece arriba del formulario, recibe el foco
 * y enlaza a cada campo inválido.
 */
export function ResumenErrores({ errores, etiquetas, titulo = 'No se pudo guardar' }) {
  const ref = useRef(null);
  const claves = Object.keys(errores || {});
  useEffect(() => {
    if (claves.length && ref.current) ref.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errores]);
  if (!claves.length) return null;
  const irA = (e, campo) => {
    e.preventDefault();
    const el = document.getElementById(`campo-${campo}`);
    if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); }
  };
  return (
    <div className="resumen-errores" role="alert" tabIndex={-1} ref={ref} aria-labelledby="resumen-errores-titulo">
      <h2 id="resumen-errores-titulo">
        <Icon name="error" />
        {titulo}: revisa {claves.length} {claves.length === 1 ? 'campo' : 'campos'}
      </h2>
      <ul>
        {claves.map((c) => (
          <li key={c}>
            <a href={`#campo-${c}`} onClick={(e) => irA(e, c)}>
              {etiquetas[c] || c}: {errores[c]}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mensaje de error bajo un campo, enlazado con aria-describedby. */
export function ErrorCampo({ campo, error }) {
  if (!error) return null;
  return (
    <p className="error-campo" id={`error-${campo}`}>
      <Icon name="error" />
      <span><span className="sr-only">Error: </span>{error}</span>
    </p>
  );
}

/** Props ARIA estándar para un control con posible error y ayuda. */
export function propsCampo(campo, errores, { requerido = false, ayuda = false } = {}) {
  const desc = [ayuda ? `ayuda-${campo}` : null, errores?.[campo] ? `error-${campo}` : null].filter(Boolean).join(' ');
  return {
    id: `campo-${campo}`,
    name: campo,
    'aria-invalid': errores?.[campo] ? 'true' : undefined,
    'aria-describedby': desc || undefined,
    'aria-required': requerido ? 'true' : undefined,
  };
}

export function Requerido() {
  return <span className="req" aria-hidden="true">*</span>;
}

export function Migas({ items }) {
  return (
    <nav className="migas" aria-label="Ruta de navegación">
      <ol>
        {items.map((it, i) => (
          <li key={it.texto}>
            {i === items.length - 1
              ? <span aria-current="page">{it.texto}</span>
              : (it.a ? <Link to={it.a}>{it.texto}</Link> : <span>{it.texto}</span>)}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Contenedor de tabla desplazable accesible por teclado. */
export function TablaContenedor({ etiqueta, children }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className="tabla-contenedor" role="region" aria-label={etiqueta} tabIndex={0}>
      {children}
    </div>
  );
}

/**
 * Pestañas accesibles (patrón ARIA tablist): flechas ← →, Inicio y Fin.
 * Los paneles se crean con <PanelPestana> usando el mismo idBase.
 */
export function Pestanas({ idBase, etiqueta, pestanas, activa, onCambiar }) {
  const refs = useRef({});
  function alTeclear(e, i) {
    let n = null;
    if (e.key === 'ArrowRight') n = (i + 1) % pestanas.length;
    if (e.key === 'ArrowLeft') n = (i - 1 + pestanas.length) % pestanas.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = pestanas.length - 1;
    if (n !== null) {
      e.preventDefault();
      onCambiar(pestanas[n].id);
      refs.current[pestanas[n].id]?.focus();
    }
  }
  return (
    <div className="pestanas" role="tablist" aria-label={etiqueta}>
      {pestanas.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[t.id] = el; }}
          type="button"
          role="tab"
          id={`tab-${idBase}-${t.id}`}
          className="pestana"
          aria-selected={activa === t.id}
          aria-controls={`panel-${idBase}-${t.id}`}
          tabIndex={activa === t.id ? 0 : -1}
          onClick={() => onCambiar(t.id)}
          onKeyDown={(e) => alTeclear(e, i)}
        >
          {t.icono && <Icon name={t.icono} />}
          {t.texto}
        </button>
      ))}
    </div>
  );
}

export function PanelPestana({ idBase, id, activa, children }) {
  return (
    <div role="tabpanel" id={`panel-${idBase}-${id}`} aria-labelledby={`tab-${idBase}-${id}`} hidden={activa !== id}>
      {activa === id ? children : null}
    </div>
  );
}

/**
 * Gráfico de barras accesible: cada barra muestra su valor en texto, las series
 * se distinguen por relleno (sólido / rayado) y por la leyenda con texto, y la
 * misma información está en una tabla. El área tiene role="img" con un resumen.
 * series: [{ clave, nombre, estilo: 'solido' | 'rayado' }]
 * datos:  [{ etiqueta, valores: { [clave]: número } }]
 */
export function GraficoBarras({ series, datos, descripcion, pie, formato = (n) => n.toLocaleString('es-PE') }) {
  const max = Math.max(1, ...datos.flatMap((d) => series.map((s) => Number(d.valores[s.clave] || 0))));
  return (
    <figure className="grafico">
      {series.length > 1 && (
        <ul className="grafico-leyenda" aria-hidden="true">
          {series.map((s) => (
            <li key={s.clave}><span className={`muestra barra-${s.estilo || 'solido'}`} />{s.nombre}</li>
          ))}
        </ul>
      )}
      <div role="img" aria-label={descripcion}>
        <div className="grafico-area">
          {datos.map((d) => (
            <div className="grafico-col" key={d.etiqueta}>
              <div className="grafico-grupo">
                {series.map((s) => {
                  const v = Number(d.valores[s.clave] || 0);
                  return (
                    <div className="grafico-pila" key={s.clave}>
                      <span className="grafico-valor">{formato(v)}</span>
                      <div className={`grafico-barra barra-${s.estilo || 'solido'}`} style={{ height: `${(v / max) * 80}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="grafico-ejes" aria-hidden="true">
          {datos.map((d) => <span key={d.etiqueta}>{d.etiqueta}</span>)}
        </div>
      </div>
      {pie && <figcaption>{pie}</figcaption>}
    </figure>
  );
}

/**
 * Paginación accesible: botones con aria-label y aria-current="page" en la
 * página actual. Muestra «Mostrando X a Y de N <nombre>».
 */
export function Paginacion({ pagina, total, porPagina, onCambiar, nombre = 'registros', etiqueta = 'Paginación' }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const desde = total ? (pagina - 1) * porPagina + 1 : 0;
  const hasta = Math.min(total, pagina * porPagina);
  const ir = (n) => onCambiar(Math.min(paginas, Math.max(1, n)));
  return (
    <div className="paginacion">
      <p className="paginacion-texto">Mostrando {desde} a {hasta} de {total} {nombre}</p>
      {paginas > 1 && (
        <nav aria-label={etiqueta}>
          <ul>
            <li><button type="button" className="pag-btn" onClick={() => ir(1)} disabled={pagina === 1} aria-label="Primera página">«</button></li>
            <li><button type="button" className="pag-btn" onClick={() => ir(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior">‹</button></li>
            {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <button
                  type="button"
                  className="pag-btn"
                  aria-label={`Página ${n}`}
                  aria-current={n === pagina ? 'page' : undefined}
                  onClick={() => ir(n)}
                >{n}</button>
              </li>
            ))}
            <li><button type="button" className="pag-btn" onClick={() => ir(pagina + 1)} disabled={pagina === paginas} aria-label="Página siguiente">›</button></li>
            <li><button type="button" className="pag-btn" onClick={() => ir(paginas)} disabled={pagina === paginas} aria-label="Última página">»</button></li>
          </ul>
        </nav>
      )}
    </div>
  );
}

/** Tarjeta de indicador (KPI) con ícono decorativo, valor y detalle en texto. */
export function Kpi({ icono, color = 'rojo', etiqueta, valor, detalle, aviso = false }) {
  return (
    <article className="tarjeta kpi">
      <span className={`kpi-icono ${color}`}><Icon name={icono} /></span>
      <div>
        <h3 className="kpi-etiqueta">{etiqueta}</h3>
        <p className="kpi-valor">{valor}</p>
        {detalle && (
          <p className={`kpi-detalle${aviso ? ' aviso' : ''}`}>
            {aviso && <Icon name="alerta" />}
            {detalle}
          </p>
        )}
      </div>
    </article>
  );
}
