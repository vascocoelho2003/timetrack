const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const {
  isTeamAdmin,
  isTeamMember,
  isTaskAssignee,
  getTaskWithContext,
  getTeamIdForProject,
  isPersonalTaskOwner,
} = require('../utils/permissions');

const router = express.Router();
router.use(authMiddleware);

/**
 * @openapi
 * /api/time/start:
 *   post:
 *     tags: [Time Entries]
 *     summary: Inicia timer de uma tarefa
 *     description: Inicia um registo de tempo para uma tarefa, disponível apenas para assignees.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskId]
 *             properties:
 *               taskId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Timer iniciado com sucesso
 */
router.post('/start', (req, res) => {
  const { taskId } = req.body;

  if (taskId) {
    const ctx = getTaskWithContext(taskId);
    if (!ctx) return res.status(404).json({ error: 'Tarefa não encontrada' });
    if (ctx.team_id && !isTeamMember(req.user.id, ctx.team_id)) {
      return res.status(403).json({ error: 'Sem acesso' });
    }
    if (!ctx.team_id && !isPersonalTaskOwner(req.user.id, ctx)) {
      return res.status(403).json({ error: 'Sem acesso' });
    }
    if (!isTaskAssignee(req.user.id, taskId)) {
      return res.status(403).json({ error: 'Apenas assignees podem registar tempo' });
    }
  }

  const active = db.prepare(
    'SELECT * FROM time_entries WHERE user_id = ? AND end IS NULL'
  ).get(req.user.id);

  if (active) {
    return res.status(409).json({
      error: 'Já tem um timer ativo',
      activeEntry: active,
    });
  }

  const now = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO time_entries (user_id, task_id, start) VALUES (?, ?, ?)'
  ).run(req.user.id, taskId || null, now);

  const entry = db.prepare(`
    SELECT te.*, t.title as task_title FROM time_entries te
    LEFT JOIN tasks t ON t.id = te.task_id
    WHERE te.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(entry);
});

/**
 * @openapi
 * /api/time/stop:
 *   post:
 *     tags: [Time Entries]
 *     summary: Termina timer ativo
 *     description: Termina o timer ativo do utilizador autenticado.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Timer terminado com sucesso
 */
router.post('/stop', (req, res) => {
  const active = db.prepare(
    'SELECT * FROM time_entries WHERE user_id = ? AND end IS NULL'
  ).get(req.user.id);

  if (!active) {
    return res.status(404).json({ error: 'Nenhum timer ativo' });
  }

  const now = new Date().toISOString();
  const duration = Math.floor(
    (new Date(now).getTime() - new Date(active.start).getTime()) / 1000
  );

  db.prepare('UPDATE time_entries SET end = ?, duration = ? WHERE id = ?')
    .run(now, duration, active.id);

  const entry = db.prepare(`
    SELECT te.*, t.title as task_title FROM time_entries te
    LEFT JOIN tasks t ON t.id = te.task_id
    WHERE te.id = ?
  `).get(active.id);

  res.json(entry);
});

/**
 * @openapi
 * /api/time/active:
 *   get:
 *     tags: [Time Entries]
 *     summary: Timer ativo
 *     description: Devolve o timer ativo do utilizador autenticado.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Timer ativo encontrado ou nulo
 */
router.get('/active', (req, res) => {
  const active = db.prepare(`
    SELECT te.*, t.title as task_title FROM time_entries te
    LEFT JOIN tasks t ON t.id = te.task_id
    WHERE te.user_id = ? AND te.end IS NULL
  `).get(req.user.id);

  res.json(active || null);
});

router.get('/unassigned/pending', (req, res) => {
  const entry = db.prepare(`
    SELECT te.*, t.title as task_title FROM time_entries te
    LEFT JOIN tasks t ON t.id = te.task_id
    WHERE te.user_id = ? AND te.task_id IS NULL AND te.end IS NOT NULL
    ORDER BY te.end DESC
    LIMIT 1
  `).get(req.user.id);

  res.json(entry || null);
});

router.post('/unassigned/:id/assign', (req, res) => {
  const entryId = +req.params.id;
  const {
    existingTaskId,
    title,
    description = '',
    taskListId = null,
    priority = 'medium',
    dueDate = null,
  } = req.body;

  const entry = db.prepare(
    'SELECT * FROM time_entries WHERE id = ? AND user_id = ?'
  ).get(entryId, req.user.id);

  if (!entry) return res.status(404).json({ error: 'Registo de tempo não encontrado' });
  if (entry.task_id) return res.status(409).json({ error: 'Este tempo já tem uma tarefa' });

  if (existingTaskId) {
    const ctx = getTaskWithContext(existingTaskId);
    if (!ctx) return res.status(404).json({ error: 'Tarefa não encontrada' });
    if (!isTaskAssignee(req.user.id, existingTaskId)) {
      return res.status(403).json({ error: 'Só pode atribuir tempo a tarefas suas' });
    }
    db.prepare('UPDATE time_entries SET task_id = ? WHERE id = ?').run(existingTaskId, entryId);
    return res.json(ctx);
  }

  if (!title?.trim()) return res.status(400).json({ error: 'O título é obrigatório' });

  let listId = taskListId || null;
  if (listId) {
    const list = db.prepare(`
      SELECT tl.*, p.team_id FROM task_lists tl
      JOIN projects p ON p.id = tl.project_id
      WHERE tl.id = ?
    `).get(listId);

    if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
    if (!isTeamMember(req.user.id, list.team_id)) {
      return res.status(403).json({ error: 'Sem acesso a este projeto' });
    }
  }

  const createFromTimer = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO tasks (task_list_id, title, description, status, priority, due_date, created_by_user_id)
      VALUES (?, ?, ?, 'todo', ?, ?, ?)
    `).run(
      listId,
      title.trim(),
      String(description || '').trim(),
      priority,
      dueDate,
      req.user.id
    );

    const taskId = result.lastInsertRowid;
    db.prepare('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)').run(taskId, req.user.id);
    db.prepare('UPDATE time_entries SET task_id = ? WHERE id = ?').run(taskId, entryId);

    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  });

  const task = createFromTimer();
  res.status(201).json(task);
});

router.delete('/unassigned/:id', (req, res) => {
  const entryId = +req.params.id;
  const entry = db.prepare(
    'SELECT * FROM time_entries WHERE id = ? AND user_id = ?'
  ).get(entryId, req.user.id);

  if (!entry) return res.status(404).json({ error: 'Registo de tempo não encontrado' });
  if (entry.task_id) return res.status(409).json({ error: 'Não é possível descartar tempo já associado a uma tarefa' });

  db.prepare('DELETE FROM time_entries WHERE id = ?').run(entryId);
  res.status(204).send();
});

/**
 * @openapi
 * /api/time/task/{taskId}:
 *   get:
 *     tags: [Time Entries]
 *     summary: Registos de tempo de uma tarefa
 *     description: Lista os registos de tempo de uma tarefa.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de registos de tempo
 */
router.get('/task/:taskId', (req, res) => {
  const taskId = +req.params.taskId;
  const ctx = getTaskWithContext(taskId);
  if (!ctx) return res.status(404).json({ error: 'Tarefa não encontrada' });

  if (ctx.team_id ? !isTeamMember(req.user.id, ctx.team_id) : !isPersonalTaskOwner(req.user.id, ctx)) {
    return res.status(403).json({ error: 'Sem acesso' });
  }

  const entries = db.prepare(`
    SELECT te.*, u.username as user_name FROM time_entries te
    JOIN users u ON u.id = te.user_id
    WHERE te.task_id = ? AND te.end IS NOT NULL
    ORDER BY te.start DESC
  `).all(taskId);

  res.json(entries);
});

/**
 * @openapi
 * /api/time/reports/team/{teamId}:
 *   get:
 *     tags: [Time Entries]
 *     summary: Relatório de tempo por equipa
 *     description: Gera um relatório de tempo por utilizador, projeto e tarefa para uma equipa.
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
 *         description: Relatório devolvido com sucesso
 */
router.get('/reports/team/:teamId', (req, res) => {
  const teamId = +req.params.teamId;
  if (!isTeamMember(req.user.id, teamId)) {
    return res.status(403).json({ error: 'Sem acesso' });
  }

  const admin = isTeamAdmin(req.user.id, teamId);
  const userFilter = admin ? '' : 'AND te.user_id = ?';
  const params = admin ? [teamId] : [teamId, req.user.id];

  const byUser = db.prepare(`
    SELECT u.id, u.username, COALESCE(SUM(te.duration), 0) as total_seconds
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN task_lists tl ON tl.id = t.task_list_id
    JOIN projects p ON p.id = tl.project_id
    JOIN users u ON u.id = te.user_id
    WHERE p.team_id = ? AND te.end IS NOT NULL ${userFilter}
    GROUP BY u.id ORDER BY total_seconds DESC
  `).all(...params);

  const byProject = db.prepare(`
    SELECT p.id, p.name, COALESCE(SUM(te.duration), 0) as total_seconds
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN task_lists tl ON tl.id = t.task_list_id
    JOIN projects p ON p.id = tl.project_id
    WHERE p.team_id = ? AND te.end IS NOT NULL ${userFilter}
    GROUP BY p.id ORDER BY total_seconds DESC
  `).all(...params);

  const byTask = db.prepare(`
    SELECT t.id, t.title, COALESCE(SUM(te.duration), 0) as total_seconds
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN task_lists tl ON tl.id = t.task_list_id
    JOIN projects p ON p.id = tl.project_id
    WHERE p.team_id = ? AND te.end IS NOT NULL
    GROUP BY t.id ORDER BY total_seconds DESC
  `).all(teamId);

  res.json({ byUser, byProject, byTask });
});

/**
 * @openapi
 * /api/time/reports/project/{projectId}:
 *   get:
 *     tags: [Time Entries]
 *     summary: Relatório de tempo por projeto
 *     description: Gera um relatório de tempo por utilizador e tarefa para um projeto.
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
 *         description: Relatório devolvido com sucesso
 */
router.get('/reports/project/:projectId', (req, res) => {
  const projectId = +req.params.projectId;
  const teamId = getTeamIdForProject(projectId);
  if (!teamId || !isTeamMember(req.user.id, teamId)) {
    return res.status(403).json({ error: 'Sem acesso' });
  }

  const admin = isTeamAdmin(req.user.id, teamId);
  const userFilter = admin ? '' : 'AND te.user_id = ?';
  const params = admin ? [projectId] : [projectId, req.user.id];

  const byUser = db.prepare(`
    SELECT u.id, u.name, COALESCE(SUM(te.duration), 0) as total_seconds
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN task_lists tl ON tl.id = t.task_list_id
    JOIN users u ON u.id = te.user_id
    WHERE tl.project_id = ? AND te.end IS NOT NULL ${userFilter}
    GROUP BY u.id
  `).all(...params);

  const byTask = db.prepare(`
    SELECT t.id, t.title, COALESCE(SUM(te.duration), 0) as total_seconds
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN task_lists tl ON tl.id = t.task_list_id
    WHERE tl.project_id = ? AND te.end IS NOT NULL
    GROUP BY t.id
  `).all(projectId);

  res.json({ byUser, byTask });
});

module.exports = router;
