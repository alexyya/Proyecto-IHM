// Pestañas de catálogos de Gestión de productos: Marcas, Modelos, Categorías y subcategorías
import { useState } from 'react';
import Icon from '../components/Icon';
import { Confirmacion } from '../components/Modal';
import { ErrorCampo, Requerido, TablaContenedor } from '../components/ui';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

/** Props ARIA de un campo de estos formularios (ids únicos por formulario). */
function campo(id, error, requerido = true) {
  return {
    id,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? `error-${id}` : undefined,
    'aria-required': requerido ? 'true' : undefined,
  };
}

/** Hook común: envía el formulario, traduce errores del servidor y avisa con un toast. */
function useEnvio(onCambio) {
  const { mostrar } = useToast();
  const [enviando, setEnviando] = useState(false);
  async function enviar(ruta, cuerpo, mapaErrores, setErrores, alExito) {
    setEnviando(true);
    try {
      const r = await api.post(ruta, cuerpo);
      mostrar(r.mensaje, 'exito');
      alExito();
      onCambio();
    } catch (ex) {
      if (ex.errores) {
        const e = {};
        Object.entries(ex.errores).forEach(([k, v]) => { e[mapaErrores[k] || k] = v; });
        setErrores(e);
        const primero = Object.keys(e)[0];
        document.getElementById(primero)?.focus();
      } else {
        mostrar(ex.message, 'error');
      }
    } finally {
      setEnviando(false);
    }
  }
  return { enviar, enviando };
}

/** Confirmación de eliminación compartida por las tres pestañas. */
function useEliminar(onCambio) {
  const { mostrar } = useToast();
  const [item, setItem] = useState(null); // { ruta, titulo, mensaje }
  const [ocupado, setOcupado] = useState(false);
  const dialogo = item && (
    <Confirmacion
      titulo={item.titulo}
      mensaje={item.mensaje}
      textoConfirmar="Eliminar"
      peligro
      ocupado={ocupado}
      onCancel={() => { setItem(null); mostrar('Eliminación cancelada. No se aplicaron cambios.', 'info'); }}
      onConfirm={async () => {
        setOcupado(true);
        try {
          const r = await api.del(item.ruta);
          mostrar(r.mensaje, 'exito');
          onCambio();
        } catch (e) {
          mostrar(e.message, 'error');
        } finally {
          setOcupado(false);
          setItem(null);
        }
      }}
    />
  );
  return { pedir: setItem, dialogo };
}

function BotonEliminar({ etiqueta, onClick }) {
  return (
    <button type="button" className="btn-icono peligro" aria-label={etiqueta} title="Eliminar" onClick={onClick}>
      <Icon name="eliminar" />
    </button>
  );
}

// ---------------------------------------------------------------- Marcas
export function PanelMarcas({ catalogos, onCambio }) {
  const { mostrar } = useToast();
  const [nombre, setNombre] = useState('');
  const [errores, setErrores] = useState({});
  const { enviar, enviando } = useEnvio(onCambio);
  const { pedir, dialogo } = useEliminar(onCambio);

  function alEnviar(e) {
    e.preventDefault();
    const t = nombre.trim();
    if (t.length < 2) {
      setErrores({ 'marca-nombre': t ? 'El nombre debe tener al menos 2 caracteres. Ejemplo: Gloria' : 'Ingrese el nombre de la marca. Ejemplo: Gloria' });
      document.getElementById('marca-nombre')?.focus();
      return;
    }
    enviar('/catalogos/marcas', { nombre: t }, { nombre: 'marca-nombre' }, setErrores, () => { setNombre(''); setErrores({}); });
  }

  function eliminar(m) {
    if (m.productos > 0) {
      mostrar(`No se puede eliminar «${m.nombre}»: tiene ${plural(m.productos, 'producto', 'productos')}. Cambie primero la marca de esos productos.`, 'error');
      return;
    }
    pedir({
      ruta: `/catalogos/marcas/${m.id}`,
      titulo: 'Eliminar marca',
      mensaje: `¿Desea eliminar la marca ${m.nombre}${m.modelos ? ` y sus ${plural(m.modelos, 'modelo', 'modelos')}` : ''}? Esta acción no se puede deshacer.`,
    });
  }

  return (
    <div className="grid-catalogo">
      <section className="tarjeta" aria-labelledby="titulo-nueva-marca">
        <h2 id="titulo-nueva-marca">Agregar marca</h2>
        <p className="ayuda-seccion">Registre una marca para usarla en productos, modelos y promociones.</p>
        <form onSubmit={alEnviar} noValidate data-atajo-guardar>
          <div className="campo">
            <label htmlFor="marca-nombre">Nombre de la marca <Requerido /></label>
            <input {...campo('marca-nombre', errores['marca-nombre'])} className="control" type="text" maxLength={80} autoComplete="off"
              placeholder="Ej: Nestlé" value={nombre} onChange={(e) => { setNombre(e.target.value); setErrores({}); }} />
            <ErrorCampo campo="marca-nombre" error={errores['marca-nombre']} />
          </div>
          <button type="submit" className="btn btn-primario" disabled={enviando}><Icon name="mas" />{enviando ? 'Agregando…' : 'Agregar marca'}</button>
        </form>
      </section>

      <section className="tarjeta" aria-labelledby="titulo-lista-marcas">
        <h2 id="titulo-lista-marcas">Marcas registradas</h2>
        <p className="conteo" aria-live="polite">{plural(catalogos.marcas.length, 'marca', 'marcas')}</p>
        <TablaContenedor etiqueta="Tabla de marcas">
          <table className="tabla-apilable">
            <thead>
              <tr>
                <th scope="col">Marca</th>
                <th scope="col" className="num">Modelos</th>
                <th scope="col" className="num">Productos</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {catalogos.marcas.map((m) => (
                <tr key={m.id}>
                  <td data-label="Marca">{m.nombre}</td>
                  <td data-label="Modelos" className="num">{m.modelos}</td>
                  <td data-label="Productos" className="num">{m.productos}</td>
                  <td data-label="Acciones"><BotonEliminar etiqueta={`Eliminar marca ${m.nombre}`} onClick={() => eliminar(m)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablaContenedor>
      </section>
      {dialogo}
    </div>
  );
}

// ---------------------------------------------------------------- Modelos
export function PanelModelos({ catalogos, onCambio }) {
  const [form, setForm] = useState({ marca_id: '', nombre: '' });
  const [filtroMarca, setFiltroMarca] = useState('');
  const [errores, setErrores] = useState({});
  const { enviar, enviando } = useEnvio(onCambio);
  const { pedir, dialogo } = useEliminar(onCambio);
  const lista = catalogos.modelos.filter((o) => !filtroMarca || String(o.marca_id) === filtroMarca);

  function alEnviar(e) {
    e.preventDefault();
    const err = {};
    if (!form.marca_id) err['modelo-marca'] = 'Seleccione la marca del modelo. Ejemplo: Gloria';
    if (form.nombre.trim().length < 2) err['modelo-nombre'] = form.nombre.trim() ? 'El nombre debe tener al menos 2 caracteres. Ejemplo: Lata 400 g' : 'Ingrese el nombre del modelo. Ejemplo: Lata 400 g';
    setErrores(err);
    if (Object.keys(err).length) { document.getElementById(Object.keys(err)[0])?.focus(); return; }
    enviar('/catalogos/modelos', { marca_id: form.marca_id, nombre: form.nombre.trim() }, { marca_id: 'modelo-marca', nombre: 'modelo-nombre' }, setErrores,
      () => { setForm({ ...form, nombre: '' }); setErrores({}); });
  }

  const cambiar = (c, v) => { setForm({ ...form, [c]: v }); setErrores({}); };

  return (
    <div className="grid-catalogo">
      <section className="tarjeta" aria-labelledby="titulo-nuevo-modelo">
        <h2 id="titulo-nuevo-modelo">Agregar modelo</h2>
        <p className="ayuda-seccion">Un modelo es el formato o envase de una marca. Ejemplo: Gloria › Lata 400 g.</p>
        <form onSubmit={alEnviar} noValidate data-atajo-guardar>
          <div className="campo">
            <label htmlFor="modelo-marca">Marca <Requerido /></label>
            <select {...campo('modelo-marca', errores['modelo-marca'])} className="control" value={form.marca_id} onChange={(e) => cambiar('marca_id', e.target.value)}>
              <option value="">Seleccione una marca</option>
              {catalogos.marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <ErrorCampo campo="modelo-marca" error={errores['modelo-marca']} />
          </div>
          <div className="campo">
            <label htmlFor="modelo-nombre">Nombre del modelo <Requerido /></label>
            <input {...campo('modelo-nombre', errores['modelo-nombre'])} className="control" type="text" maxLength={80} autoComplete="off"
              placeholder="Ej: Caja 1 L" value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
            <ErrorCampo campo="modelo-nombre" error={errores['modelo-nombre']} />
          </div>
          <button type="submit" className="btn btn-primario" disabled={enviando}><Icon name="mas" />{enviando ? 'Agregando…' : 'Agregar modelo'}</button>
        </form>
      </section>

      <section className="tarjeta" aria-labelledby="titulo-lista-modelos">
        <div className="tarjeta-cabecera">
          <h2 id="titulo-lista-modelos">Modelos registrados</h2>
          <div className="campo campo-en-linea">
            <label htmlFor="filtro-modelo-marca">Mostrar marca</label>
            <select id="filtro-modelo-marca" className="control" value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)}>
              <option value="">Todas las marcas</option>
              {catalogos.marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        </div>
        <p className="conteo" aria-live="polite">{plural(lista.length, 'modelo', 'modelos')}</p>
        <TablaContenedor etiqueta="Tabla de modelos">
          <table className="tabla-apilable">
            <thead>
              <tr>
                <th scope="col">Marca</th>
                <th scope="col">Modelo</th>
                <th scope="col" className="num">Productos</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((o) => (
                <tr key={o.id}>
                  <td data-label="Marca">{o.marca}</td>
                  <td data-label="Modelo">{o.nombre}</td>
                  <td data-label="Productos" className="num">{o.productos}</td>
                  <td data-label="Acciones">
                    <BotonEliminar
                      etiqueta={`Eliminar modelo ${o.nombre} de ${o.marca}`}
                      onClick={() => pedir({
                        ruta: `/catalogos/modelos/${o.id}`,
                        titulo: 'Eliminar modelo',
                        mensaje: `¿Desea eliminar el modelo ${o.nombre} (${o.marca})?${o.productos ? ` ${plural(o.productos, 'producto quedará', 'productos quedarán')} sin modelo.` : ''} Esta acción no se puede deshacer.`,
                      })}
                    />
                  </td>
                </tr>
              ))}
              {!lista.length && <tr><td colSpan={4} className="vacio">No hay modelos para esta marca. Agregue uno con el formulario.</td></tr>}
            </tbody>
          </table>
        </TablaContenedor>
      </section>
      {dialogo}
    </div>
  );
}

// ---------------------------------------------------------------- Categorías y subcategorías
export function PanelCategorias({ catalogos, onCambio }) {
  const { mostrar } = useToast();
  const [cat, setCat] = useState('');
  const [sub, setSub] = useState({ categoria_id: '', nombre: '' });
  const [errores, setErrores] = useState({});
  const envioCat = useEnvio(onCambio);
  const envioSub = useEnvio(onCambio);
  const { pedir, dialogo } = useEliminar(onCambio);

  function agregarCategoria(e) {
    e.preventDefault();
    const t = cat.trim();
    if (t.length < 2) {
      setErrores({ 'cat-nombre': t ? 'El nombre debe tener al menos 2 caracteres. Ejemplo: Panadería' : 'Ingrese el nombre de la categoría. Ejemplo: Panadería' });
      document.getElementById('cat-nombre')?.focus();
      return;
    }
    envioCat.enviar('/catalogos/categorias', { nombre: t }, { nombre: 'cat-nombre' }, setErrores, () => { setCat(''); setErrores({}); });
  }

  function agregarSubcategoria(e) {
    e.preventDefault();
    const err = {};
    if (!sub.categoria_id) err['sub-categoria'] = 'Seleccione la categoría a la que pertenece. Ejemplo: Lácteos';
    if (sub.nombre.trim().length < 2) err['sub-nombre'] = sub.nombre.trim() ? 'El nombre debe tener al menos 2 caracteres. Ejemplo: Mantequilla' : 'Ingrese el nombre de la subcategoría. Ejemplo: Mantequilla';
    setErrores(err);
    if (Object.keys(err).length) { document.getElementById(Object.keys(err)[0])?.focus(); return; }
    envioSub.enviar('/catalogos/subcategorias', { categoria_id: sub.categoria_id, nombre: sub.nombre.trim() },
      { categoria_id: 'sub-categoria', nombre: 'sub-nombre' }, setErrores, () => { setSub({ ...sub, nombre: '' }); setErrores({}); });
  }

  function eliminarCategoria(c) {
    if (c.subcategorias > 0) {
      mostrar(`No se puede eliminar «${c.nombre}»: tiene ${plural(c.subcategorias, 'subcategoría', 'subcategorías')}. Elimínelas primero.`, 'error');
      return;
    }
    pedir({ ruta: `/catalogos/categorias/${c.id}`, titulo: 'Eliminar categoría', mensaje: `¿Desea eliminar la categoría ${c.nombre}? Esta acción no se puede deshacer.` });
  }

  function eliminarSubcategoria(s, c) {
    if (s.productos > 0) {
      mostrar(`No se puede eliminar «${s.nombre}»: tiene ${plural(s.productos, 'producto', 'productos')}.`, 'error');
      return;
    }
    pedir({ ruta: `/catalogos/subcategorias/${s.id}`, titulo: 'Eliminar subcategoría', mensaje: `¿Desea eliminar la subcategoría ${s.nombre} de ${c.nombre}? Esta acción no se puede deshacer.` });
  }

  return (
    <>
      <div className="grid-2 margen-abajo">
        <section className="tarjeta" aria-labelledby="titulo-nueva-cat">
          <h2 id="titulo-nueva-cat">Agregar categoría</h2>
          <form onSubmit={agregarCategoria} noValidate>
            <div className="campo">
              <label htmlFor="cat-nombre">Nombre de la categoría <Requerido /></label>
              <input {...campo('cat-nombre', errores['cat-nombre'])} className="control" type="text" maxLength={80} autoComplete="off"
                placeholder="Ej: Panadería" value={cat} onChange={(e) => { setCat(e.target.value); setErrores({}); }} />
              <ErrorCampo campo="cat-nombre" error={errores['cat-nombre']} />
            </div>
            <button type="submit" className="btn btn-primario" disabled={envioCat.enviando}><Icon name="mas" />Agregar categoría</button>
          </form>
        </section>
        <section className="tarjeta" aria-labelledby="titulo-nueva-sub">
          <h2 id="titulo-nueva-sub">Agregar subcategoría</h2>
          <form onSubmit={agregarSubcategoria} noValidate>
            <div className="form-grid">
              <div className="campo">
                <label htmlFor="sub-categoria">Categoría <Requerido /></label>
                <select {...campo('sub-categoria', errores['sub-categoria'])} className="control" value={sub.categoria_id}
                  onChange={(e) => { setSub({ ...sub, categoria_id: e.target.value }); setErrores({}); }}>
                  <option value="">Seleccione una categoría</option>
                  {catalogos.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <ErrorCampo campo="sub-categoria" error={errores['sub-categoria']} />
              </div>
              <div className="campo">
                <label htmlFor="sub-nombre">Nombre de la subcategoría <Requerido /></label>
                <input {...campo('sub-nombre', errores['sub-nombre'])} className="control" type="text" maxLength={80} autoComplete="off"
                  placeholder="Ej: Mantequilla" value={sub.nombre} onChange={(e) => { setSub({ ...sub, nombre: e.target.value }); setErrores({}); }} />
                <ErrorCampo campo="sub-nombre" error={errores['sub-nombre']} />
              </div>
            </div>
            <button type="submit" className="btn btn-primario" disabled={envioSub.enviando}><Icon name="mas" />Agregar subcategoría</button>
          </form>
        </section>
      </div>

      <section className="tarjeta" aria-labelledby="titulo-arbol-cat">
        <h2 id="titulo-arbol-cat">Categorías y sus subcategorías</h2>
        <p className="conteo" aria-live="polite">
          {plural(catalogos.categorias.length, 'categoría', 'categorías')} · {plural(catalogos.subcategorias.length, 'subcategoría', 'subcategorías')}
        </p>
        <div className="cat-grid">
          {catalogos.categorias.map((c) => {
            const subs = catalogos.subcategorias.filter((s) => s.categoria_id === c.id);
            return (
              <article className="cat-tarjeta" key={c.id} aria-labelledby={`cat-${c.id}`}>
                <div className="cat-cabecera">
                  <div>
                    <h3 id={`cat-${c.id}`}>{c.nombre}</h3>
                    <p className="estado-texto">{plural(c.productos, 'producto', 'productos')}</p>
                  </div>
                  <BotonEliminar etiqueta={`Eliminar categoría ${c.nombre}`} onClick={() => eliminarCategoria(c)} />
                </div>
                {subs.length ? (
                  <ul className="sub-lista" aria-label={`Subcategorías de ${c.nombre}`}>
                    {subs.map((s) => (
                      <li key={s.id}>
                        <span>{s.nombre} <span className="estado-texto">({plural(s.productos, 'producto', 'productos')})</span></span>
                        <BotonEliminar etiqueta={`Eliminar subcategoría ${s.nombre} de ${c.nombre}`} onClick={() => eliminarSubcategoria(s, c)} />
                      </li>
                    ))}
                  </ul>
                ) : <p className="estado-texto">Sin subcategorías todavía.</p>}
              </article>
            );
          })}
        </div>
      </section>
      {dialogo}
    </>
  );
}
