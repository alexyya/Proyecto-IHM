import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { ErrorCampo, Requerido, propsCampo, useTitulo } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const CLAVE_CORREO = 'pv_correo_recordado';

export default function Login() {
  useTitulo('Iniciar sesión');
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [correo, setCorreo] = useState(() => {
    try { return localStorage.getItem(CLAVE_CORREO) || ''; } catch { return ''; }
  });
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [recordar, setRecordar] = useState(() => {
    try { return Boolean(localStorage.getItem(CLAVE_CORREO)); } catch { return false; }
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={location.state?.desde || '/'} replace />;

  async function enviar(e) {
    e.preventDefault();
    const err = {};
    if (!correo.trim()) err.correo = 'Ingrese su correo corporativo. Ejemplo: usuario@spsa.com.pe';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) err.correo = 'El correo no tiene un formato válido. Ejemplo: usuario@spsa.com.pe';
    if (!password) err.password = 'Ingrese su contraseña.';
    setErrores(err);
    setErrorGeneral('');
    if (Object.keys(err).length) {
      document.getElementById(`campo-${Object.keys(err)[0]}`)?.focus();
      return;
    }
    setEnviando(true);
    try {
      await login(correo.trim(), password, recordar);
      try {
        if (recordar) localStorage.setItem(CLAVE_CORREO, correo.trim());
        else localStorage.removeItem(CLAVE_CORREO);
      } catch { /* ignorar */ }
      navigate(location.state?.desde || '/', { replace: true });
    } catch (ex) {
      setErrorGeneral(ex.message);
      setEnviando(false);
    }
  }

  return (
    <div className="login-pagina">
      <header className="login-cabecera">
        <span className="login-logo"><img src="/logo-plazavea-rojo.png" alt="Plaza Vea" width="458" height="162" /></span>
      </header>
      <main className="login-contenedor">
        <div className="login-tarjeta">
          <div className="login-cuerpo">
            <h1>¡Bienvenido de nuevo!</h1>
            <p className="sub">Por favor ingrese para continuar</p>

            {errorGeneral && (
              <div className="alerta-error" role="alert">
                <Icon name="error" />
                <span>{errorGeneral}</span>
              </div>
            )}

            <form onSubmit={enviar} noValidate>
              <div className="campo">
                <label htmlFor="campo-correo">Correo Electrónico <Requerido /></label>
                <input
                  {...propsCampo('correo', errores, { requerido: true })}
                  className="control"
                  type="email"
                  autoComplete="email"
                  placeholder="usuario@spsa.com.pe"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                />
                <ErrorCampo campo="correo" error={errores.correo} />
              </div>

              <div className="campo">
                <label htmlFor="campo-password">Contraseña <Requerido /></label>
                <div className="campo-clave">
                  <input
                    {...propsCampo('password', errores, { requerido: true })}
                    className="control"
                    type={verClave ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Ingrese su contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-ver-clave"
                    aria-label="Mostrar contraseña"
                    aria-pressed={verClave}
                    aria-controls="campo-password"
                    title={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setVerClave((v) => !v)}
                  >
                    <Icon name={verClave ? 'ojoNo' : 'ojo'} />
                  </button>
                </div>
                <ErrorCampo campo="password" error={errores.password} />
              </div>

              <div className="login-fila">
                <label className="check" htmlFor="recordarme">
                  <input id="recordarme" type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
                  Recordarme en este equipo
                </label>
                <Link to="/recuperar" className="enlace-rojo">¿Olvidaste tu contraseña?</Link>
              </div>

              <button type="submit" className="btn btn-primario btn-principal-login" disabled={enviando}>
                {enviando ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>
            <hr className="login-separador" />

            <div className="usuarios-demo">
              <strong>Usuarios de prueba (entorno académico):</strong>
              <ul>
                <li>admin@spsa.com.pe · Admin123</li>
                <li>coordinador@spsa.com.pe · Coord123</li>
                <li>inventario@spsa.com.pe · Inv123</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="login-pie">© 2026 Supermercados Peruanos S.A. - Todos los derechos reservados</p>
      </main>
    </div>
  );
}
