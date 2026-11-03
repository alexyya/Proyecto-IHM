import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';
import Modal from './Modal';
import { TablaContenedor } from './ui';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { filasDesdeCSV, validarFila } from '../utils/importar';

const MENSAJE_EXCEL = 'Por ahora la importación acepta CSV. En Excel use Archivo › Guardar como › CSV UTF-8 y vuelva a intentarlo.';
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

const leerTexto = (archivo) => new Promise((ok, mal) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.onerror = () => mal(new Error(`No se pudo leer el archivo «${archivo.name}».`));
  r.readAsText(archivo, 'utf-8');
});

/**
 * Botón «Importar Excel»: abre el selector de archivos (.csv, .xlsx, .xls).
 * Con CSV muestra una vista previa con la validación de cada fila y luego
 * envía las filas válidas a POST /api/productos/importar.
 */
export default function ImportarProductos({ catalogos, onImportado }) {
  const { mostrar } = useToast();
  const inputRef = useRef(null);
  const btnRef = useRef(null);
  const resultadoRef = useRef(null);
  const ayudaId = useId();
  const [vista, setVista] = useState(null);       // { archivo, filas: [{...fila, errores: []}] }
  const [aviso, setAviso] = useState(null);       // { titulo, mensaje }
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { if (resultado) resultadoRef.current?.focus(); }, [resultado]);

  const cerrar = () => {
    setVista(null); setAviso(null); setResultado(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  async function elegir(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const ext = archivo.name.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      setAviso({ titulo: 'Formato de Excel no admitido todavía', mensaje: MENSAJE_EXCEL });
      return;
    }
    if (ext !== 'csv') {
      setAviso({ titulo: 'Archivo no admitido', mensaje: `El archivo «${archivo.name}» no es CSV. ${MENSAJE_EXCEL}` });
      return;
    }
    try {
      const r = filasDesdeCSV(await leerTexto(archivo));
      if (r.error) { setAviso({ titulo: 'No se pudo leer el archivo', mensaje: r.error }); return; }
      setVista({ archivo: archivo.name, filas: r.filas.map((f) => ({ ...f, errores: validarFila(f, catalogos) })) });
    } catch (ex) {
      setAviso({ titulo: 'No se pudo leer el archivo', mensaje: ex.message });
    }
  }

  const validas = vista ? vista.filas.filter((f) => !f.errores.length) : [];
  const conError = vista ? vista.filas.length - validas.length : 0;

  async function importar() {
    setEnviando(true);
    try {
      const filas = validas.map(({ errores, ...f }) => f);
      const r = await api.post('/productos/importar', { filas });
      // errores del navegador + los que detecte el servidor
      const errores = [
        ...vista.filas.filter((f) => f.errores.length).map((f) => ({ fila: f.fila, mensaje: f.errores.join('; ') })),
        ...(r.errores || []),
      ].sort((a, b) => a.fila - b.fila);
      setResultado({ importados: r.importados, errores });
      mostrar(`Se importaron ${plural(r.importados, 'producto', 'productos')}${errores.length ? ` · ${plural(errores.length, 'fila con error', 'filas con error')}` : ''}.`, r.importados ? 'exito' : 'error');
      if (r.importados) onImportado?.(r);
    } catch (ex) {
      mostrar(ex.message, 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <input ref={inputRef} id={`${ayudaId}-archivo`} type="file" className="archivo-oculto" tabIndex={-1} aria-hidden="true" aria-label="Archivo CSV para importar productos" title="Archivo CSV para importar productos"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={elegir} data-importar-archivo />
      <button type="button" ref={btnRef} className="btn btn-secundario" aria-describedby={ayudaId} onClick={() => inputRef.current?.click()}>
        <Icon name="subir" />Importar Excel
      </button>
      <span id={ayudaId} className="sr-only">Acepta archivos CSV con las columnas de la plantilla.</span>

      {aviso && (
        <Modal titulo={aviso.titulo} icono="alerta" rol="alertdialog" onClose={cerrar} describedBy={`${ayudaId}-aviso`}
          acciones={<button type="button" className="btn btn-primario" onClick={cerrar} data-autofocus>Entendido</button>}>
          <p id={`${ayudaId}-aviso`}>{aviso.mensaje}</p>
        </Modal>
      )}

      {vista && (
        <Modal titulo={resultado ? 'Resultado de la importación' : 'Importar productos desde CSV'} icono={resultado ? undefined : 'subir'} ancho onClose={cerrar}
          acciones={resultado ? (
            <button type="button" className="btn btn-primario" onClick={cerrar}>Cerrar</button>
          ) : (
            <>
              <button type="button" className="btn btn-secundario" onClick={cerrar} data-autofocus={validas.length ? undefined : true}>Cancelar</button>
              <button type="button" className="btn btn-primario" onClick={importar} disabled={!validas.length || enviando} data-autofocus={validas.length ? true : undefined}>
                {enviando ? 'Importando…' : `Importar ${plural(validas.length, 'producto', 'productos')}`}
              </button>
            </>
          )}>
          {resultado ? (
            <div className="importar-resultado">
              <p ref={resultadoRef} tabIndex={-1} className="importar-resumen">
                <Icon name={resultado.importados ? 'check' : 'error'} />
                <span>Se {resultado.importados === 1 ? 'importó' : 'importaron'} {plural(resultado.importados, 'producto', 'productos')} de «{vista.archivo}».{' '}
                  {resultado.errores.length ? `${plural(resultado.errores.length, 'fila no se importó', 'filas no se importaron')}:` : 'Todas las filas se importaron.'}</span>
              </p>
              {resultado.errores.length > 0 && (
                <ul className="importar-errores">
                  {resultado.errores.map((e) => <li key={e.fila}><strong>Fila {e.fila}:</strong> {e.mensaje}</li>)}
                </ul>
              )}
            </div>
          ) : (
            <>
              <p>
                Archivo «{vista.archivo}»: {plural(vista.filas.length, 'fila leída', 'filas leídas')}, {plural(validas.length, 'válida', 'válidas')}
                {conError ? ` y ${conError} con errores (no se importarán)` : ''}. El código y la fecha de registro se generan automáticamente.
              </p>
              <TablaContenedor etiqueta="Vista previa de los productos a importar">
                <table className="tabla-importar">
                  <thead>
                    <tr>
                      <th scope="col">Fila</th>
                      <th scope="col">Producto</th>
                      <th scope="col">Marca</th>
                      <th scope="col">Categoría</th>
                      <th scope="col" className="num">Precio</th>
                      <th scope="col" className="num">Stock</th>
                      <th scope="col">Validación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vista.filas.map((f) => (
                      <tr key={f.fila} className={f.errores.length ? 'fila-error' : undefined}>
                        <td>{f.fila}</td>
                        <td>{f.nombre || '—'}</td>
                        <td>{f.marca || '—'}</td>
                        <td>{f.categoria || '—'}{f.subcategoria ? ` › ${f.subcategoria}` : ''}</td>
                        <td className="num">{f.precio || '—'}</td>
                        <td className="num">{f.stock || '—'}</td>
                        <td>
                          {f.errores.length ? (
                            <span className="importar-error"><Icon name="error" /><span>{f.errores.join('; ')}</span></span>
                          ) : (
                            <span className="badge badge-activo"><Icon name="check" />Válida</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TablaContenedor>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
