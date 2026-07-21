const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { isTeamAdmin, isTeamMember } = require('../utils/permissions');

const router = express.Router();
router.use(authMiddleware);

const MAX_PROJECT_DESCRIPTION_LENGTH = 50;

function sanitizeProjectDescription(value = '') {
  return String(value ?? '').trim().slice(0, MAX_PROJECT_DESCRIPTION_LENGTH);
}

/**
 * @openapi
 * /api/projects/team/{teamId}:
 *   get:
 *     tags: [Projects]
 *     summary: Lista projetos de uma equipa
 *     description: Devolve todos os projetos de uma equipa.
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
 *         description: Lista de projetos
 */
router.get('/team/:teamId', (req, res) => {
  const teamId = +req.params.teamId;
  if (!isTeamMember(req.user.id, teamId)) {
    return res.status(403).json({ error: 'Sem acesso à equipa' });
  }

  const projects = db.prepare(
    'SELECT * FROM projects WHERE team_id = ? ORDER BY name'
  ).all(teamId);

  res.json(projects);
});

/**
 * @openapi
 * /api/projects/team/{teamId}:
 *   post:
 *     tags: [Projects]
 *     summary: Cria um projeto
 *     description: Cria um projeto numa equipa e cria uma lista inicial chamada A fazer.
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Projeto criado com sucesso
 */
router.post('/team/:teamId', (req, res) => {
  const teamId = +req.params.teamId;
  const { name, description = '' } = req.body;

  if (!isTeamAdmin(req.user.id, teamId)) {
    return res.status(403).json({ error: 'Apenas admins podem criar projetos' });
  }
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome do projeto é obrigatório' });
  }

  const safeDescription = sanitizeProjectDescription(description);

  const result = db.prepare(
    'INSERT INTO projects (team_id, name, description) VALUES (?, ?, ?)'
  ).run(teamId, name.trim(), safeDescription);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);

  db.prepare('INSERT INTO task_lists (project_id, name, position) VALUES (?, ?, ?)')
    .run(project.id, 'A fazer', 0);

  res.status(201).json(project);
});

/**
 * @openapi
 * /api/projects/{projectId}:
 *   get:
 *     tags: [Projects]
 *     summary: Detalhes de um projeto
 *     description: Devolve os dados de um projeto específico.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Projeto encontrado
 */
router.get('/:projectId', (req, res) => {
  const projectId = +req.params.projectId;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
  if (!isTeamMember(req.user.id, project.team_id)) {
    return res.status(403).json({ error: 'Sem acesso' });
  }
  res.json(project);
});

/**
 * @openapi
 * /api/projects/{projectId}:
 *   put:
 *     tags: [Projects]
 *     summary: Atualiza um projeto
 *     description: Atualiza os dados de um projeto, disponível apenas para administradores.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Projeto atualizado
 */
router.put('/:projectId', (req, res) => {
  const projectId = +req.params.projectId;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
  if (!isTeamAdmin(req.user.id, project.team_id)) {
    return res.status(403).json({ error: 'Apenas admins podem editar projetos' });
  }

  const { name, description } = req.body;
  const safeDescription = description !== undefined
    ? sanitizeProjectDescription(description)
    : project.description;

  db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?')
    .run(
      name?.trim() || project.name,
      safeDescription,
      projectId
    );

  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId));
});

/**
 * @openapi
 * /api/projects/{projectId}:
 *   delete:
 *     tags: [Projects]
 *     summary: Elimina um projeto
 *     description: Remove um projeto, disponível apenas para administradores.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Projeto eliminado com sucesso
 */
router.delete('/:projectId', (req, res) => {
  const projectId = +req.params.projectId;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });
  if (!isTeamAdmin(req.user.id, project.team_id)) {
    return res.status(403).json({ error: 'Apenas admins podem eliminar projetos' });
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
  res.status(204).send();
});

router.get('/:projectId/users', (req, res) => {
  const { projectId } = req.params;

  const users = db.prepare(`
    SELECT u.id, u.username, u.email, tm.role FROM users u JOIN team_members tm ON tm.user_id = u.id JOIN projects p ON p.team_id = tm.team_id WHERE p.id = ? ORDER BY u.username
  `).all(projectId);

  return res.status(200).json(users);
});

router.get('/', (req, res) => {
  const user_id = req.user.id;
  const projects = db.prepare(`SELECT p.* FROM projects p JOIN team_members tm ON p.team_id = tm.team_id WHERE tm.user_id = ?`).all(user_id);

  return res.status(200).json(projects);
});

module.exports = router;
