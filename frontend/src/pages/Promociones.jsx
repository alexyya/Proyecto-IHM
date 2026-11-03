import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { Confirmacion } from '../components/Modal';
import { EstadoBadge, TablaContenedor, useTitulo } from '../components/ui';
import { api, qs } from '../api/client';
import { useToast } from '../context/ToastContext';
import { fecha } from '../utils/formato';

export function describirValor(p) {
  const v = Number(p.valor);
  if (p.tipo === 'Descuento %') return `${v} %`;
  if (['Monto fijo', 'Precio especial', 'Combo'].includes(p.tipo)) return `S/ ${v.toFixed(2)}`;
  return '—';
}

export default function Promociones() {
  useTitulo('Promociones');
  const { mostrar } = useToast();
  const [filtro, setFiltro] = useState({ q: '', estado: '' });
  const [aplicado, setAplicado] = useState({ q: '', estado: '' });
  const [promos, setPromos] = useState(null);
  const [mostrado, setMostrado] = useState({ q: '', estado: '' });
  const [error, setError] = useState('');
  const [aEliminar, setAEliminar] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback((f) => {
    api.get(`/promociones${qs(f)}`).then((l) => { setPromos(l); setMostrado(f); }).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { cargar(aplicado); }, [aplicado, cargar]);

  async function eliminar() {
    setOcupado(true);
    try {
      const r = await api.del(`/promociones/${aEliminar.id}`);
      mostrar(r.mensaje, 'exito');
      cargar(aplicado);
    } catch (e) {
      mostrar(e.message, 'error');
    } finally {
      setAEliminar(null);
      setOcupado(false);
    }
  }

  return (
    <>
      <div className="cabecera-pagina">
        <div>
          <h1>Gestión de Promociones</h1>
          <p>Cree y administre las campañas promocionales por marca y canal.</p>
        </div>
        <Link to="/promociones/nueva" className="btn btn-secundario"><Icon name="mas" />Crear nueva promoción</Link>
      </div>

      <section className="tarjeta" aria-labelledby="titulo-filtro-promo">
        <h2 id="titulo-filtro-promo" className="sr-only">Filtros de promociones</h2>
        <form className="filtros" role="search" aria-label="Filtrar promociones" onSubmit={(e) => { e.preventDefault(); setAplicado({ ...filtro }); }}>
          <div className="campo campo-busqueda">
            <label htmlFor="buscar-promo">Buscar promoción</label>
            <div className="con-icono">
              <Icon name="buscar" />
              <input id="buscar-promo" data-buscador className="control" type="search" placeholder="Ej: VERANO20 o Combo parrillero"
                value={filtro.q} onChange={(e) => setFiltro({ ...filtro, q: e.target.value })} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="filtro-estado">Estado</label>
            <select id="filtro-estado" className="control" value={filtro.estado} onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}>
              <option value="">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="Programado">Programado</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
          <div className="grupo-botones">
            <button type="button" className="btn btn-secundario" onClick={() => { setFiltro({ q: '', estado: '' }); setAplicado({ q: '', estado: '' }); }}>Limpiar</button>
            <button type="submit" className="btn btn-primario"><Icon name="buscar" />Filtrar</button>
          </div>
        </form>
      </section>

      <section className="tarjeta" aria-labelledby="titulo-lista-promo">
        <h2 id="titulo-lista-promo">Lista de promociones</h2>
        <p className="conteo" aria-live="polite">
          {promos ? `Mostrando ${promos.length} ${promos.length === 1 ? 'promoción' : 'promociones'} · Estado: ${mostrado.estado || 'Todos'}${mostrado.q ? ` · Búsqueda: «${mostrado.q}»` : ''}` : 'Cargando promociones…'}
        </p>
        {error && <div className="alerta-error" role="alert"><Icon name="error" /><span>{error}</span></div>}
        <TablaContenedor etiqueta="Tabla de promociones">
          <table>
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Promoción</th>
                <th scope="col">Tipo</th>
                <th scope="col">Valor</th>
                <th scope="col">Vigencia</th>
                <th scope="col">Marcas</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {promos?.map((p) => (
                <tr key={p.id}>
                  <td className="codigo">{p.codigo}</td>
                  <td>{p.nombre}<br /><span className="estado-texto">Prioridad {p.prioridad} · {String(p.canales || '').split(',').join(', ')}</span></td>
                  <td>{p.tipo}</td>
                  <td className="sin-salto">{describirValor(p)}</td>
                  <td><span className="sin-salto">{fecha(p.fecha_inicio)} –</span> <span className="sin-salto">{fecha(p.fecha_fin)}</span></td>
                  <td>{p.marcas || '—'}</td>
                  <td><EstadoBadge estado={p.estado} /></td>
                  <td>
                    <button type="button" className="btn-icono peligro" aria-label={`Eliminar promoción ${p.nombre}`} title="Eliminar" onClick={() => setAEliminar(p)}>
                      <Icon name="eliminar" />
                    </button>
                  </td>
                </tr>
              ))}
              {promos && !promos.length && <tr><td colSpan={8} className="vacio">No se encontraron promociones.</td></tr>}
            </tbody>
          </table>
        </TablaContenedor>
      </section>

      {aEliminar && (
        <Confirmacion
          titulo="Eliminar promoción"
          mensaje={`¿Desea eliminar la promoción ${aEliminar.nombre} (${aEliminar.codigo})?`}
          textoConfirmar="Eliminar"
          peligro
          ocupado={ocupado}
          onCancel={() => { setAEliminar(null); mostrar('Eliminación cancelada. No se aplicaron cambios.', 'info'); }}
          onConfirm={eliminar}
        />
      )}
    </>
  );
}
