import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { TablaContenedor, useTitulo } from '../components/ui';
import { api } from '../api/client';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const fechaLocal = (iso) => { const [a, m, d] = iso.slice(0, 10).split('-').map(Number); return new Date(a, m - 1, d); };
const etiquetaDia = (iso) => DIAS[fechaLocal(iso).getDay()];
const nombreDia = (iso) => { const f = fechaLocal(iso); return `${DIAS_LARGOS[f.getDay()]} ${f.getDate()}`; };

/** «Hoy, 09:30», «Ayer, 18:00» o «28/10, 14:15», como en el prototipo. */
function cuando(valor) {
  const [d, h = ''] = String(valor).split(/[ T]/);
  const hoy = new Date(); const f = fechaLocal(d);
  const dif = Math.round((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - f) / 86400000);
  const hora = h.slice(0, 5);
  if (dif === 0) return `Hoy, ${hora}`;
  if (dif === 1) return `Ayer, ${hora}`;
  return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}, ${hora}`;
}

/**
 * Gráfico «Ingreso de Mercadería» como en el prototipo (Figma, Figura 48 del informe):
 * barras contiguas en rosado claro, el día de mayor ingreso en rojo oscuro, el valor
 * encima de cada barra y líneas guía tenues. La información no depende del color:
 * cada barra muestra su valor, el mayor va en negrita y el gráfico tiene una
 * descripción textual para lectores de pantalla.
 */
function GraficoIngresos({ datos }) {
  const max = Math.max(...datos.map((d) => d.total), 1);
  const mayor = datos.reduce((a, d) => (d.total > a.total ? d : a), datos[0]);
  const descripcion = `Ingreso de mercadería de los últimos 5 días: ${datos
    .map((d) => `${nombreDia(d.dia)}, ${d.total} unidades`).join('; ')}. Mayor ingreso: ${nombreDia(mayor.dia)}.`;
  return (
    <figure className="grafico grafico-dash">
      <div role="img" aria-label={descripcion}>
        <div className="grafico-area">
          {datos.map((d) => {
            const destacado = d === mayor && d.total > 0;
            return (
              <div className="grafico-col" key={d.dia}>
                <span className={`grafico-valor${destacado ? ' destacado' : ''}`}>{d.total}</span>
                <div className={`grafico-barra${destacado ? ' destacada' : ''}`} style={{ height: `${(d.total / max) * 78}%` }} />
              </div>
            );
          })}
        </div>
        <div className="grafico-ejes" aria-hidden="true">
          {datos.map((d) => <span key={d.dia}>{etiquetaDia(d.dia)}</span>)}
        </div>
      </div>
      <figcaption>Unidades ingresadas por día (últimos 5 días). La barra roja oscura con el valor en negrita es el día de mayor ingreso.</figcaption>
    </figure>
  );
}

export default function Dashboard() {
  useTitulo('Dashboard');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(setDatos).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <div className="cabecera-pagina">
        <div>
          <h1>Resumen Comercial</h1>
          <p>Vista general del estado de la tienda.</p>
        </div>
        <section aria-labelledby="titulo-acciones">
          <h2 id="titulo-acciones" className="sr-only">Acciones rápidas</h2>
          <div className="acciones-rapidas">
            <Link to="/inventario?ingreso=1" className="btn btn-secundario"><Icon name="inventario" />Registrar ingreso</Link>
            <Link to="/productos/nuevo" className="btn btn-secundario"><Icon name="mas" />Registrar Producto</Link>
            <Link to="/promociones/nueva" className="btn btn-secundario"><Icon name="promociones" />Nueva Promoción</Link>
          </div>
        </section>
      </div>

      {error && <div className="alerta-error" role="alert"><Icon name="error" /><span>{error}</span></div>}
      {!datos && !error && <p className="cargando" role="status">Cargando resumen…</p>}

      {datos && (
        <>
          <section aria-labelledby="titulo-indicadores">
            <h2 id="titulo-indicadores" className="sr-only">Indicadores principales</h2>
            <div className="kpis">
              <article className="tarjeta kpi">
                <span className="kpi-icono rojo"><Icon name="productos" /></span>
                <div>
                  <h3 className="kpi-etiqueta">Total Productos</h3>
                  <p className="kpi-valor">{datos.totales.productos}</p>
                  <p className="kpi-detalle">{datos.totales.activos} activos · {datos.totales.unidades.toLocaleString('es-PE')} unidades en stock</p>
                </div>
              </article>
              <article className="tarjeta kpi">
                <span className="kpi-icono rojo"><Icon name="promociones" /></span>
                <div>
                  <h3 className="kpi-etiqueta"><Link to="/promociones" className="kpi-enlace">Promociones Activas<span className="sr-only"> (ver promociones)</span></Link></h3>
                  <p className="kpi-valor">{datos.totales.promocionesActivas}</p>
                  <p className="kpi-detalle">
                    {datos.totales.promocionesPorVencer === 0 ? 'Ninguna termina en los próximos 3 días' : datos.totales.promocionesPorVencer === 1 ? '1 termina en los próximos 3 días' : `${datos.totales.promocionesPorVencer} terminan en los próximos 3 días`}
                  </p>
                </div>
              </article>
              <article className="tarjeta kpi">
                <span className="kpi-icono rojo"><Icon name="alerta" /></span>
                <div>
                  <h3 className="kpi-etiqueta">Alertas de Stock Bajo</h3>
                  <p className="kpi-valor">{datos.totales.stockBajo}</p>
                  <p className="kpi-detalle alerta">
                    <Icon name="alerta" />
                    Requiere atención inmediata
                  </p>
                </div>
              </article>
            </div>
          </section>

          <div className="grid-2 grid-dashboard">
            <section className="tarjeta tarjeta-actividad" aria-labelledby="titulo-actividad">
              <div className="tarjeta-cabecera">
                <h2 id="titulo-actividad">Actividad Reciente</h2>
                <Link to="/inventario?tab=movimientos" className="enlace-rojo">Ver todo<span className="sr-only"> el historial de movimientos</span></Link>
              </div>
              <TablaContenedor etiqueta="Tabla de actividad reciente">
                <table className="tabla-actividad tabla-apilable">
                  <thead>
                    <tr>
                      <th scope="col">Actividad</th>
                      <th scope="col">Responsable</th>
                      <th scope="col">Fecha/Hora</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.actividad.map((a) => {
                      const entrada = a.tipo === 'Entrada';
                      return (
                        <tr key={a.id}>
                          <td data-label="Actividad">
                            <span className="actividad">
                              <span className={`actividad-icono ${entrada ? 'entrada' : 'salida'}`} aria-hidden="true">
                                <Icon name={entrada ? 'camion' : 'alerta'} />
                              </span>
                              <span>
                                {entrada ? 'Ingreso de mercadería' : 'Salida de inventario'} - {a.producto}
                                <span className="actividad-detalle">{entrada ? '+' : '−'}{a.cantidad} und</span>
                              </span>
                            </span>
                          </td>
                          <td data-label="Responsable">{a.usuario}</td>
                          <td data-label="Fecha/Hora">{cuando(a.fecha)}</td>
                          <td data-label="Estado">
                            <span className={`badge ${entrada ? 'badge-activo' : 'badge-inactivo'}`}>
                              <Icon name={entrada ? 'check' : 'info'} />{entrada ? 'Completado' : 'Registrado'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {!datos.actividad.length && (
                      <tr><td colSpan={4} className="vacio">Aún no hay movimientos registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              </TablaContenedor>
            </section>

            <section className="tarjeta tarjeta-grafico" aria-labelledby="titulo-grafico">
              <div className="tarjeta-cabecera">
                <h2 id="titulo-grafico">Ingreso de Mercadería</h2>
              </div>
              <GraficoIngresos datos={datos.ingresos} />
            </section>
          </div>
        </>
      )}
    </>
  );
}
