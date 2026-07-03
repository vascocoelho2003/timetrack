const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { signToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Regista um novo utilizador
 *     description: Cria um utilizador e devolve um token JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utilizador criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Email já registado
 */
router.post('/register', (req, res) => {
  const { email, password, username } = req.body;
  if (!email?.trim() || !password || !username?.trim()) {
    return res.status(400).json({ error: 'Email, password e nome são obrigatórios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password deve ter pelo menos 6 caracteres' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email já registado' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)'
  ).run(email.trim().toLowerCase(), hash, username.trim());

  const user = { id: result.lastInsertRowid, email: email.trim().toLowerCase(), username: username.trim() };
  const token = signToken(user);
  res.status(201).json({ user, token });
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sessão
 *     description: Autentica um utilizador e devolve um token JWT.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sessão iniciada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password são obrigatórios' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = signToken(user);
  res.json({
    user: { id: user.id, email: user.email, username: user.username, profile: user.profile },
    token,
  });
});

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Dados do utilizador autenticado
 *     description: Devolve as informações do utilizador atual.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Utilizador retornado com sucesso
 *       401:
 *         description: Token inválido ou ausente
 */
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, username, profile, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
  res.json(user);
});

module.exports = router;
