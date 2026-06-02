const jwt = require('jsonwebtoken');

const DEFAULT_JWT_SECRET = 'dashboard-humano-secret-key-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET debe estar configurado en producción para el dashboard humano.');
}

function authenticateToken(req, res, next) {
  // Obtener token solo de la cookie (httpOnly)
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
}

module.exports = { authenticateToken, JWT_SECRET };
