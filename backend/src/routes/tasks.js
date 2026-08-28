const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { createRecurrency, recurrenceRuleExists, getRecurrency } = require('../controllers/recurrency_controller');
const { parseDocsUrl } = require('../utils/url');
  const {
    isTeamAdmin,
    canViewTask,
    getTaskWithContext,
    attachAssignees,
    isTaskAssignee,
    isPersonalTaskOwner,
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
    p.name AS project_name,
    p.team_id AS team_id
    FROM tasks t
    JOIN task_assignees ta ON ta.task_id = t.id
    LEFT JOIN task_lists tl ON tl.id = t.task_list_id
    LEFT JOIN projects p ON p.id = tl.project_id
    WHERE ta.user_id = ? ORDER BY t.due_date DESC`).all(user_id);
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
    taskListId = null,
    title,
    description = '',
    status = 'todo',
    priority = 'medium',
    dueDate = null,
    alertDate = null,
    assigneeIds = [],
    parentTaskId = null,
    docs_url = '',
  } = req.body;

  created_by_user = req.user.id;

  if (!title?.trim()) {
    return res.status(400).json({ error: 'taskListId e título são obrigatórios' });
  }

  const parsedDocsUrl = parseDocsUrl(docs_url);
  if (!parsedDocsUrl.ok) {
    return res.status(400).json({ error: 'O campo Docs tem de ser um URL válido (ex: https://exemplo.com)' });
  }

  const list = db.prepare('SELECT tl.*, p.team_id FROM task_lists tl JOIN projects p ON p.id = tl.project_id WHERE tl.id = ?')
    .get(taskListId);
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
  if (!isTeamAdmin(req.user.id, list.team_id)) {
    return res.status(403).json({ error: 'Apenas admins podem criar tarefas' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (task_list_id, title, description, status, priority, due_date, created_by_user_id, next_alert_date, docs_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(taskListId, title.trim(), description.trim(), status, priority, dueDate, created_by_user, alertDate, parsedDocsUrl.url);

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
    LEFT JOIN task_lists tl
        ON tl.id = t.task_list_id
    LEFT JOIN projects p
        ON p.id = tl.project_id
    LEFT JOIN teams te
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
    recurrence: getRecurrency(taskId) || null,
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

  const personalOwner = isPersonalTaskOwner(req.user.id, ctx);
  const admin = ctx.team_id ? isTeamAdmin(req.user.id, ctx.team_id) : personalOwner;
  const assignee = isTaskAssignee(req.user.id, taskId);

  if (!admin && !assignee) {
    return res.status(403).json({ error: 'Apenas o utilizador atribuído pode alterar o estado' });
  }

  const { title, description, status, priority, dueDate, assigneeIds, clientId, next_alert_date, docs_url } = req.body;

  let parsedDocsUrl = null;
  if (docs_url !== undefined) {
    parsedDocsUrl = parseDocsUrl(docs_url);
    if (!parsedDocsUrl.ok) {
      return res.status(400).json({ error: 'O campo Docs tem de ser um URL válido (ex: https://exemplo.com)' });
    }
  }

  if (admin) {
    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        due_date = COALESCE(?, due_date),
        next_alert_date = COALESCE(?, next_alert_date),
        client_id = COALESCE(?, client_id),
        docs_url = COALESCE(?, docs_url)
      WHERE id = ?
    `).run(
      title?.trim() ?? null,
      description !== undefined ? (description !== null ? description.trim() : null) : null,
      status ?? null,
      priority ?? null,
      dueDate !== undefined ? dueDate : null,
      next_alert_date !== undefined ? next_alert_date: null,
      clientId !== undefined ? clientId : null,
      parsedDocsUrl ? (parsedDocsUrl.url ?? '') : null,
      taskId
    );
    if (assigneeIds !== undefined) setAssignees(taskId, assigneeIds);
    const recurrence = getRecurrency(taskId);
    if (dueDate && (recurrence?.frequency === 'monthly' || recurrence?.frequency === 'yearly')) {
      const [, month, day] = String(dueDate).slice(0, 10).split('-').map(Number);
      db.prepare(`
        UPDATE recurrence_rules
        SET day_of_month = ?, month_of_year = CASE WHEN frequency = 'yearly' THEN ? ELSE month_of_year END
        WHERE task_id = ?
      `).run(day, month, taskId);
    }
    if (status === 'done' && recurrenceRuleExists(taskId)) {
      createRecurrency(taskId,req.user.id);
    }
  } else {
    if (status === undefined) {
      return res.status(400).json({ error: 'Utilizadores atribuídos só podem alterar o estado' });
    }
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, taskId);
    if (status === 'done' && recurrenceRuleExists(taskId)===true) {
      createRecurrency(taskId,req.user.id);
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
  const canDelete = ctx.team_id
    ? isTeamAdmin(req.user.id, ctx.team_id)
    : isPersonalTaskOwner(req.user.id, ctx);
  if (!canDelete) {
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

  const task = getTaskWithContext(taskId);
  if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });
  if (!isTeamAdmin(req.user.id, task.team_id)) {
    return res.status(403).json({ message: 'Apenas admins podem gerir recorrências' });
  }

  if (getRecurrency(taskId)) {
    return res.status(400).json({ message: 'Regra de recorrência já existe para esta tarefa' });
  }

  let calculatedDayOfMonth = day_of_month;
  let calculatedMonthOfYear = month_of_year;
  if (frequency === 'monthly' || frequency === 'yearly') {
    if (!task.due_date) {
      return res.status(400).json({ message: 'As frequências mensal e anual requerem um prazo na tarefa' });
    }
    const [, month, day] = String(task.due_date).slice(0, 10).split('-').map(Number);
    calculatedDayOfMonth = day;
    if (frequency === 'yearly') calculatedMonthOfYear = month;
  }

  db.prepare(`
    INSERT INTO recurrence_rules (task_id, frequency, interval, weekday, day_of_month, month_of_year, start_date, end_date, rule_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(taskId, frequency, interval, weekday, calculatedDayOfMonth, calculatedMonthOfYear, start_date, end_date, rule_type);

  res.status(201).json({
    message: 'Regra de recorrência criada com sucesso',
    recurrence: getRecurrency(taskId),
  });
});

router.put('/recurrence/:taskId', (req, res) => {
  const taskId = +req.params.taskId;
  const task = getTaskWithContext(taskId);
  if (!task) return res.status(404).json({ message: 'Tarefa não encontrada' });
  if (!isTeamAdmin(req.user.id, task.team_id)) {
    return res.status(403).json({ message: 'Apenas admins podem gerir recorrências' });
  }

  const recurrence = getRecurrency(taskId);
  if (!recurrence) {
    return res.status(404).json({ message: 'Regra de recorrência não encontrada' });
  }

  const { frequency, interval, weekday, day_of_month, month_of_year, start_date, end_date, rule_type } = req.body;
  let calculatedDayOfMonth = day_of_month;
  let calculatedMonthOfYear = month_of_year;
  if (frequency === 'monthly' || frequency === 'yearly') {
    if (!task.due_date) {
      return res.status(400).json({ message: 'As frequências mensal e anual requerem um prazo na tarefa' });
    }
    const [, month, day] = String(task.due_date).slice(0, 10).split('-').map(Number);
    calculatedDayOfMonth = day;
    if (frequency === 'yearly') calculatedMonthOfYear = month;
  }

  db.prepare(`
    UPDATE recurrence_rules
    SET frequency = ?, interval = ?, weekday = ?, day_of_month = ?,
        month_of_year = ?, start_date = ?, end_date = ?, rule_type = ?
    WHERE task_id = ?
  `).run(
    frequency,
    interval,
    weekday ?? null,
    calculatedDayOfMonth ?? null,
    calculatedMonthOfYear ?? null,
    start_date,
    end_date ?? null,
    rule_type,
    taskId
  );

  res.json({ message: 'Regra de recorrência atualizada com sucesso', recurrence: getRecurrency(taskId) });
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