// Íconos SVG en línea (decorativos: aria-hidden). El significado siempre va en texto.
const RUTAS = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  productos: <><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>,
  inventario: <><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9" /><path d="M10 13h4" /></>,
  promociones: <><path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
  reportes: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
  configuracion: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>,
  menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
  contraer: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="M16 15l-3-3 3-3" /></>,
  expandir: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="M13 9l3 3-3 3" /></>,
  camion: <><path d="M1 4h13v12H1z" /><path d="M14 8h4l3 3v5h-7" /><circle cx="5.5" cy="18.5" r="2" /><circle cx="17.5" cy="18.5" r="2" /></>,
  megafono: <><path d="M3 10v4a1 1 0 001 1h3l6 4V5L7 9H4a1 1 0 00-1 1z" /><path d="M17 8a5 5 0 010 8" /><path d="M20 5a9 9 0 010 14" /></>,
  salir: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  campana: <><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></>,
  editar: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></>,
  eliminar: <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /></>,
  mas: <><path d="M12 5v14M5 12h14" /></>,
  buscar: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  alerta: <><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  error: <><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></>,
  exito: <><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  cerrar: <><path d="M18 6L6 18M6 6l12 12" /></>,
  ojo: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
  ojoNo: <><path d="M17.9 17.9A10.1 10.1 0 0112 20c-7 0-11-8-11-8a18.5 18.5 0 015.1-5.9M9.9 4.2A9.1 9.1 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.2 3.2M14.1 14.1a3 3 0 11-4.2-4.2" /><path d="M1 1l22 22" /></>,
  flechaArriba: <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>,
  flechaAbajo: <><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></>,
  descargar: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></>,
  subir: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></>,
  imagen: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></>,
  check: <><path d="M20 6L9 17l-5-5" /></>,
  reloj: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  guardar: <><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></>,
  volver: <><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></>,
  calendario: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
};

export default function Icon({ name, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {RUTAS[name] || null}
    </svg>
  );
}
