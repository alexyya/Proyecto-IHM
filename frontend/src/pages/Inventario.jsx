import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import {
  ErrorCampo, IndicadorStock, Requerido, ResumenErrores, TablaContenedor, propsCampo, useTitulo,
} from '../components/ui';
import { api, avisarCambioStock } from '../api/client';
import { useToast } from '../context/ToastContext';
import { esStockBajo, fechaHora } from '../utils/formato';

const PESTANAS = [
  { id: 'stock', texto: 'Stock' },
  { id: 'movimientos', texto: 'Movimientos' },
];

function ModalIngreso({ productos, onClose, onGuardado }) {
  const [form, setForm] = useState({ producto_id: '', cantidad: '', motivo: '' });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const etiquetas = { producto_id: 'Producto', cantidad: 'Cantidad', motivo: 'Motivo' };

  const cambiar = (c, v) => {
    setForm((f) => ({ ...f, [c]: v }));
    if (errores[c]) setErrores((e) => { const n = { ...e }; delete n[c]; return n; });
  };

  async function enviar(e) {
    e.preventDefault();
    const err = {};
    if (!form.producto_id) err.producto_id = 'Seleccione el producto que ingresa al almacén.';
    if (!form.cantidad.trim()) err.cantidad = 'Ingrese la cantidad recibida en unidades. Ejemplo: 50';
    else if (!/^\d{1,6}$/.test(form.cantidad.trim()) || Number(form.cantidad) <= 0) err.cantidad = 'La cantidad debe ser un número entero mayor que 0. Ejemplo: 50';
    if (!form.motivo.trim()) err.motivo = 'Indique el motivo del ingreso. Ejemplo: Reposición de proveedor';
    setErrores(err);
    if (Object.keys(err).length) return;
    setEnviando(true);
    try {
      const r = await api.post('/inventario/ingresos', form);
      onGuardado(r.mensaje);
    } catch (ex) {
      setEnviando(false);
      if (ex.errores) setErrores(ex.errores);
      else setErrores({ producto_id: ex.message });
    }
  }

  const p = (c) => propsCampo(c, errores, { requerido: true });
  return (
    <Modal titulo="Registrar ingreso de mercadería" icono="inventario" onClose={onClose} ancho>
      <ResumenErrores errores={errores} etiquetas={etiquetas} titulo="No se pudo registrar" />
      <form onSubmit={enviar} noValidate data-atajo-guardar>
        <div className="campo">
          <label htmlFor="campo-producto_id">Producto <Requerido /></label>
          <select {...p('producto_id')} className="control" value={form.producto_id} onChange={(e) => cambiar('producto_id', e.target.value)} data-autofocus>
            <option value="">Seleccione un producto</option>
            {productos.map((x) => (
              <option key={x.id} value={x.id}>
                {x.codigo} · {x.nombre} (stock: {x.stock} und{esStockBajo(x) ? ', stock bajo' : ''})
              </option>
            ))}
          </select>
          <ErrorCampo campo="producto_id" error={errores.producto_id} />
        </div>
        <div className="form-grid">
          <div className="campo">
            <label htmlFor="campo-cantidad">Cantidad (und) <Requerido /></label>
            <input {...p('cantidad')} className="control" type="text" inputMode="numeric" placeholder="Ej: 50" value={form.cantidad} onChange={(e) => cambiar('cantidad', e.target.value)} />
            <ErrorCampo campo="cantidad" error={errores.cantidad} />
          </div>
          <div className="campo">
            <label htmlFor="campo-motivo">Motivo <Requerido /></label>
            <input {...p('motivo')} className="control" type="text" maxLength={150} placeholder="Ej: Reposición de proveedor" value={form.motivo} onChange={(e) => cambiar('motivo', e.target.value)} />
            <ErrorCampo campo="motivo" error={errores.motivo} />
          </div>
        </div>
        <div className="modal-acciones">
          <button type="button" className="btn btn-secundario" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primario" disabled={enviando}>{enviando ? 'Registrando…' : 'Registrar ingreso'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Inventario() {
  useTitulo('Inventario');
  const [params, setParams] = useSearchParams();
  const { mostrar } = useToast();
  const [pestana, setPestana] = useState(params.get('tab') === 'movimientos' ? 'movimientos' : 'stock');
  const [productos, setProductos] = useState(null);
  const [movimientos, setMovimientos] = useState(null);
  const [soloBajo, setSoloBajo] = useState(params.get('filtro') === 'bajo');
  const [modal, setModal] = useState(params.get('ingreso') === '1');
  const refs = useRef({});

  const cargar = useCallback(() => {
    api.get('/productos').then(setProductos).catch((e) => mostrar(e.message, 'error'));
    api.get('/inventario/movimientos').then(setMovimientos).catch(() => {});
  }, [mostrar]);
  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (params.get('filtro') === 'bajo') { setSoloBajo(true); setPestana('stock'); }
  }, [params]);

  function teclaPestana(e, i) {
    let n = null;
    if (e.key === 'ArrowRight') n = (i + 1) % PESTANAS.length;
    if (e.key === 'ArrowLeft') n = (i - 1 + PESTANAS.length) % PESTANAS.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = PESTANAS.length - 1;
    if (n !== null) {
      e.preventDefault();
      setPestana(PESTANAS[n].id);
      refs.current[PESTANAS[n].id]?.focus();
    }
  }

  const cerrarModal = () => {
    setModal(false);
    if (params.get('ingreso')) { params.delete('ingreso'); setParams(params, { replace: true }); }
  };

  const lista = (productos || []).filter((p) => !soloBajo || esStockBajo(p));
  const totalBajo = (productos || []).filter(esStockBajo).length;

  return (
    <>
      <div className="cabecera-pagina">
        <div>
          <h1>Consulta de Gestión de Inventario</h1>
          <p>Controle el stock disponible y los movimientos de mercadería.</p>
        </div>
        <button type="button" className="btn btn-primario" onClick={() => setModal(true)}>
          <Icon name="mas" />Registrar ingreso de mercadería
        </button>
      </div>

      <section className="tarjeta" aria-labelledby="titulo-inventario">
        <h2 id="titulo-inventario" className="sr-only">Detalle de inventario</h2>
        <div className="pestanas" role="tablist" aria-label="Vistas de inventario">
          {PESTANAS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => { refs.current[t.id] = el; }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              className="pestana"
              aria-selected={pestana === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={pestana === t.id ? 0 : -1}
              onClick={() => setPestana(t.id)}
              onKeyDown={(e) => teclaPestana(e, i)}
            >
              {t.texto}
            </button>
          ))}
        </div>

        <div role="tabpanel" id="panel-stock" aria-labelledby="tab-stock" hidden={pestana !== 'stock'}>
          <div className="tarjeta-cabecera">
            <label className="check" htmlFor="solo-bajo">
              <input id="solo-bajo" type="checkbox" checked={soloBajo} onChange={(e) => setSoloBajo(e.target.checked)} />
              Mostrar solo productos con stock bajo ({totalBajo})
            </label>
          </div>
          <p className="conteo" aria-live="polite">
            {productos ? `Mostrando ${lista.length} ${lista.length === 1 ? 'producto' : 'productos'}${soloBajo ? ' con stock bajo' : ''}` : 'Cargando stock…'}
          </p>
          <TablaContenedor etiqueta="Tabla de stock">
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
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Código" className="codigo">{p.codigo}</td>
                    <td data-label="Producto">{p.nombre}</td>
                    <td data-label="Categoría">{p.categoria}</td>
                    <td data-label="Marca">{p.marca}</td>
                    <td data-label="Stock mínimo" className="num">{p.stock_minimo} und</td>
                    <td data-label="Stock"><IndicadorStock producto={p} /></td>
                  </tr>
                ))}
                {productos && !lista.length && <tr><td colSpan={6} className="vacio">No hay productos para mostrar.</td></tr>}
              </tbody>
            </table>
          </TablaContenedor>
        </div>

        <div role="tabpanel" id="panel-movimientos" aria-labelledby="tab-movimientos" hidden={pestana !== 'movimientos'}>
          <TablaContenedor etiqueta="Tabla de movimientos">
            <table>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Producto</th>
                  <th scope="col">Tipo</th>
                  <th scope="col" className="num">Cantidad</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {(movimientos || []).map((m) => (
                  <tr key={m.id}>
                    <td>{fechaHora(m.fecha)}</td>
                    <td>{m.producto}<br /><span className="codigo">{m.codigo}</span></td>
                    <td>
                      <span className={`mov ${m.tipo === 'Entrada' ? 'mov-entrada' : 'mov-salida'}`}>
                        <Icon name={m.tipo === 'Entrada' ? 'flechaArriba' : 'flechaAbajo'} />
                        {m.tipo}
                      </span>
                    </td>
                    <td className="num">{m.tipo === 'Entrada' ? '+' : '−'}{m.cantidad} und</td>
                    <td>{m.motivo}</td>
                    <td>{m.usuario}</td>
                  </tr>
                ))}
                {movimientos && !movimientos.length && <tr><td colSpan={6} className="vacio">No hay movimientos registrados.</td></tr>}
              </tbody>
            </table>
          </TablaContenedor>
        </div>
      </section>

      {modal && productos && (
        <ModalIngreso
          productos={productos}
          onClose={cerrarModal}
          onGuardado={(msg) => {
            cerrarModal();
            mostrar(msg, 'exito');
            avisarCambioStock();
            cargar();
          }}
        />
      )}
    </>
  );
}
