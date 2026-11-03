import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { Confirmacion } from '../components/Modal';
import {
  EstadoBadge, IndicadorStock, MiniaturaProducto, Paginacion, PanelPestana, Pestanas, TablaContenedor, useTitulo,
} from '../components/ui';
import { PanelCategorias, PanelMarcas, PanelModelos } from './Catalogos';
import ImportarProductos from '../components/ImportarProductos';
import { api, avisarCambioStock, qs } from '../api/client';
import { useToast } from '../context/ToastContext';
import { fecha } from '../utils/formato';

const FILTRO_VACIO = { q: '', categoria: '', marca: '', estado: '' };
const TEXTO_ESTADO = { '': 'Todos', Activo: 'Activos', Inactivo: 'Inactivos' };
const POR_PAGINA = 8;

const PESTANAS = [
  { id: 'productos', texto: 'Productos', icono: 'productos' },
  { id: 'marcas', texto: 'Marcas' },
  { id: 'modelos', texto: 'Modelos' },
  { id: 'categorias', texto: 'Categorías y subcategorías' },
];

export default function Productos() {
  const [params, setParams] = useSearchParams();
  const pestana = PESTANAS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'productos';
  useTitulo(pestana === 'productos' ? 'Productos' : `Productos › ${PESTANAS.find((t) => t.id === pestana).texto}`);
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [catalogos, setCatalogos] = useState({ categorias: [], subcategorias: [], marcas: [], modelos: [] });
  const [filtro, setFiltro] = useState(FILTRO_VACIO);      // lo que el usuario escribe
  const [aplicado, setAplicado] = useState(FILTRO_VACIO);  // lo que se filtró con el botón
  const [productos, setProductos] = useState(null);
  const [mostrado, setMostrado] = useState(FILTRO_VACIO); // filtro que produjo la lista visible
  const [error, setError] = useState('');
  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [pagina, setPagina] = useState(1);

  const cargarCatalogos = useCallback(() => {
    api.get('/catalogos').then(setCatalogos).catch((e) => mostrar(e.message, 'error'));
  }, [mostrar]);
  useEffect(() => { cargarCatalogos(); }, [cargarCatalogos]);

  const cambiarPestana = (id) => setParams(id === 'productos' ? {} : { tab: id }, { replace: true });

  const cargar = useCallback((f) => {
    setError('');
    api.get(`/productos${qs(f)}`)
      .then((lista) => {
        setProductos(lista);
        setMostrado(f);
        // si se eliminó el último de la página, volver a una página válida
        setPagina((pg) => Math.min(pg, Math.max(1, Math.ceil(lista.length / POR_PAGINA))));
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { cargar(aplicado); }, [aplicado, cargar]);

  const filtrar = (e) => { e.preventDefault(); setPagina(1); setAplicado({ ...filtro }); };
  const limpiar = () => { setPagina(1); setFiltro(FILTRO_VACIO); setAplicado(FILTRO_VACIO); };
  const visibles = productos ? productos.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA) : null;
  const cambiarPagina = (n) => {
    setPagina(n);
    document.getElementById('titulo-lista')?.scrollIntoView?.({ block: 'start' });
  };

  const nombreCategoria = catalogos.categorias.find((c) => String(c.id) === String(mostrado.categoria))?.nombre || 'Todas';
  const nombreMarca = catalogos.marcas.find((m) => String(m.id) === String(mostrado.marca))?.nombre || 'Todas';

  const cancelarEliminacion = () => {
    setAEliminar(null);
    mostrar('Eliminación cancelada. No se aplicaron cambios.', 'info');
  };

  async function confirmarEliminacion() {
    setEliminando(true);
    try {
      const r = await api.del(`/productos/${aEliminar.id}`);
      setAEliminar(null);
      mostrar(r.mensaje, 'exito');
      avisarCambioStock();
      cargar(aplicado);
    } catch (e) {
      setAEliminar(null);
      mostrar(e.message, 'error');
    } finally {
      setEliminando(false);
    }
  }

  return (
    <>
      <div className="cabecera-pagina">
        <div>
          <h1>Gestión de Productos</h1>
          <p>Consulte, filtre y administre el catálogo de productos, marcas, modelos y categorías.</p>
        </div>
        <div className="grupo-botones">
          <ImportarProductos catalogos={catalogos} onImportado={() => { setPagina(1); cargar(aplicado); avisarCambioStock(); }} />
          <Link to="/productos/nuevo" className="btn btn-secundario"><Icon name="mas" />Registrar producto</Link>
        </div>
      </div>

      <Pestanas idBase="gp" etiqueta="Secciones de gestión de productos" pestanas={PESTANAS} activa={pestana} onCambiar={cambiarPestana} />

      <PanelPestana idBase="gp" id="marcas" activa={pestana}>
        <PanelMarcas catalogos={catalogos} onCambio={cargarCatalogos} />
      </PanelPestana>
      <PanelPestana idBase="gp" id="modelos" activa={pestana}>
        <PanelModelos catalogos={catalogos} onCambio={cargarCatalogos} />
      </PanelPestana>
      <PanelPestana idBase="gp" id="categorias" activa={pestana}>
        <PanelCategorias catalogos={catalogos} onCambio={cargarCatalogos} />
      </PanelPestana>

      <PanelPestana idBase="gp" id="productos" activa={pestana}>
        <section className="tarjeta" aria-labelledby="titulo-filtros">
          <h2 id="titulo-filtros" className="sr-only">Filtros de búsqueda</h2>
          <form className="filtros-bloque" onSubmit={filtrar} role="search" aria-label="Filtrar productos">
            <div className="filtros">
              <div className="campo campo-busqueda">
                <label htmlFor="buscar-producto">Buscar producto</label>
                <div className="con-icono">
                  <Icon name="buscar" />
                  <input
                    id="buscar-producto"
                    data-buscador
                    className="control"
                    type="search"
                    placeholder="Ej: Leche o SKU-10045"
                    value={filtro.q}
                    onChange={(e) => setFiltro({ ...filtro, q: e.target.value })}
                  />
                </div>
              </div>
              <div className="campo">
                <label htmlFor="filtro-categoria">Categoría</label>
                <select id="filtro-categoria" className="control" value={filtro.categoria} onChange={(e) => setFiltro({ ...filtro, categoria: e.target.value })}>
                  <option value="">Todas las categorías</option>
                  {catalogos.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="filtro-marca">Marca</label>
                <select id="filtro-marca" className="control" value={filtro.marca} onChange={(e) => setFiltro({ ...filtro, marca: e.target.value })}>
                  <option value="">Todas las marcas</option>
                  {catalogos.marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <div className="campo campo-estado">
                <label htmlFor="filtro-estado">Estado</label>
                <select id="filtro-estado" className="control" value={filtro.estado} onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}>
                  <option value="">Todos</option>
                  <option value="Activo">Activos</option>
                  <option value="Inactivo">Inactivos</option>
                </select>
              </div>
            </div>
            <div className="filtros-pie">
              <p className="conteo" aria-live="polite">
                {productos
                  ? `Mostrando ${visibles.length} de ${productos.length} ${productos.length === 1 ? 'producto' : 'productos'} · Categoría: ${nombreCategoria} · Marca: ${nombreMarca} · Estado: ${TEXTO_ESTADO[mostrado.estado || '']}${mostrado.q ? ` · Búsqueda: «${mostrado.q}»` : ''}`
                  : 'Cargando productos…'}
              </p>
              <div className="grupo-botones">
                <button type="button" className="btn btn-secundario" onClick={limpiar}>Limpiar</button>
                <button type="submit" className="btn btn-primario"><Icon name="buscar" />Filtrar</button>
              </div>
            </div>
          </form>
        </section>

        <section className="tarjeta tarjeta-tabla" aria-labelledby="titulo-lista">
          <h2 id="titulo-lista" className="sr-only">Lista de productos</h2>
          {error && <div className="alerta-error" role="alert"><Icon name="error" /><span>{error}</span></div>}
          <TablaContenedor etiqueta="Tabla de productos">
            <table className="tabla-apilable">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Producto</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Subcategoría</th>
                  <th scope="col">Marca</th>
                  <th scope="col">Fecha registrada</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles?.map((p) => (
                  <tr key={p.id} className={p.estado === 'Inactivo' ? 'fila-inactiva' : undefined}>
                    <td data-label="Código" className="codigo">{p.codigo}</td>
                    <td data-label="Producto">
                      <div className="celda-producto">
                        <MiniaturaProducto producto={p} />
                        <div>
                          <span className="producto-nombre">
                            {p.nombre}
                          </span>
                          {(p.modelo || p.presentacion) && <span className="producto-detalle">{p.modelo || p.presentacion}</span>}
                        </div>
                      </div>
                    </td>
                    <td data-label="Categoría">{p.categoria}</td>
                    <td data-label="Subcategoría">{p.subcategoria}</td>
                    <td data-label="Marca">{p.marca}</td>
                    <td data-label="Fecha registrada">{fecha(p.fecha_registro)}</td>
                    <td data-label="Stock"><IndicadorStock producto={p} /></td>
                    <td data-label="Estado"><EstadoBadge estado={p.estado} /></td>
                    <td data-label="Acciones">
                      <div className="acciones-fila">
                        <button
                          type="button"
                          className="btn-icono"
                          aria-label={`Editar producto ${p.nombre}`}
                          title="Editar"
                          onClick={() => navigate(`/productos/${p.id}/editar`)}
                        >
                          <Icon name="editar" />
                        </button>
                        <button
                          type="button"
                          className="btn-icono peligro"
                          aria-label={`Eliminar producto ${p.nombre}`}
                          title="Eliminar"
                          onClick={() => setAEliminar(p)}
                        >
                          <Icon name="eliminar" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {productos && !productos.length && (
                  <tr><td colSpan={9} className="vacio">No se encontraron productos con los filtros aplicados. Pruebe con «Limpiar».</td></tr>
                )}
              </tbody>
            </table>
          </TablaContenedor>
          {productos && productos.length > 0 && (
            <Paginacion
              pagina={pagina}
              total={productos.length}
              porPagina={POR_PAGINA}
              onCambiar={cambiarPagina}
              nombre="productos"
              etiqueta="Paginación de la tabla de productos"
            />
          )}
        </section>
      </PanelPestana>

      {aEliminar && (
        <Confirmacion
          titulo="Eliminar producto"
          mensaje={`¿Desea eliminar el producto ${aEliminar.nombre} (${aEliminar.codigo})? Esta acción no se puede deshacer.`}
          textoConfirmar="Eliminar"
          peligro
          ocupado={eliminando}
          onCancel={cancelarEliminacion}
          onConfirm={confirmarEliminacion}
        />
      )}
    </>
  );
}
