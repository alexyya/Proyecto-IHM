// Middleware de autenticación con JWT (cabecera Authorization: Bearer <token>)
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'clave_desarrollo_ihm';

function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function requireAuth(req, res, next) {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');
  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ mensaje: 'Debe iniciar sesión para continuar.' });
  }
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ mensaje: 'Su sesión expiró. Vuelva a iniciar sesión.' });
  }
}

module.exports = { firmarToken, requireAuth };
