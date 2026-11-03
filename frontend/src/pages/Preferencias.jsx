import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { Migas, Switch, useTitulo } from '../components/ui';
import { PREFERENCIAS_POR_DEFECTO, usePreferencias } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';

function FilaSwitch({ id, titulo, descripcion, checked, onChange, disabled }) {
  return (
    <div className="switch-fila">
      <div className="switch-texto">
        <strong id={`${id}-titulo`}>{titulo}</strong>
        <span id={`${id}-desc`}>{descripcion}</span>
      </div>
      <Switch id={id} checked={checked} onChange={onChange} disabled={disabled} labelledBy={`${id}-titulo`} describedBy={`${id}-desc`} />
    </div>
  );
}

/** Configuración › Preferencias de accesibilidad: módulos «Apoyo visual» y «Ayuda en formularios». */
export default function Preferencias() {
  useTitulo('Preferencias de accesibilidad');
  const { preferencias, setPreferencias, guardar, guardadas } = usePreferencias();
  const { mostrar } = useToast();
  const [guardando, setGuardando] = useState(false);
  const actuales = useRef(preferencias);
  const confirmadas = useRef(guardadas);
  actuales.current = preferencias;
  confirmadas.current = guardadas;

  const sinGuardar = JSON.stringify(preferencias) !== JSON.stringify(guardadas);

  // Si el usuario sale sin guardar, se restauran las preferencias guardadas
  useEffect(() => () => {
    if (JSON.stringify(actuales.current) !== JSON.stringify(confirmadas.current)) {
      setPreferencias(confirmadas.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Los cambios se aplican de inmediato para previsualizarlos en todo el sistema
  const cambiar = (clave, valor) => setPreferencias({ ...preferencias, [clave]: valor });

  async function enviar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await guardar(preferencias);
      mostrar('Preferencias de accesibilidad guardadas correctamente.', 'exito');
    } catch (ex) {
      mostrar(ex.message, 'error');
    } finally {
      setGuardando(false);
    }
  }

  function restablecer() {
    setPreferencias({ ...PREFERENCIAS_POR_DEFECTO });
    mostrar('Se restablecieron los valores recomendados. Pulse «Guardar preferencias» para conservarlos.', 'info');
  }

  return (
    <>
      <Migas items={[{ texto: 'Configuración' }, { texto: 'Preferencias de accesibilidad' }]} />
      <div className="cabecera-pagina">
        <div>
          <h1>Preferencias de accesibilidad</h1>
          <p>Ajuste la interfaz a sus necesidades. Los cambios se ven al instante y se guardan en su perfil.</p>
        </div>
      </div>

      <form onSubmit={enviar} data-atajo-guardar>
        <p className="linea-ayuda" id="nota-zoom">
          <Icon name="info" />
          <span>
            Para agrandar o reducir el texto use el zoom del navegador: <kbd>Ctrl</kbd> + <kbd>+</kbd> y <kbd>Ctrl</kbd> + <kbd>-</kbd>{' '}
            (o <kbd>Ctrl</kbd> + rueda del mouse). La interfaz se reorganiza sin perder contenido ni funciones.
          </span>
        </p>

        <section className="tarjeta" aria-labelledby="titulo-apoyo-visual" aria-describedby="desc-apoyo-visual">
          <h2 id="titulo-apoyo-visual">Apoyo visual</h2>
          <p className="ayuda-seccion" id="desc-apoyo-visual">
            Ayuda a personas con baja visión o daltonismo y a quienes trabajan con poca luz.
          </p>
          <FilaSwitch
            id="pref-contraste"
            titulo="Alto contraste"
            descripcion="Texto negro sobre fondo blanco, bordes más gruesos y enlaces subrayados."
            checked={preferencias.alto_contraste}
            onChange={(v) => cambiar('alto_contraste', v)}
          />
          <FilaSwitch
            id="pref-foco"
            titulo="Foco reforzado"
            descripcion="Muestra un contorno de foco más grueso al navegar con el teclado."
            checked={preferencias.foco_reforzado}
            onChange={(v) => cambiar('foco_reforzado', v)}
          />
          <FilaSwitch
            id="pref-iconos"
            titulo="Indicadores con ícono y texto"
            descripcion="Siempre activo: los estados (stock bajo, activo, error) nunca dependen solo del color."
            checked
            disabled
            onChange={() => {}}
          />
        </section>

        <section className="tarjeta" aria-labelledby="titulo-ayuda-formularios" aria-describedby="desc-ayuda-formularios">
          <h2 id="titulo-ayuda-formularios">Ayuda en formularios</h2>
          <p className="ayuda-seccion" id="desc-ayuda-formularios">
            Ayuda a quienes trabajan con interrupciones, con prisa o con dificultades de memoria o de precisión.
          </p>
          <FilaSwitch
            id="pref-borradores"
            titulo="Guardar borradores automáticamente"
            descripcion="Guarda lo que escribe en los formularios para recuperarlo si sale o se cierra la sesión."
            checked={preferencias.guardar_borradores}
            onChange={(v) => cambiar('guardar_borradores', v)}
          />
          <FilaSwitch
            id="pref-ayuda"
            titulo="Ayuda en los formularios"
            descripcion="Muestra indicaciones sobre campos obligatorios y atajos en cada formulario."
            checked={preferencias.ayuda_formularios}
            onChange={(v) => cambiar('ayuda_formularios', v)}
          />
          <FilaSwitch
            id="pref-atajos"
            titulo="Atajos de teclado"
            descripcion="Permite usar combinaciones de teclas para las acciones frecuentes."
            checked={preferencias.atajos_teclado}
            onChange={(v) => cambiar('atajos_teclado', v)}
          />
          {preferencias.atajos_teclado && (
            <dl className="atajos-lista" aria-label="Atajos disponibles">
              <dt><kbd>Alt</kbd> + <kbd>N</kbd></dt><dd>Nuevo registro de producto</dd>
              <dt><kbd>Alt</kbd> + <kbd>B</kbd></dt><dd>Ir al buscador de la página</dd>
              <dt><kbd>Alt</kbd> + <kbd>G</kbd></dt><dd>Guardar el formulario actual</dd>
              <dt><kbd>Esc</kbd></dt><dd>Cerrar la ventana emergente o cancelar</dd>
            </dl>
          )}
          <FilaSwitch
            id="pref-sesion"
            titulo="Avisar antes de cerrar la sesión"
            descripcion="Muestra un aviso 2 minutos antes de cerrar la sesión por inactividad."
            checked={preferencias.aviso_sesion}
            onChange={(v) => cambiar('aviso_sesion', v)}
          />
        </section>

        <div className="form-acciones" style={{ alignItems: 'center' }}>
          <p className="estado-texto" role="status" style={{ margin: '0 auto 0 0' }}>
            {sinGuardar && <><Icon name="info" style={{ width: '1rem', height: '1rem', verticalAlign: '-0.15em' }} /> Hay cambios sin guardar.</>}
          </p>
          <button type="button" className="btn btn-secundario" onClick={restablecer}>Restablecer</button>
          <button type="submit" className="btn btn-primario" disabled={guardando}>
            <Icon name="guardar" />{guardando ? 'Guardando…' : 'Guardar preferencias'}
          </button>
        </div>
      </form>
    </>
  );
}
