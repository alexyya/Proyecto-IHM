import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import {
  ErrorCampo, EstadoBadge, GraficoBarras, IndicadorStock, Kpi, PanelPestana, Pestanas, TablaContenedor, useTitulo,
} from '../components/ui';
import { api, qs } from '../api/client';
import { useToast } from '../context/ToastContext';
import { aCSV, descargarArchivo, fecha, fechaHora, soles } from '../utils/formato';

const PESTANAS = [
  { id: 'productos', texto: 'Reporte de productos' },
  { id: 'inventario', texto: 'Reporte de inventario' },
  { id: 'promociones', texto: 'Reporte de promociones' },
];

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
function etiquetaDia(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return `${DIAS[new Date(a, m - 1, d).getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}
const n = (v) => Number(v || 0).toLocaleString('es-PE');
/** "+12 und", "−5 und" o "0 und" (el signo también se lee en texto, no solo con color). */
const conSigno = (v, signo) => (Number(v) === 0 ? '0 und' : `${signo}${n(Math.abs(v))} und`);
const hoyArchivo = () => new Date().toISOString().slice(0, 10);

/** Texto legible de los filtros aplicados, para guardarlo en el historial. */
function textoFiltros(filtro, catalogos) {
  const partes = [];
  const nombre = (lista, id) => (lista || []).find((x) => String(x.id) === String(id))?.nombre;
  if (filtro.categoria) partes.push(`Categoría: ${nombre(catalogos.categorias, filtro.categoria) || filtro.categoria}`);
  if (filtro.marca) partes.push(`Marca: ${nombre(catalogos.marcas, filtro.marca) || filtro.marca}`);
  if (filtro.estado) partes.push(`Estado: ${filtro.estado}`);
  return partes.length ? partes.join(' · ') : 'Sin filtros';
}

/** Guarda la exportación en el historial (tabla reportes) y avisa para actualizar la lista. */
function registrarReporte(tipo, filtro, datos, catalogos, registros) {
  return api.post('/reportes/historial', {
    tipo, desde: datos?.filtros?.desde || '', hasta: datos?.filtros?.hasta || '', filtros: textoFiltros(filtro, catalogos), registros,
  }).then(() => window.dispatchEvent(new CustomEvent('pv:reporte'))).catch(() => {});
}

/** Carga un reporte con filtros; los errores de validación se muestran junto a cada campo. */
function useReporte(ruta, inicial) {
  const { mostrar } = useToast();
  const [filtro, setFiltro] = useState(inicial);
  const [datos, setDatos] = useState(null);
  const [errores, setErrores] = useState({});
  const cargar = useCallback((f) => {
    setErrores({});
    api.get(`${ruta}${qs(f)}`)
      .then(setDatos)
      .catch((e) => {
        if (e.errores) {
          const err = {};
          Object.entries(e.errores).forEach(([k, v]) => { err[`${ruta.split('/').pop()}-${k}`] = v; });
          setErrores(err);
        } else mostrar(e.message, 'error');
      });
  }, [ruta, mostrar]);
  useEffect(() => { cargar(inicial); }, [cargar]); // eslint-disable-line react-hooks/exhaustive-deps
  return { filtro, setFiltro, datos, errores, cargar };
}

/** Formulario de filtros reutilizable (categoría, marca, estado y rango de fechas). */
function Filtros({ prefijo, filtro, setFiltro, errores, catalogos, onAplicar, onLimpiar, etiquetaFechas, campos }) {
  const cambiar = (c, v) => setFiltro({ ...filtro, [c]: v });
  const fechaProps = (c) => ({
    id: `${prefijo}-${c}`,
    'aria-invalid': errores[`${prefijo}-${c}`] ? 'true' : undefined,
    'aria-describedby': [`${prefijo}-fechas-ayuda`, errores[`${prefijo}-${c}`] ? `error-${prefijo}-${c}` : null].filter(Boolean).join(' '),
  });
  return (
    <section className="tarjeta" aria-labelledby={`${prefijo}-titulo-filtros`}>
      <h2 id={`${prefijo}-titulo-filtros`} className="titulo-filtros">Filtros</h2>
      <form className="filtros filtros-reporte" onSubmit={(e) => { e.preventDefault(); onAplicar(); }} aria-labelledby={`${prefijo}-titulo-filtros`}>
        {campos.includes('categoria') && (
          <div className="campo">
            <label htmlFor={`${prefijo}-categoria`}>Categoría</label>
            <select id={`${prefijo}-categoria`} className="control" value={filtro.categoria} onChange={(e) => cambiar('categoria', e.target.value)}>
              <option value="">Todas las categorías</option>
              {catalogos.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}
        {campos.includes('estado') && (
          <div className="campo">
            <label htmlFor={`${prefijo}-estado`}>Estado</label>
            <select id={`${prefijo}-estado`} className="control" value={filtro.estado} onChange={(e) => cambiar('estado', e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Programado">Programado</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        )}
        <div className="campo">
          <label htmlFor={`${prefijo}-marca`}>Marca</label>
          <select id={`${prefijo}-marca`} className="control" value={filtro.marca} onChange={(e) => cambiar('marca', e.target.value)}>
            <option value="">Todas las marcas</option>
            {catalogos.marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
        <div className="campo campo-fecha">
          <label htmlFor={`${prefijo}-desde`}>Desde</label>
          <input {...fechaProps('desde')} className="control" type="date" value={filtro.desde} onChange={(e) => cambiar('desde', e.target.value)} />
          <ErrorCampo campo={`${prefijo}-desde`} error={errores[`${prefijo}-desde`]} />
        </div>
        <div className="campo campo-fecha">
          <label htmlFor={`${prefijo}-hasta`}>Hasta</label>
          <input {...fechaProps('hasta')} className="control" type="date" value={filtro.hasta} onChange={(e) => cambiar('hasta', e.target.value)} />
          <ErrorCampo campo={`${prefijo}-hasta`} error={errores[`${prefijo}-hasta`]} />
        </div>
        <div className="grupo-botones">
          <button type="button" className="btn btn-secundario" onClick={onLimpiar}>Limpiar</button>
          <button type="submit" className="btn btn-primario"><Icon name="buscar" />Aplicar filtros</button>
        </div>
      </form>
      <p className="ayuda-campo" id={`${prefijo}-fechas-ayuda`}>{etiquetaFechas}</p>
    </section>
  );
}

function BotonExportar({ onClick, disabled, texto }) {
  return (
    <button type="button" className="btn btn-secundario" onClick={onClick} disabled={disabled}>
      <Icon name="descargar" />Exportar CSV<span className="sr-only"> del {texto}</span>
    </button>
  );
}

// ---------------------------------------------------------------- Reporte de productos
function ReporteProductos({ catalogos }) {
  const { mostrar } = useToast();
  const VACIO = { categoria: '', marca: '', desde: '', hasta: '' };
  const { filtro, setFiltro, datos, errores, cargar } = useReporte('/reportes/productos', VACIO);
  const filas = datos?.porCategoria || [];

  function exportar() {
    const t = [['Categoría', 'Productos', 'Activos', 'Unidades en stock', 'Valor del inventario (S/)']];
    filas.forEach((g) => t.push([g.categoria, g.productos, g.activos, g.unidades, g.valor.toFixed(2)]));
    t.push(['Total', datos.kpis.productos, datos.kpis.activos, filas.reduce((s, g) => s + g.unidades, 0), datos.kpis.valor.toFixed(2)]);
    descargarArchivo(`reporte_productos_${hoyArchivo()}.csv`, aCSV(t));
    registrarReporte('productos', filtro, datos, catalogos, datos.kpis.productos);
    mostrar(`Reporte de productos exportado (${filas.length} categorías).`, 'exito');
  }

  return (
    <>
      <Filtros prefijo="productos" filtro={filtro} setFiltro={setFiltro} errores={errores} catalogos={catalogos} campos={['categoria']}
        etiquetaFechas="Las fechas filtran por la fecha de registro del producto. Déjelas vacías para ver todo el catálogo."
        onAplicar={() => cargar(filtro)} onLimpiar={() => { setFiltro(VACIO); cargar(VACIO); }} />
      {!datos ? <p className="cargando" role="status">Cargando reporte…</p> : (
        <>
          <section aria-label="Indicadores del reporte de productos" className="kpis">
            <Kpi icono="productos" etiqueta="Productos" valor={n(datos.kpis.productos)} detalle={`${n(datos.kpis.activos)} activos · ${n(datos.kpis.productos - datos.kpis.activos)} inactivos`} />
            <Kpi icono="dashboard" color="verde" etiqueta="Categorías con productos" valor={n(datos.kpis.categorias)} detalle={`de ${catalogos.categorias.length} categorías registradas`} />
            <Kpi icono="reportes" color="ambar" etiqueta="Valor del inventario" valor={soles(datos.kpis.valor)} detalle="Precio × stock actual" />
          </section>
          <div className="grid-2">
            <section className="tarjeta" aria-labelledby="graf-productos">
              <h2 id="graf-productos">Productos por categoría</h2>
              {filas.length ? (
                <GraficoBarras
                  series={[{ clave: 'productos', nombre: 'Productos' }]}
                  datos={filas.map((g) => ({ etiqueta: g.categoria, valores: { productos: g.productos } }))}
                  descripcion={`Gráfico de barras, productos por categoría: ${filas.map((g) => `${g.categoria}, ${g.productos}`).join('; ')}.`}
                  pie="Número de productos registrados en cada categoría. Los datos también están en la tabla."
                />
              ) : <p className="vacio">No hay productos con estos filtros.</p>}
            </section>
            <section className="tarjeta" aria-labelledby="tabla-productos-titulo">
              <div className="tarjeta-cabecera">
                <h2 id="tabla-productos-titulo">Detalle por categoría</h2>
                <BotonExportar onClick={exportar} disabled={!filas.length} texto="reporte de productos" />
              </div>
              <TablaContenedor etiqueta="Tabla de productos por categoría">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Categoría</th>
                      <th scope="col" className="num">Productos</th>
                      <th scope="col" className="num">Unidades</th>
                      <th scope="col" className="num">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((g) => (
                      <tr key={g.categoria}>
                        <th scope="row">{g.categoria}</th>
                        <td className="num">{n(g.productos)}</td>
                        <td className="num">{n(g.unidades)} und</td>
                        <td className="num">{soles(g.valor)}</td>
                      </tr>
                    ))}
                    {!filas.length && <tr><td colSpan={4} className="vacio">Sin datos.</td></tr>}
                  </tbody>
                  {filas.length > 0 && (
                    <tfoot>
                      <tr>
                        <th scope="row">Total</th>
                        <td className="num">{n(datos.kpis.productos)}</td>
                        <td className="num">{n(filas.reduce((s, g) => s + g.unidades, 0))} und</td>
                        <td className="num">{soles(datos.kpis.valor)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </TablaContenedor>
            </section>
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Reporte de inventario
function ReporteInventario({ catalogos }) {
  const { mostrar } = useToast();
  const VACIO = { categoria: '', marca: '', desde: '', hasta: '' };
  const { filtro, setFiltro, datos, errores, cargar } = useReporte('/reportes/inventario', VACIO);
  const dias = datos?.porDia || [];
  const periodo = datos ? `del ${fecha(datos.filtros.desde)} al ${fecha(datos.filtros.hasta)}` : '';

  function exportar() {
    const t = [['Movimientos por día', '', '', ''], ['Día', 'Entradas (und)', 'Salidas (und)', 'Neto (und)']];
    dias.forEach((d) => t.push([fecha(d.dia), d.entradas, d.salidas, d.entradas - d.salidas]));
    t.push([], ['Productos con stock bajo', '', '', ''], ['Código', 'Producto', 'Stock mínimo (und)', 'Stock (und)']);
    datos.stockBajo.forEach((p) => t.push([p.codigo, p.nombre, p.stock_minimo, p.stock]));
    descargarArchivo(`reporte_inventario_${hoyArchivo()}.csv`, aCSV(t));
    registrarReporte('inventario', filtro, datos, catalogos, dias.length + datos.stockBajo.length);
    mostrar(`Reporte de inventario exportado (${dias.length} días, ${datos.stockBajo.length} productos con stock bajo).`, 'exito');
  }

  return (
    <>
      <Filtros prefijo="inventario" filtro={filtro} setFiltro={setFiltro} errores={errores} catalogos={catalogos} campos={['categoria']}
        etiquetaFechas="Las fechas filtran los movimientos (máximo 31 días). Si las deja vacías se muestran los últimos 7 días."
        onAplicar={() => cargar(filtro)} onLimpiar={() => { setFiltro(VACIO); cargar(VACIO); }} />
      {!datos ? <p className="cargando" role="status">Cargando reporte…</p> : (
        <>
          <section aria-label="Indicadores del reporte de inventario" className="kpis">
            <Kpi icono="inventario" etiqueta="Unidades en stock" valor={n(datos.kpis.unidades)} detalle={`${n(datos.kpis.productos)} productos activos`} />
            <Kpi icono="alerta" color="ambar" etiqueta="Productos con stock bajo" valor={n(datos.kpis.stockBajo)} aviso
              detalle={datos.kpis.stockBajo === 1 ? '1 producto requiere reposición' : `${n(datos.kpis.stockBajo)} productos requieren reposición`} />
            <Kpi icono="flechaArriba" color="verde" etiqueta="Entradas / salidas" valor={`+${n(datos.kpis.entradas)} / −${n(datos.kpis.salidas)}`} detalle={`Unidades ${periodo}`} />
          </section>
          <div className="grid-2">
            <section className="tarjeta" aria-labelledby="graf-inventario">
              <h2 id="graf-inventario">Entradas y salidas por día</h2>
              <GraficoBarras
                series={[{ clave: 'entradas', nombre: 'Entradas (relleno sólido)', estilo: 'solido' }, { clave: 'salidas', nombre: 'Salidas (relleno rayado)', estilo: 'rayado' }]}
                datos={dias.map((d) => ({ etiqueta: etiquetaDia(d.dia), valores: { entradas: d.entradas, salidas: d.salidas } }))}
                descripcion={`Gráfico de barras agrupadas, unidades por día ${periodo}: ${dias.map((d) => `${etiquetaDia(d.dia)}, ${d.entradas} de entrada y ${d.salidas} de salida`).join('; ')}.`}
                pie={`Unidades que entraron y salieron del almacén ${periodo}. Los datos también están en la tabla.`}
              />
            </section>
            <section className="tarjeta" aria-labelledby="tabla-inv-titulo">
              <div className="tarjeta-cabecera">
                <h2 id="tabla-inv-titulo">Movimientos por día</h2>
                <BotonExportar onClick={exportar} texto="reporte de inventario" />
              </div>
              <TablaContenedor etiqueta="Tabla de entradas y salidas por día">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Día</th>
                      <th scope="col" className="num">Entradas</th>
                      <th scope="col" className="num">Salidas</th>
                      <th scope="col" className="num">Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dias.map((d) => (
                      <tr key={d.dia}>
                        <th scope="row">{etiquetaDia(d.dia)}</th>
                        <td className="num">{conSigno(d.entradas, '+')}</td>
                        <td className="num">{conSigno(d.salidas, '−')}</td>
                        <td className="num">{conSigno(d.entradas - d.salidas, d.entradas - d.salidas > 0 ? '+' : '−')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TablaContenedor>
            </section>
          </div>
          <section className="tarjeta" aria-labelledby="titulo-stock-bajo" style={{ marginTop: '1.5rem' }}>
            <h2 id="titulo-stock-bajo">Productos con stock bajo</h2>
            <p className="conteo" aria-live="polite">{datos.stockBajo.length === 1 ? '1 producto' : `${datos.stockBajo.length} productos`} con stock igual o menor al mínimo</p>
            <TablaContenedor etiqueta="Tabla de productos con stock bajo">
              <table className="tabla-apilable">
                <thead>
                  <tr>
                    <th scope="col">Código</th>
                    <th scope="col">Producto</th>
                    <th scope="col">Categoría</th>
                    <th scope="col">Marca</th>
                    <th scope="col" className="num">Stock mínimo</th>
                    <th scope="col">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.stockBajo.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Código" className="codigo">{p.codigo}</td>
                      <td data-label="Producto">{p.nombre}</td>
                      <td data-label="Categoría">{p.categoria}</td>
                      <td data-label="Marca">{p.marca}</td>
                      <td data-label="Stock mínimo" className="num">{p.stock_minimo} und</td>
                      <td data-label="Stock"><IndicadorStock producto={p} /></td>
                    </tr>
                  ))}
                  {!datos.stockBajo.length && <tr><td colSpan={6} className="vacio">Ningún producto tiene stock bajo con estos filtros.</td></tr>}
                </tbody>
              </table>
            </TablaContenedor>
          </section>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Reporte de promociones
function situacion(p, hoy) {
  const dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  if (p.fecha_fin < hoy) return `Finalizó el ${fecha(p.fecha_fin)}`;
  if (p.fecha_inicio > hoy) {
    const d = dias(hoy, p.fecha_inicio);
    return `Inicia en ${d} ${d === 1 ? 'día' : 'días'}`;
  }
  const d = dias(hoy, p.fecha_fin);
  return d === 0 ? 'Vence hoy' : `Vence en ${d} ${d === 1 ? 'día' : 'días'}`;
}

function ReportePromociones({ catalogos }) {
  const { mostrar } = useToast();
  const VACIO = { estado: '', marca: '', desde: '', hasta: '' };
  const { filtro, setFiltro, datos, errores, cargar } = useReporte('/reportes/promociones', VACIO);
  const lista = datos?.promociones || [];

  function exportar() {
    const t = [['Código', 'Promoción', 'Tipo', 'Marcas', 'Inicio', 'Fin', 'Vigencia', 'Estado']];
    lista.forEach((p) => t.push([p.codigo, p.nombre, p.tipo, p.marcas || '', fecha(p.fecha_inicio), fecha(p.fecha_fin), situacion(p, datos.hoy), p.estado]));
    descargarArchivo(`reporte_promociones_${hoyArchivo()}.csv`, aCSV(t));
    registrarReporte('promociones', filtro, datos, catalogos, lista.length);
    mostrar(`Reporte de promociones exportado (${lista.length} promociones).`, 'exito');
  }

  return (
    <>
      <Filtros prefijo="promociones" filtro={filtro} setFiltro={setFiltro} errores={errores} catalogos={catalogos} campos={['estado']}
        etiquetaFechas="Las fechas muestran las promociones vigentes en algún día del periodo. Déjelas vacías para ver todas."
        onAplicar={() => cargar(filtro)} onLimpiar={() => { setFiltro(VACIO); cargar(VACIO); }} />
      {!datos ? <p className="cargando" role="status">Cargando reporte…</p> : (
        <>
          <section aria-label="Indicadores del reporte de promociones" className="kpis">
            <Kpi icono="promociones" etiqueta="Promociones" valor={n(datos.kpis.total)} detalle="Con los filtros aplicados" />
            <Kpi icono="check" color="verde" etiqueta="Activas" valor={n(datos.kpis.activas)} aviso={datos.kpis.porVencer > 0}
              detalle={datos.kpis.porVencer ? `${datos.kpis.porVencer} vence${datos.kpis.porVencer === 1 ? '' : 'n'} en los próximos 7 días` : 'Ninguna vence en los próximos 7 días'} />
            <Kpi icono="calendario" color="ambar" etiqueta="Programadas" valor={n(datos.kpis.programadas)} detalle="Inician en una fecha futura" />
          </section>
          <div className="grid-2">
            <section className="tarjeta" aria-labelledby="graf-promos">
              <h2 id="graf-promos">Promociones por estado</h2>
              <GraficoBarras
                series={[{ clave: 'total', nombre: 'Promociones' }]}
                datos={datos.porEstado.map((e) => ({ etiqueta: e.estado, valores: { total: e.total } }))}
                descripcion={`Gráfico de barras, promociones por estado: ${datos.porEstado.map((e) => `${e.estado}, ${e.total}`).join('; ')}.`}
                pie="Cantidad de promociones en cada estado. Los datos también están en la tabla."
              />
            </section>
            <section className="tarjeta" aria-labelledby="tabla-estado-titulo">
              <div className="tarjeta-cabecera">
                <h2 id="tabla-estado-titulo">Resumen por estado</h2>
                <BotonExportar onClick={exportar} disabled={!lista.length} texto="reporte de promociones" />
              </div>
              <TablaContenedor etiqueta="Tabla de promociones por estado">
                <table>
                  <thead>
                    <tr><th scope="col">Estado</th><th scope="col" className="num">Promociones</th></tr>
                  </thead>
                  <tbody>
                    {datos.porEstado.map((e) => (
                      <tr key={e.estado}><th scope="row"><EstadoBadge estado={e.estado} /></th><td className="num">{e.total}</td></tr>
                    ))}
                  </tbody>
                  <tfoot><tr><th scope="row">Total</th><td className="num">{datos.kpis.total}</td></tr></tfoot>
                </table>
              </TablaContenedor>
            </section>
          </div>
          <section className="tarjeta" aria-labelledby="titulo-lista-promos" style={{ marginTop: '1.5rem' }}>
            <h2 id="titulo-lista-promos">Promociones y vigencia</h2>
            <p className="conteo" aria-live="polite">{lista.length === 1 ? '1 promoción' : `${lista.length} promociones`}</p>
            <TablaContenedor etiqueta="Tabla de promociones con vigencia">
              <table className="tabla-apilable">
                <thead>
                  <tr>
                    <th scope="col">Código</th>
                    <th scope="col">Promoción</th>
                    <th scope="col">Marcas</th>
                    <th scope="col">Vigencia</th>
                    <th scope="col">Situación</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Código" className="codigo">{p.codigo}</td>
                      <td data-label="Promoción">{p.nombre}<br /><span className="texto-secundario">{p.tipo}</span></td>
                      <td data-label="Marcas">{p.marcas || '—'}</td>
                      <td data-label="Vigencia" className="sin-salto">{fecha(p.fecha_inicio)} – {fecha(p.fecha_fin)}</td>
                      <td data-label="Situación">{situacion(p, datos.hoy)}</td>
                      <td data-label="Estado"><EstadoBadge estado={p.estado} /></td>
                    </tr>
                  ))}
                  {!lista.length && <tr><td colSpan={6} className="vacio">No hay promociones con estos filtros.</td></tr>}
                </tbody>
              </table>
            </TablaContenedor>
          </section>
        </>
      )}
    </>
  );
}

const NOMBRE_TIPO = { productos: 'Productos', inventario: 'Inventario', promociones: 'Promociones' };

/** Historial: últimos reportes exportados (tabla reportes). */
function HistorialReportes() {
  const [filas, setFilas] = useState(null);
  const cargar = useCallback(() => { api.get('/reportes/historial').then(setFilas).catch(() => setFilas([])); }, []);
  useEffect(() => {
    cargar();
    window.addEventListener('pv:reporte', cargar);
    return () => window.removeEventListener('pv:reporte', cargar);
  }, [cargar]);
  return (
    <section className="tarjeta" aria-labelledby="titulo-historial" style={{ marginTop: '1.5rem' }}>
      <h2 id="titulo-historial">Últimos reportes generados</h2>
      <p>Cada vez que exporta un reporte, queda registrado aquí con sus filtros.</p>
      {filas === null ? <p>Cargando historial…</p> : !filas.length ? <p>Aún no se ha exportado ningún reporte.</p> : (
        <TablaContenedor etiqueta="Historial de reportes generados">
          <table>
            <caption className="sr-only">Últimos {filas.length} reportes generados</caption>
            <thead><tr><th scope="col">Fecha y hora</th><th scope="col">Reporte</th><th scope="col">Periodo</th><th scope="col">Filtros</th><th scope="col">Registros</th><th scope="col">Generado por</th></tr></thead>
            <tbody>
              {filas.map((r) => (
                <tr key={r.id}>
                  <td>{fechaHora(r.generado_en)}</td>
                  <td>{NOMBRE_TIPO[r.tipo] || r.tipo}</td>
                  <td>{r.fecha_desde ? `${fecha(r.fecha_desde)} – ${fecha(r.fecha_hasta)}` : 'Todo el periodo'}</td>
                  <td>{r.filtros}</td>
                  <td>{n(r.registros)}</td>
                  <td>{r.usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablaContenedor>
      )}
    </section>
  );
}

export default function Reportes() {
  const [params, setParams] = useSearchParams();
  const pestana = PESTANAS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'productos';
  useTitulo(PESTANAS.find((t) => t.id === pestana).texto);
  const [catalogos, setCatalogos] = useState({ categorias: [], marcas: [] });

  useEffect(() => {
    api.get('/catalogos').then(setCatalogos).catch(() => {});
  }, []);

  return (
    <>
      <div className="cabecera-pagina">
        <div>
          <h1>Reportes Comerciales</h1>
          <p>Genere y exporte reportes de productos, inventario y promociones con indicadores y gráficos.</p>
        </div>
      </div>
      <Pestanas idBase="rep" etiqueta="Tipos de reporte" pestanas={PESTANAS} activa={pestana}
        onCambiar={(id) => setParams(id === 'productos' ? {} : { tab: id }, { replace: true })} />
      <PanelPestana idBase="rep" id="productos" activa={pestana}><ReporteProductos catalogos={catalogos} /></PanelPestana>
      <PanelPestana idBase="rep" id="inventario" activa={pestana}><ReporteInventario catalogos={catalogos} /></PanelPestana>
      <PanelPestana idBase="rep" id="promociones" activa={pestana}><ReportePromociones catalogos={catalogos} /></PanelPestana>
      <HistorialReportes />
    </>
  );
}
