const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const {
  isTeamAdmin,
  canViewTask,
  getTaskWithContext,
  attachAssignees,
  isTaskAssignee,
} = require('../utils/permissions');

const router = express.Router();
router.use(authMiddleware);

function setAssignees(taskId, assigneeIds) {
  db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(taskId);
  const insert = db.prepare('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)');
  for (const uid of assigneeIds || []) {
    insert.run(taskId, uid);
  }
}

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Cria uma tarefa
 *     description: Cria uma tarefa numa lista e associa assignees quando fornecidos.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [taskListId, title]
 *             properties:
 *               taskListId:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               assigneeIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Tarefa criada com sucesso
 */
router.post('/', (req, res) => {
  const {
    taskListId,
    title,
    description = '',
    status = 'todo',
    priority = 'medium',
    dueDate = null,
    assigneeIds = [],
    parentTaskId = null,
  } = req.body;

  if (!taskListId || !title?.trim()) {
    return res.status(400).json({ error: 'taskListId e título são obrigatórios' });
  }

  const list = db.prepare('SELECT tl.*, p.team_id FROM task_lists tl JOIN projects p ON p.id = tl.project_id WHERE tl.id = ?')
    .get(taskListId);
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
  if (!isTeamAdmin(req.user.id, list.team_id)) {
    return res.status(403).json({ error: 'Apenas admins podem criar tarefas' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (task_list_id, title, description, status, priority, due_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(taskListId, title.trim(), description.trim(), status, priority, dueDate);

  const taskId = result.lastInsertRowid;
  setAssignees(taskId, assigneeIds);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  res.status(201).json({ ...task, assigneeIds: assigneeIds || [] });
});

/**
 * @openapi
 * /api/tasks/{taskId}:
 *   get:
 *     tags: [Tasks]
 *     summary: Detalhes de uma tarefa
 *     description: Devolve os detalhes de uma tarefa, incluindo subtarefas, comentários e assignees.
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
 *         description: Tarefa encontrada
 */
router.get('/:taskId', (req, res) => {
  const taskId = +req.params.taskId;
  if (!canViewTask(req.user.id, taskId)) {
    return res.status(403).json({ error: 'Sem acesso à tarefa' });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  const assigneeIds = db.prepare('SELECT user_id FROM task_assignees WHERE task_id = ?')
    .all(taskId).map(r => r.user_id);

  const subtasks = db.prepare(
    'SELECT * FROM tasks ORDER BY created_at'
  ).all();

  const comments = db.prepare(`
    SELECT c.*, u.username as user_name
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.task_id = ? ORDER BY c.created_at
  `).all(taskId);

  res.json({
    ...task,
    assigneeIds,
    subtasks: attachAssignees(subtasks),
    comments,
  });
});

/**
 * @openapi
 * /api/tasks/{taskId}:
 *   put:
 *     tags: [Tasks]
 *     summary: Atualiza uma tarefa
 *     description: Atualiza uma tarefa. Administradores podem editar tudo; outros utilizadores só podem alterar o estado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               assigneeIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Tarefa atualizada
 */
router.put('/:taskId', (req, res) => {
  const taskId = +req.params.taskId;
  const ctx = getTaskWithContext(taskId);
  if (!ctx) return res.status(404).json({ error: 'Tarefa não encontrada' });

  const admin = isTeamAdmin(req.user.id, ctx.team_id);
  const assignee = isTaskAssignee(req.user.id, taskId);

  if (!admin && !assignee) {
    return res.status(403).json({ error: 'Sem permissão para editar' });
  }

  const { title, description, status, priority, dueDate, assigneeIds } = req.body;

  if (admin) {
    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        due_date = COALESCE(?, due_date)
      WHERE id = ?
    `).run(
      title?.trim() ?? null,
      description !== undefined ? description.trim() : null,
      status ?? null,
      priority ?? null,
      dueDate !== undefined ? dueDate : null,
      taskId
    );
    if (assigneeIds !== undefined) setAssignees(taskId, assigneeIds);
  } else {
    if (status === undefined) {
      return res.status(400).json({ error: 'Utilizadores só podem alterar o estado' });
    }
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, taskId);
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  const ids = db.prepare('SELECT user_id FROM task_assignees WHERE task_id = ?')
    .all(taskId).map(r => r.user_id);
  res.json({ ...task, assigneeIds: ids });
});

/**
 * @openapi
 * /api/tasks/{taskId}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Elimina uma tarefa
 *     description: Remove uma tarefa, disponível apenas para administradores.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Tarefa eliminada com sucesso
 */
router.delete('/:taskId', (req, res) => {
  const taskId = +req.params.taskId;
  const ctx = getTaskWithContext(taskId);
  if (!ctx) return res.status(404).json({ error: 'Tarefa não encontrada' });
  if (!isTeamAdmin(req.user.id, ctx.team_id)) {
    return res.status(403).json({ error: 'Apenas admins podem eliminar tarefas' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  res.status(204).send();
});

/**
 * @openapi
 * /api/tasks/{taskId}/comments:
 *   post:
 *     tags: [Tasks]
 *     summary: Adiciona comentário a uma tarefa
 *     description: Cria um comentário numa tarefa.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comentário criado com sucesso
 */
router.post('/:taskId/comments', (req, res) => {
  const taskId = +req.params.taskId;
  const { content } = req.body;

  if (!canViewTask(req.user.id, taskId)) {
    return res.status(403).json({ error: 'Sem acesso' });
  }
  if (!content?.trim()) {
    return res.status(400).json({ error: 'Comentário vazio' });
  }

  const result = db.prepare(
    'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)'
  ).run(taskId, req.user.id, content.trim());

  const comment = db.prepare(`
    SELECT c.*, u.username as user_name FROM comments c
    JOIN users u ON u.id = c.user_id WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(comment);
});

/**
 * @openapi
 * /api/tasks/{taskId}/comments/{commentId}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Remove comentário
 *     description: Remove um comentário, disponível apenas para o autor.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Comentário eliminado com sucesso
 */
router.delete('/:taskId/comments/:commentId', (req, res) => {
  const taskId = +req.params.taskId;
  const commentId = +req.params.commentId;

  if (!canViewTask(req.user.id, taskId)) {
    return res.status(403).json({ error: 'Sem acesso' });
  }

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(commentId);
  if (!comment) {
    return res.status(404).json({ error: 'Comentário não encontrado' });
  }
  if (comment.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Apenas o autor pode eliminar o comentário' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  res.status(204).send();
});

/**
 * @openapi
 * /api/tasks/get_closed_tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Obtém todas as tarefas fechadas
 *     description: Obtém todas as tarefas fechadas.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tarefas fechadas encontradas
 */
router.get('/:projectId/get_closed_tasks', (req, res) => {
  const { projectId } = req.params;
  const taskss = []
  const tasklists = db.prepare('SELECT * FROM task_lists WHERE project_id=?').all(projectId);

  const tasks = db.prepare(`
    SELECT * FROM tasks WHERE status = 'done' AND task_list_id IN (SELECT id FROM task_lists WHERE project_id = ?)`).all(projectId);
  return res.status(200).json(tasks)
});

router.get('',(req,res)=>{
  const tasks = db.prepare(`SELECT * FROM tasks`).all()

  return res.status(200).json(tasks)
})

module.exports = router;