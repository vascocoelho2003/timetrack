const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { createRecurrency, recurrenceRuleExists, getRecurrency } = require('../controllers/recurrency_controller');
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

router.get('/',(req,res)=>{
  const user_id = req.user.id;
  tasks = db.prepare(`SELECT
    t.*, tl.name as task_list_name,
    p.id AS project_id,
    p.name AS project_name
    FROM tasks t
    JOIN task_assignees ta ON ta.task_id = t.id
    JOIN task_lists tl ON tl.id = t.task_list_id
    JOIN projects p ON p.id = tl.project_id
    WHERE ta.user_id = ?
      AND t.status != 'done';`).all(user_id);
  return res.status(200).json(tasks);
})

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


router.get('/my_tasks',(req,res)=> {
  const tasks = db.prepare(`
    SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        t.completed_at,

        tl.id AS task_list_id,
        tl.name AS task_list_name,

        p.id AS project_id,
        p.name AS project_name,

        te.id AS team_id,
        te.name AS team_name
    FROM task_assignees ta
    JOIN tasks t
        ON t.id = ta.task_id
    JOIN task_lists tl
        ON tl.id = t.task_list_id
    JOIN projects p
        ON p.id = tl.project_id
    JOIN teams te
        ON te.id = p.team_id
    WHERE ta.user_id = ?
    ORDER BY
        CASE t.priority
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
        END,
        t.due_date ASC,
        t.created_at DESC;
`).all(req.user.id);

return res.status(200).json(tasks);
})

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

router.get('/recurrenceexists/:taskId/', (req, res) => {
  const taskId = +req.params.taskId;
  const exists = recurrenceRuleExists(taskId);
  return res.status(200).json({ exists });
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
      description !== undefined ? (description !== null ? description.trim() : null) : null,
      status ?? null,
      priority ?? null,
      dueDate !== undefined ? dueDate : null,
      taskId
    );
    if (assigneeIds !== undefined) setAssignees(taskId, assigneeIds);
    if (status === 'done' && recurrenceRuleExists(taskId)) {
      console.log("ola")
      createRecurrency(taskId);
    }
  } else {
    if (status === undefined) {
      return res.status(400).json({ error: 'Utilizadores só podem alterar o estado' });
    }
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, taskId);
    if (status === 'done' && recurrenceRuleExists(taskId)===true) {
      console.log("ola")
      createRecurrency(taskId);
    }
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

  const tasks = db.prepare(`SELECT * FROM tasks WHERE status = 'done' AND task_list_id IN(SELECT id FROM task_lists WHERE project_id = ?)`).all(projectId);
  const assigneesStmt = db.prepare(`SELECT u.id, u.username FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = ?`);

  const result = tasks.map(task => ({
    ...task,
    assignees: assigneesStmt.all(task.id)
  }));
  
  return res.status(200).json(result);
});

router.get('',(req,res)=>{
  const tasks = db.prepare(`SELECT * FROM tasks`).all()

  return res.status(200).json(tasks)
})


/**
 * @openapi
 * /api/tasks/recurrence/{taskId}:
 *   post:
 *     tags: [Tasks]
 *     summary: Cria uma regra de recorrência para uma tarefa
 *     description: Cria uma regra de recorrência para uma tarefa existente.
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
 *             required: [frequency, interval, start_date]
 *             properties:
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly, yearly]
 *               interval:
 *                 type: integer
 *               weekday:
 *                 type: string
 *                 enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *               day_of_month:
 *                 type: integer
 *               month_of_year:
 *                 type: integer
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Regra de recorrência criada com sucesso
 */
router.post('/recurrence/:taskId', (req,res)=>{
  const taskId = +req.params.taskId;
  const { frequency, interval, weekday, day_of_month, month_of_year, start_date, end_date, rule_type } = req.body;

  exists = recurrenceRuleExists(taskId);
  if(exists){
    return res.status(400).json({ message: 'Regra de recorrência já existe para esta tarefa' });
  }

  db.prepare(`
    INSERT INTO recurrence_rules (task_id, frequency, interval, weekday, day_of_month, month_of_year, start_date, end_date, rule_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(taskId, frequency, interval, weekday, day_of_month, month_of_year, start_date, end_date, rule_type);

  res.status(201).json({ message: 'Regra de recorrência criada com sucesso' });
});

router.put('/change_recurrence_status/:taskId', (req, res) => {
  const taskId = +req.params.taskId;
  const task = getTaskWithContext(taskId);
  const recurrence = getRecurrency(task);

  if (!recurrence) {
    return res.status(404).json({ message: 'Regra de recorrência não encontrada' });
  }

  const isActive = recurrence.active === 1 || recurrence.active === true || String(recurrence.active).toLowerCase() === 'true';

  if (isActive) {
    db.prepare('UPDATE recurrence_rules SET active = ? WHERE task_id = ?').run(0, taskId);
    return res.status(200).json({ message: 'Regra de recorrência desativada com sucesso' });
  }

  db.prepare('UPDATE recurrence_rules SET active = ? WHERE task_id = ?').run(1, taskId);
  return res.status(200).json({ message: 'Regra de recorrência ativada com sucesso' });
});

module.exports = router;