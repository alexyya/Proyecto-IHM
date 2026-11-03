import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import Modal from './Modal';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { usePreferencias } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';

const MENU = [
  { a: '/', texto: 'Dashboard', icono: 'dashboard', fin: true },
  { a: '/productos', texto: 'Productos', icono: 'productos' },
  { a: '/inventario', texto: 'Inventario', icono: 'inventario' },
  { a: '/promociones', texto: 'Promociones', icono: 'promociones' },
  { a: '/reportes', texto: 'Reportes', icono: 'reportes' },
  { a: '/configuracion', texto: 'Configuración', icono: 'configuracion' },
];

// Menú completo solo por encima de 80rem (1280 px CSS a 100 %); entre 48rem y 80rem, barra de íconos.
const CONSULTA_RIEL = '(max-width: 80rem)';
const consultaRiel = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(CONSULTA_RIEL).matches : false);

const iniciales = (n = '') => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export default function Layout() {
  const { usuario, logout } = useAuth();
  const { preferencias } = usePreferencias();
  const { mostrar } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [stockBajo, setStockBajo] = useState(0);
  const [avisoSesion, setAvisoSesion] = useState(false);
  const [segundos, setSegundos] = useState(120);
  const mainRef = useRef(null);
  // Menú lateral comprimible: con zoom alto se muestra solo con íconos o se oculta tras el botón «Menú»
  const [menuAbierto, setMenuAbierto] = useState(false);
  const btnMenuRef = useRef(null);
  const sidebarRef = useRef(null);
  // Riel de íconos automático según el ancho disponible (zoom del navegador); sin botón manual
  const [anchoRiel, setAnchoRiel] = useState(consultaRiel);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(CONSULTA_RIEL);
    const alCambiar = () => setAnchoRiel(mq.matches);
    alCambiar();
    mq.addEventListener?.('change', alCambiar);
    return () => mq.removeEventListener?.('change', alCambiar);
  }, []);
  const enRiel = anchoRiel;
  const cerrarMenu = useCallback((devolverFoco = true) => {
    setMenuAbierto(false);
    if (devolverFoco) {
      const btn = btnMenuRef.current;
      btn?.focus();
    }
  }, []);
  const expandido = menuAbierto || !enRiel;
  useEffect(() => { setMenuAbierto(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuAbierto) return undefined;
    sidebarRef.current?.querySelector('.nav-link')?.focus();
    const alTeclear = (e) => { if (e.key === 'Escape') { e.preventDefault(); cerrarMenu(); } };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [menuAbierto, cerrarMenu]);
  const reiniciarInactividad = useRef(null);
  const primeraCarga = useRef(true);

  // Contador de alertas de stock bajo para la campana
  const cargarAlertas = useCallback(() => {
    api.get('/dashboard').then((d) => setStockBajo(d.totales.stockBajo)).catch(() => {});
  }, []);
  useEffect(() => {
    cargarAlertas();
    window.addEventListener('pv:stock', cargarAlertas);
    return () => window.removeEventListener('pv:stock', cargarAlertas);
  }, [cargarAlertas]);

  // Al cambiar de página, mover el foco al título principal (h1)
  useEffect(() => {
    if (primeraCarga.current) { primeraCarga.current = false; return; }
    const t = setTimeout(() => {
      const h1 = mainRef.current?.querySelector('h1');
      if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: false }); }
    }, 50);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const cerrarSesion = useCallback(() => {
    setAvisoSesion(false);
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  // Atajos de teclado globales (si están habilitados)
  useEffect(() => {
    if (!preferencias.atajos_teclado) return undefined;
    const alTeclear = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const modal = document.querySelector('[data-modal]');
      if (e.code === 'KeyG') {
        const form = (modal || document).querySelector('form[data-atajo-guardar]');
        if (form) { e.preventDefault(); form.requestSubmit(); }
        return;
      }
      if (modal) return;
      if (e.code === 'KeyN') {
        e.preventDefault();
        navigate('/productos/nuevo');
      } else if (e.code === 'KeyB') {
        const buscador = document.querySelector('[data-buscador]');
        if (buscador) { e.preventDefault(); buscador.focus(); buscador.select?.(); }
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [preferencias.atajos_teclado, navigate]);

  // Aviso de cierre de sesión por inactividad (13 min; ?demoSesion=1 → 20 s)
  useEffect(() => {
    if (!preferencias.aviso_sesion) return undefined;
    try {
      if (new URLSearchParams(window.location.search).get('demoSesion') === '1') sessionStorage.setItem('pv_demo_sesion', '1');
    } catch { /* ignorar */ }
    let demo = false;
    try { demo = sessionStorage.getItem('pv_demo_sesion') === '1'; } catch { demo = false; }
    const espera = demo ? 20 * 1000 : 13 * 60 * 1000;
    let temporizador;
    const reiniciar = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => { setSegundos(120); setAvisoSesion(true); }, espera);
    };
    const eventos = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const alActuar = () => { if (!document.querySelector('[data-aviso-sesion]')) reiniciar(); };
    eventos.forEach((ev) => window.addEventListener(ev, alActuar, { passive: true }));
    reiniciar();
    reiniciarInactividad.current = reiniciar;
    return () => {
      reiniciarInactividad.current = null;
      clearTimeout(temporizador);
      eventos.forEach((ev) => window.removeEventListener(ev, alActuar));
    };
  }, [preferencias.aviso_sesion]);

  // Cuenta regresiva del aviso
  useEffect(() => {
    if (!avisoSesion) return undefined;
    const id = setInterval(() => {
      setSegundos((s) => {
        if (s <= 1) { clearInterval(id); cerrarSesion(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [avisoSesion, cerrarSesion]);

  const seguirConectado = () => {
    setAvisoSesion(false);
    mostrar('Tu sesión sigue activa.', 'info');
    reiniciarInactividad.current?.();
  };

  const minutos = Math.floor(segundos / 60);
  const resto = String(segundos % 60).padStart(2, '0');

  return (
    <div className={`app${enRiel ? ' menu-riel' : ''}${menuAbierto ? ' menu-abierto' : ''}`}>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <aside className="sidebar" id="menu-lateral" ref={sidebarRef}>
        <NavLink to="/" className="logo" aria-label="Plaza Vea – ir al Dashboard">
          <img src="/logo-plazavea-rojo.png" alt="Plaza Vea" width="458" height="162" />
          <span className="logo-mono" aria-hidden="true">p<b>V</b></span>
        </NavLink>
        <nav className="nav-principal" aria-label="Menú principal">
          <ul>
            {MENU.map((m) => (
              <li key={m.a}>
                <NavLink to={m.a} end={m.fin} aria-label={m.texto} data-texto={m.texto}
                  className={({ isActive }) => `nav-link${isActive ? ' activo' : ''}`}>
                  <Icon name={m.icono} />
                  <span className="nav-texto">{m.texto}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-pie">
          <button type="button" className="btn-salir" onClick={cerrarSesion} aria-label="Cerrar sesión" data-texto="Cerrar sesión">
            <Icon name="salir" />
            <span className="nav-texto">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {menuAbierto && <div className="fondo-menu" aria-hidden="true" onClick={() => cerrarMenu()} />}

      <div className="zona-principal">
        <header className="encabezado">
          <div className="encabezado-izq">
            <button type="button" className="btn-menu" ref={btnMenuRef}
              aria-expanded={menuAbierto} aria-controls="menu-lateral"
              onClick={() => (menuAbierto ? cerrarMenu() : setMenuAbierto(true))}>
              <Icon name={menuAbierto ? 'cerrar' : 'menu'} />
              <span>{menuAbierto ? 'Cerrar menú' : 'Menú'}</span>
            </button>
            <p className="encabezado-titulo">Sistema de Gestión Comercial</p>
          </div>
          <div className="encabezado-acciones">
            <button
              type="button"
              className="btn-campana"
              aria-label={`${stockBajo} ${stockBajo === 1 ? 'alerta' : 'alertas'} de stock bajo`}
              title="Ver productos con stock bajo"
              onClick={() => navigate('/inventario?filtro=bajo')}
            >
              <Icon name="campana" />
              {stockBajo > 0 && <span className="insignia" aria-hidden="true">{stockBajo}</span>}
            </button>
            <div className="usuario">
              <span className="avatar" aria-hidden="true">{iniciales(usuario?.nombre)}</span>
              <span>
                <span className="usuario-nombre">{usuario?.nombre}</span>
                <span className="usuario-rol">{usuario?.rol}</span>
              </span>
            </div>
          </div>
        </header>

        <main id="contenido" className="contenido" ref={mainRef} tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {avisoSesion && (
        <Modal
          titulo="Tu sesión se cerrará en 2 minutos"
          icono="reloj"
          rol="alertdialog"
          onClose={seguirConectado}
          describedBy="aviso-sesion-texto"
          acciones={(
            <>
              <button type="button" className="btn btn-secundario" onClick={cerrarSesion}>Cerrar sesión</button>
              <button type="button" className="btn btn-primario" onClick={seguirConectado} data-autofocus>Seguir conectado</button>
            </>
          )}
        >
          <div data-aviso-sesion id="aviso-sesion-texto">
            <p>
              No detectamos actividad durante un tiempo. Por tu seguridad, la sesión se cerrará automáticamente.
              {preferencias.guardar_borradores && ' Tus formularios en curso se guardaron como borrador y podrás recuperarlos al volver.'}
            </p>
            <p><strong>Tiempo restante: {minutos}:{resto}</strong></p>
          </div>
        </Modal>
      )}
    </div>
  );
}
