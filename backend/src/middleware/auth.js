const dotent = require('dotenv')
dotent.config();

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET ;

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token em falta' });
  }

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, profile: user.profile },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authMiddleware, signToken, JWT_SECRET };
