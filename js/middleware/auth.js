const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: 'Token de acesso necessário' });
  }
  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ success: false, message: 'Token inválido ou expirado' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Acesso negado. Apenas administradores.',
    });
  }
}

module.exports = { authenticateToken, requireAdmin };
