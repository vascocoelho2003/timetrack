const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const {
  isTeamAdmin,
  isTeamMember,
  getTeamIdForProject,
  attachAssignees,
} = require('../utils/permissions');

const router = express.Router();
router.use(authMiddleware);

/**
 * @openapi
 * /api/task-lists/project/{projectId}:
 *   get:
 *     tags: [Task Lists]
 *     summary: Lista listas de um projeto
 *     description: Devolve as listas de tarefas de um projeto.
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
 *         description: Lista de listas de tarefas
 */
router.get('/project/:projectId', (req, res) => {
  const projectId = +req.params.projectId;
  const teamId = getTeamIdForProject(projectId);
  if (!teamId || !isTeamMember(req.user.id, teamId)) {
    return res.status(403).json({ error: 'Sem acesso' });
  }

  const lists = db.prepare(
    'SELECT * FROM task_lists WHERE project_id = ? ORDER BY position, id'
  ).all(projectId);

  res.json(lists);
});

/**
 * @openapi
 * /api/task-lists/project/{projectId}:
 *   post:
 *     tags: [Task Lists]
 *     summary: Cria uma lista de tarefas
 *     description: Cria uma nova lista num projeto.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
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
 *     responses:
 *       201:
 *         description: Lista criada com sucesso
 */
router.post('/project/:projectId', (req, res) => {
  const projectId = +req.params.projectId;
  const teamId = getTeamIdForProject(projectId);
  if (!teamId || !isTeamAdmin(req.user.id, teamId)) {
    return res.status(403).json({ error: 'Apenas admins podem criar listas' });
  }

  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as m FROM task_lists WHERE project_id = ?'
  ).get(projectId).m;

  const result = db.prepare(
    'INSERT INTO task_lists (project_id, name, position) VALUES (?, ?, ?)'
  ).run(projectId, name.trim(), maxPos + 1);

  res.status(201).json(db.prepare('SELECT * FROM task_lists WHERE id = ?').get(result.lastInsertRowid));
});

/**
 * @openapi
 * /api/task-lists/{listId}/tasks:
 *   get:
 *     tags: [Task Lists]
 *     summary: Lista tarefas da lista
 *     description: Devolve as tarefas de uma lista. Utilizadores não admin só veem as tarefas em que estão atribuídos.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de tarefas
 */
router.get('/:listId/tasks', (req, res) => {
  const listId = +req.params.listId;
  const list = db.prepare('SELECT * FROM task_lists WHERE id = ?').get(listId);
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });

  const teamId = getTeamIdForProject(list.project_id);
  if (!isTeamMember(req.user.id, teamId)) {
    return res.status(403).json({ error: 'Sem acesso' });
  }

  const isAdmin = isTeamAdmin(req.user.id, teamId);
  let tasks;

  if (isAdmin) {
    tasks = db.prepare(`
      SELECT * FROM tasks WHERE task_list_id = ? AND parent_task_id IS NULL
      ORDER BY created_at DESC
    `).all(listId);
  } else {
    tasks = db.prepare(`
      SELECT t.* FROM tasks t
      JOIN task_assignees ta ON ta.task_id = t.id
      WHERE t.task_list_id = ? AND t.parent_task_id IS NULL AND ta.user_id = ?
      ORDER BY t.created_at DESC
    `).all(listId, req.user.id);
  }

  res.json(attachAssignees(tasks));
});

/**
 * @openapi
 * /api/task-lists/{listId}:
 *   delete:
 *     tags: [Task Lists]
 *     summary: Elimina uma lista
 *     description: Remove uma lista de tarefas, disponível apenas para administradores.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Lista eliminada com sucesso
 */
router.delete('/:listId', (req, res) => {
  const listId = +req.params.listId;
  const list = db.prepare('SELECT * FROM task_lists WHERE id = ?').get(listId);
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });

  const teamId = getTeamIdForProject(list.project_id);
  if (!isTeamAdmin(req.user.id, teamId)) {
    return res.status(403).json({ error: 'Apenas admins podem eliminar listas' });
  }

  db.prepare('DELETE FROM task_lists WHERE id = ?').run(listId);
  res.status(204).send();
});

module.exports = router;
