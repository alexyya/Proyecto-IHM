import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';

const ToastContext = createContext(null);
const ICONOS = { exito: 'exito', info: 'info', error: 'error' };

/**
 * Notificaciones no intrusivas. La región role="status" (aria-live="polite")
 * existe siempre en el DOM para que los lectores de pantalla anuncien cada mensaje.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const cerrar = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const mostrar = useCallback((mensaje, tipo = 'exito', duracion = 6000) => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((t) => [...t.slice(-2), { id, mensaje, tipo }]);
    if (duracion) setTimeout(() => cerrar(id), duracion);
  }, [cerrar]);

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <section className="toasts" aria-label="Notificaciones">
        <div role="status" aria-live="polite" aria-atomic="false" className="toasts-lista">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.tipo}`}>
              <Icon name={ICONOS[t.tipo] || 'info'} />
              <p>
                <span className="sr-only">{t.tipo === 'error' ? 'Error: ' : t.tipo === 'exito' ? 'Éxito: ' : 'Aviso: '}</span>
                {t.mensaje}
              </p>
              <button type="button" className="btn-icono" onClick={() => cerrar(t.id)} aria-label="Cerrar notificación">
                <Icon name="cerrar" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
