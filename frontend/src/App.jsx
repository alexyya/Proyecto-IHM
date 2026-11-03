import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Recuperar from './pages/Recuperar';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import ProductoForm from './pages/ProductoForm';
import Inventario from './pages/Inventario';
import Promociones from './pages/Promociones';
import PromocionWizard from './pages/PromocionWizard';
import Reportes from './pages/Reportes';
import Preferencias from './pages/Preferencias';
import NoEncontrado from './pages/NoEncontrado';

function Protegida({ children }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();
  if (cargando) return <p className="cargando" role="status">Cargando…</p>;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar" element={<Recuperar />} />
      <Route element={<Protegida><Layout /></Protegida>}>
        <Route index element={<Dashboard />} />
        <Route path="productos" element={<Productos />} />
        <Route path="productos/nuevo" element={<ProductoForm />} />
        <Route path="productos/:id/editar" element={<ProductoForm />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="promociones" element={<Promociones />} />
        <Route path="promociones/nueva" element={<PromocionWizard />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="configuracion" element={<Preferencias />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  );
}
