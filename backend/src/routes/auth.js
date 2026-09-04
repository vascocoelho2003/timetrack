const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { signToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * Verificar se as duas passwords são iguais
 * @param {*} password 
 * @param {*} passwordConfirm 
 * @returns 
 */
function passwordsMatch(password, passwordConfirm) {
  if (typeof password !== 'string' || typeof passwordConfirm !== 'string') {
    return false;
  }
  const a = Buffer.from(password, 'utf8');
  const b = Buffer.from(passwordConfirm, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

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
 *             required: [email, password, passwordConfirm, username, department_id]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               passwordConfirm:
 *                 type: string
 *               username:
 *                 type: string
 *               department_id:
 *                 type: number
 *     responses:
 *       201:
 *         description: Utilizador criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: Email já registado
 */
router.post('/register', (req, res) => {
  const { email, password, passwordConfirm, username, department_id } = req.body;
  if (!email?.trim() || !password || !passwordConfirm || !username?.trim()) {
    return res.status(400).json({ error: 'Email, password, confirmação e nome são obrigatórios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password deve ter pelo menos 6 caracteres' });
  }
  if (!passwordsMatch(password, passwordConfirm)) {
    return res.status(400).json({ error: 'As passwords não coincidem' });
  }

  const departmentId = Number(department_id);
  if (!department_id || Number.isNaN(departmentId)) {
    return res.status(400).json({ error: 'Departamento é obrigatório' });
  }
  const department = db.prepare('SELECT id FROM departments WHERE id = ?').get(departmentId);
  if (!department) {
    return res.status(400).json({ error: 'Departamento inválido' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email já registado' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, username, department_id) VALUES (?, ?, ?, ?)'
  ).run(email.trim().toLowerCase(), hash, username.trim(), departmentId);

  const client = db.prepare(`INSERT INTO clients (client_type, user_id) VALUES (?, ?)`).run('person',result.lastInsertRowid)

  const user = { id: result.lastInsertRowid, email: email.trim().toLowerCase(), username: username.trim(), department_id: departmentId };
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
    user: { id: user.id, username: user.username, email: user.email, department_id: user.department_id },
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
  const user = db.prepare('SELECT id, email, username, profile, created_at, department_id FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' });
  res.json(user);
});

/**
 * Obtém os dados do utilizador logado
 */
router.put('/me', authMiddleware, (req, res) => {
  const { username, email, password, department_id } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedUsername = username?.trim();

  if (!normalizedEmail || !normalizedUsername) {
    return res.status(400).json({ error: 'Email e username são obrigatórios' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  if (password !== undefined && password !== '' && password.length < 6) {
    return res.status(400).json({ error: 'Password deve ter pelo menos 6 caracteres' });
  }

  const departmentId = Number(department_id);
  if (!department_id || Number.isNaN(departmentId)) {
    return res.status(400).json({ error: 'Departamento é obrigatório' });
  }
  const department = db.prepare('SELECT id FROM departments WHERE id = ?').get(departmentId);
  if (!department) {
    return res.status(400).json({ error: 'Departamento inválido' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?')
    .get(normalizedEmail, req.user.id);
  if (existing) {
    return res.status(409).json({ error: 'Email já registado' });
  }

  if (password) {
    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare(
      'UPDATE users SET username = ?, email = ?, password_hash = ?, department_id = ? WHERE id = ?'
    ).run(normalizedUsername, normalizedEmail, passwordHash, departmentId, req.user.id);
  } else {
    db.prepare(
      'UPDATE users SET username = ?, email = ?, department_id = ? WHERE id = ?'
    ).run(normalizedUsername, normalizedEmail, departmentId, req.user.id);
  }

  const user = db.prepare(
    'SELECT id, email, username, profile, department_id FROM users WHERE id = ?'
  ).get(req.user.id);
  const token = signToken(user);
  res.json({ user, token });
});

/**
 * Obter departamento do utilizador logado
 */
router.get('/getDepartment', authMiddleware, async (req, res) => {
  const user_id = req.user.id;
  const department = db.prepare(`
    SELECT d.name
    FROM users u
    JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(user_id);
  return res.status(200).json({ department });
});

module.exports = router;
