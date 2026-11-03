import { Link } from 'react-router-dom';
import { useTitulo } from '../components/ui';

export default function NoEncontrado() {
  useTitulo('Página no encontrada');
  return (
    <section className="tarjeta">
      <h1>Página no encontrada</h1>
      <p>La dirección que intentó abrir no existe en el sistema.</p>
      <Link to="/" className="btn btn-primario">Ir al Dashboard</Link>
    </section>
  );
}
