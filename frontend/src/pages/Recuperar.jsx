import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { ErrorCampo, Requerido, propsCampo, useTitulo } from '../components/ui';

export default function Recuperar() {
  useTitulo('Recuperar contraseña');
  const [correo, setCorreo] = useState('');
  const [errores, setErrores] = useState({});
  const [enviado, setEnviado] = useState(false);

  function enviar(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setErrores({ correo: 'Ingrese un correo válido. Ejemplo: usuario@spsa.com.pe' });
      document.getElementById('campo-correo')?.focus();
      return;
    }
    setErrores({});
    setEnviado(true);
  }

  return (
    <div className="login-pagina">
      <header className="login-cabecera">
        <Link to="/login" className="login-logo" aria-label="Plaza Vea – volver al inicio de sesión">
          <img src="/logo-plazavea-rojo.png" alt="Plaza Vea" width="458" height="162" />
        </Link>
      </header>
      <main className="login-contenedor">
        <div className="login-tarjeta">
          <div className="login-cuerpo">
            <h1>Recuperar Contraseña</h1>
            <p className="sub">Ingrese su correo electrónico corporativo</p>
            <div role="status" aria-live="polite">
              {enviado ? (
                <div className="login-aviso login-exito">
                  <Icon name="check" />
                  <p>Si el correo está registrado, recibirá un enlace para restablecer su contraseña en los próximos minutos.</p>
                </div>
              ) : (
                <div className="login-aviso">
                  <Icon name="info" />
                  <p>Se enviará un enlace de recuperación a su correo corporativo registrado.</p>
                </div>
              )}
            </div>
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
              <button type="submit" className="btn btn-primario btn-principal-login">Mandar correo</button>
            </form>
            <p className="login-volver">
              <Link to="/login" className="enlace-rojo"><span aria-hidden="true">‹ </span>Volver al inicio de sesión</Link>
            </p>
            <hr className="login-separador" />
          </div>
        </div>
        <p className="login-pie">© 2026 Supermercados Peruanos S.A. - Todos los derechos reservados</p>
      </main>
    </div>
  );
}
