import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Ventana modal accesible: role dialog/alertdialog, aria-modal, título asociado,
 * foco inicial dentro, foco atrapado con Tab, Esc para cerrar y retorno del foco
 * al elemento que la abrió.
 */
export default function Modal({ titulo, icono, children, onClose, rol = 'dialog', ancho = false, acciones, describedBy }) {
  const ref = useRef(null);
  const tituloId = useId();
  const anterior = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    anterior.current = document.activeElement;
    const nodo = ref.current;
    const autofoco = nodo.querySelector('[data-autofocus]') || nodo.querySelector(ENFOCABLES);
    (autofoco || nodo).focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      const prev = anterior.current;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        setTimeout(() => prev.focus(), 0);
      }
    };
  }, []);

  function alTeclear(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCloseRef.current?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...ref.current.querySelectorAll(ENFOCABLES)].filter((el) => el.offsetParent !== null);
    if (!items.length) { e.preventDefault(); return; }
    const primero = items[0];
    const ultimo = items[items.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  }

  return createPortal(
    <div className="modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget && rol === 'dialog') onClose?.(); }}>
      <div
        ref={ref}
        className={`modal${ancho ? ' ancho' : ''}`}
        role={rol}
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={alTeclear}
        data-modal
      >
        <h2 id={tituloId}>
          {icono && <Icon name={icono} className={icono === 'eliminar' || icono === 'error' ? 'icono-peligro' : 'icono-aviso'} />}
          {titulo}
        </h2>
        {children}
        {acciones && <div className="modal-acciones">{acciones}</div>}
      </div>
    </div>,
    document.body
  );
}

/** Diálogo de confirmación reutilizable. */
export function Confirmacion({ titulo, mensaje, textoConfirmar, onConfirm, onCancel, peligro = false, ocupado = false }) {
  const descId = useId();
  return (
    <Modal
      titulo={titulo}
      icono={peligro ? 'eliminar' : 'alerta'}
      rol="alertdialog"
      onClose={onCancel}
      describedBy={descId}
      acciones={(
        <>
          <button type="button" className="btn btn-secundario" onClick={onCancel} data-autofocus>Cancelar</button>
          <button type="button" className={`btn ${peligro ? 'btn-peligro' : 'btn-primario'}`} onClick={onConfirm} disabled={ocupado}>
            {ocupado ? 'Procesando…' : textoConfirmar}
          </button>
        </>
      )}
    >
      <p id={descId}>{mensaje}</p>
    </Modal>
  );
}
