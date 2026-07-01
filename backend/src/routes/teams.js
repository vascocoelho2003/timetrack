const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { isTeamAdmin, isTeamMember } = require('../utils/permissions');

const router = express.Router();
router.use(authMiddleware);

/**
 * @openapi
 * /api/teams:
 *   get:
 *     tags: [Teams]
 *     summary: Lista as equipas do utilizador
 *     description: Devolve as equipas às quais o utilizador autenticado pertence.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de equipas
 */
router.get('/', (req, res) => {
  const teams = db.prepare(`
    SELECT t.*, tm.role
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = ?
    ORDER BY t.name
  `).all(req.user.id);
  res.json(teams);
});

/**
 * @openapi
 * /api/teams:
 *   post:
 *     tags: [Teams]
 *     summary: Cria uma equipa
 *     description: Cria uma nova equipa e define o utilizador como administrador.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Equipa criada com sucesso
 *       400:
 *         description: Nome inválido
 */
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome da equipa é obrigatório' });
  }

  const insertTeam = db.prepare('INSERT INTO teams (name, created_by) VALUES (?, ?)');
  const insertMember = db.prepare(
    'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)'
  );

  const tx = db.transaction(() => {
    const result = insertTeam.run(name.trim(), req.user.id);
    const teamId = result.lastInsertRowid;
    insertMember.run(teamId, req.user.id, 'admin');
    return db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  });

  const team = tx();
  res.status(201).json({ ...team, role: 'admin' });
});

/**
 * @openapi
 * /api/teams/{teamId}/members:
 *   get:
 *     tags: [Teams]
 *     summary: Lista membros da equipa
 *     description: Devolve todos os membros de uma equipa.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de membros
 */
router.get('/:teamId/members', (req, res) => {
  const teamId = +req.params.teamId;
  if (!isTeamMember(req.user.id, teamId)) {
    return res.status(403).json({ error: 'Sem acesso à equipa' });
  }

  const members = db.prepare(`
    SELECT u.id, u.email, u.name, tm.role
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = ?
    ORDER BY u.name
  `).all(teamId);

  res.json(members);
});

/**
 * @openapi
 * /api/teams/{teamId}/members:
 *   post:
 *     tags: [Teams]
 *     summary: Adiciona membro à equipa
 *     description: Adiciona um utilizador a uma equipa, disponível apenas para administradores.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *     responses:
 *       201:
 *         description: Membro adicionado
 */
router.post('/:teamId/members', (req, res) => {
  const teamId = +req.params.teamId;
  const { email, role = 'member' } = req.body;

  if (!isTeamAdmin(req.user.id, teamId)) {
    return res.status(403).json({ error: 'Apenas admins podem adicionar membros' });
  }
  if (!email?.trim()) {
    return res.status(400).json({ error: 'Email é obrigatório' });
  }
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Role inválida' });
  }

  const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?')
    .get(email.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'Utilizador não encontrado. Deve registar-se primeiro.' });
  }

  const existing = db.prepare(
    'SELECT id FROM team_members WHERE team_id = ? AND user_id = ?'
  ).get(teamId, user.id);
  if (existing) {
    return res.status(409).json({ error: 'Utilizador já pertence à equipa' });
  }

  db.prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)')
    .run(teamId, user.id, role);

  res.status(201).json({ ...user, role });
});

/**
 * @openapi
 * /api/teams/{teamId}/members/{userId}:
 *   delete:
 *     tags: [Teams]
 *     summary: Remove membro da equipa
 *     description: Remove um utilizador da equipa, disponível apenas para administradores.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Membro removido com sucesso
 */
router.delete('/:teamId/members/:userId', (req, res) => {
  const teamId = +req.params.teamId;
  const userId = +req.params.userId;

  if (!isTeamAdmin(req.user.id, teamId)) {
    return res.status(403).json({ error: 'Apenas admins podem remover membros' });
  }
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Não pode remover-se a si próprio' });
  }

  const result = db.prepare(
    'DELETE FROM team_members WHERE team_id = ? AND user_id = ?'
  ).run(teamId, userId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Membro não encontrado' });
  }
  res.status(204).send();
});

/**
 * @openapi
 * /api/teams/{teamId}:
 *   delete:
 *     tags: [Teams]
 *     summary: Elimina uma equipa
 *     description: Remove uma equipa, disponível apenas para administradores.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Equipa eliminada com sucesso
 */
router.delete('/:teamId', (req, res) => {
  const teamId = +req.params.teamId;
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!team) return res.status(404).json({ error: 'Equipa não encontrada' });
  if (!isTeamAdmin(req.user.id, teamId)) {
    return res.status(403).json({ error: 'Apenas admins podem eliminar equipas' });
  }

  db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
  res.status(204).send();
});

module.exports = router;
