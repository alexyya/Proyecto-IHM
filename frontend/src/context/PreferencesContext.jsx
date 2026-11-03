import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

/**
 * Preferencias de accesibilidad aplicadas globalmente:
 * - «Apoyo visual»: alto contraste y foco reforzado.
 * - «Ayuda en formularios»: borradores, ayuda, atajos y aviso de sesión.
 * El tamaño del texto NO es una preferencia: depende solo del zoom del navegador
 * (Ctrl + / Ctrl + rueda). Todo se mide en rem y la interfaz se reorganiza con
 * media queries, sin desplazamiento horizontal hasta el 400 % (WCAG 1.4.4 y 1.4.10).
 */
export const PREFERENCIAS_POR_DEFECTO = {
  alto_contraste: false,
  foco_reforzado: false,
  guardar_borradores: true,
  ayuda_formularios: true,
  aviso_sesion: true,
  atajos_teclado: true,
};

const CLAVE_LOCAL = 'pv_preferencias';
const PreferencesContext = createContext(null);

function leerLocal() {
  try {
    const t = localStorage.getItem(CLAVE_LOCAL);
    return t ? limpiar(JSON.parse(t)) : PREFERENCIAS_POR_DEFECTO;
  } catch {
    return PREFERENCIAS_POR_DEFECTO;
  }
}

/** Solo se conservan las claves conocidas (descarta valores antiguos como escala_texto). */
function limpiar(p) {
  const r = {};
  Object.keys(PREFERENCIAS_POR_DEFECTO).forEach((k) => { r[k] = p?.[k] ?? PREFERENCIAS_POR_DEFECTO[k]; });
  return r;
}

/** Aplica las clases de contraste y foco al elemento <html>. */
function aplicarEnDocumento(p) {
  const html = document.documentElement;
  html.classList.toggle('alto-contraste', Boolean(p.alto_contraste));
  html.classList.toggle('foco-reforzado', Boolean(p.foco_reforzado));
}

export function PreferencesProvider({ children }) {
  const { usuario } = useAuth();
  const [preferencias, setPreferencias] = useState(leerLocal);
  // Últimas preferencias confirmadas por el servidor (para detectar cambios sin guardar)
  const [guardadas, setGuardadas] = useState(leerLocal);

  // Cargar preferencias del usuario autenticado
  useEffect(() => {
    if (!usuario) return;
    api.get('/preferencias')
      .then((p) => {
        const n = limpiar(p);
        setPreferencias(n);
        setGuardadas(n);
      })
      .catch(() => {});
  }, [usuario]);

  // Aplicar inmediatamente cada cambio
  useEffect(() => {
    aplicarEnDocumento(preferencias);
    try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(preferencias)); } catch { /* sin almacenamiento */ }
  }, [preferencias]);

  const guardar = useCallback(async (nuevas) => {
    const r = await api.put('/preferencias', nuevas);
    const n = limpiar(r.preferencias);
    setPreferencias(n);
    setGuardadas(n);
    return r;
  }, []);

  const valor = useMemo(
    () => ({ preferencias, setPreferencias, guardar, guardadas }),
    [preferencias, guardar, guardadas]
  );
  return <PreferencesContext.Provider value={valor}>{children}</PreferencesContext.Provider>;
}

export const usePreferencias = () => useContext(PreferencesContext);
