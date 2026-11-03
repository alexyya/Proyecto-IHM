import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, guardarToken, obtenerToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(Boolean(obtenerToken()));

  useEffect(() => {
    if (!obtenerToken()) return;
    api.get('/auth/me')
      .then((r) => setUsuario(r.usuario))
      .catch(() => guardarToken(null))
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(async (correo, password, recordar) => {
    const r = await api.post('/auth/login', { correo, password });
    guardarToken(r.token, recordar);
    setUsuario(r.usuario);
    return r.usuario;
  }, []);

  const logout = useCallback(() => {
    guardarToken(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    const alExpirar = () => logout();
    window.addEventListener('pv:sesion-expirada', alExpirar);
    return () => window.removeEventListener('pv:sesion-expirada', alExpirar);
  }, [logout]);

  const valor = useMemo(() => ({ usuario, cargando, login, logout }), [usuario, cargando, login, logout]);
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
