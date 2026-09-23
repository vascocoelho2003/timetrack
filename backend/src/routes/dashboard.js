const express = require("express");
const { db } = require("../db");
const { authMiddleware } = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

/**
 * @openapi
 * /api/dashboard/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Obter os dados necessários para a Dashboard da Home Page
 *     description: Obter os dados necessários para a Dashboard da Home Page.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard retornada com sucesso
 *       401:
 *         description: Token inválido ou ausente
 *       500:
 *         description: Erro ao obter dashboard
 */
router.get("/dashboard", authMiddleware, async (req, res) => {
  const dashboard = db
    .prepare(
      `
        SELECT
            u.id,
            u.username,

            COUNT(DISTINCT tm.team_id) AS total_teams,
            COUNT(DISTINCT p.id) AS total_projects,

            (
                SELECT COUNT(*)
                FROM task_assignees ta
                WHERE ta.user_id = u.id
            ) AS total_tasks,

            (
                SELECT COUNT(*)
                FROM task_assignees ta
                JOIN tasks t ON t.id = ta.task_id
                WHERE ta.user_id = u.id
                  AND t.status = 'todo'
            ) AS todo_tasks,

            (
                SELECT COUNT(*)
                FROM task_assignees ta
                JOIN tasks t ON t.id = ta.task_id
                WHERE ta.user_id = u.id
                  AND t.status = 'done'
            ) AS closed_tasks,

            (
                SELECT ROUND(COALESCE(SUM(duration), 0) / 3600.0, 2)
                FROM time_entries te
                WHERE te.user_id = u.id
            ) AS total_hours,

            (
                SELECT COUNT(*)
                FROM task_assignees ta
                JOIN tasks t ON t.id = ta.task_id
                WHERE ta.user_id = u.id
                  AND t.status <> 'done'
                  AND t.due_date IS NOT NULL
                  AND datetime(t.due_date) < datetime('now')
            ) AS overdue_tasks,

            (
                SELECT COUNT(*)
                FROM task_assignees ta
                JOIN tasks t ON t.id = ta.task_id
                WHERE ta.user_id = u.id
                  AND t.priority = 'high'
            ) AS high_priority_tasks

        FROM users u
        LEFT JOIN team_members tm
            ON tm.user_id = u.id
        LEFT JOIN projects p
            ON p.team_id = tm.team_id
            AND p.active = 'TRUE'
        WHERE u.id = ?
        GROUP BY u.id, u.username;
    `,
    )
    .get(req.user.id);

  return res.status(200).json(dashboard);
});

/**
 * @openapi
 * /api/dashboard/my-todo-tasks:
 *   get:
 *     tags: [Dashboard]
 *     summary: Obter as tarefas atribuídas ao utilizador logado para apresentar na página my-tasks
 *     description: Obter as tarefas atribuídas ao utilizador logado para apresentar na página my-tasks.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tarefas retornadas com sucesso
 *       401:
 *         description: Token inválido ou ausente
 *       500:
 *         description: Erro ao obter tarefas
 */
router.get("/my-todo-tasks", authMiddleware, async (req, res) => {
  const tasks = db
    .prepare(
      `
        SELECT
            t.title,
            t.due_date
        FROM task_assignees ta
        JOIN tasks t
            ON t.id = ta.task_id
        JOIN task_lists tl
            ON tl.id = t.task_list_id
        JOIN projects p
            ON p.id = tl.project_id
        WHERE ta.user_id = ?
          AND t.status = 'todo'
        ORDER BY
            t.priority DESC,
            t.due_date ASC,
            t.created_at DESC;
    `,
    )
    .all(req.user.id);

  return res.status(200).json(tasks);
});

/**
 * @openapi
 * /api/dashboard/my-projects:
 *   get:
 *     tags: [Dashboard]
 *     summary: Obter os projetos a que o utilizador logado pertence para apresentar na página Projects
 *     description: Obter os projetos a que o utilizador logado pertence para apresentar na página Projects.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Projetos retornados com sucesso
 *       401:
 *         description: Token inválido ou ausente
 *       500:
 *         description: Erro ao obter projetos
 */
router.get("/my-projects", authMiddleware, async (req, res) => {
  const projects = db
    .prepare(
      `
        SELECT DISTINCT
            p.name AS project_name,
            t.name AS team_name
        FROM team_members tm
        JOIN teams t
            ON t.id = tm.team_id
        JOIN projects p
            ON p.team_id = t.id
        WHERE tm.user_id = ?
          AND t.active = 'TRUE'
          AND p.active = 'TRUE'
        ORDER BY p.name ASC;
    `,
    )
    .all(req.user.id);

  return res.status(200).json(projects);
});

/**
 * @openapi
 * /api/dashboard/project_report/:projectId:
 *   get:
 *     tags: [Dashboard]
 *     summary: Obter os dados necessários para o relatório de projeto
 *     description: Obter os dados necessários para o relatório de projeto.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Relatório de projeto retornado com sucesso
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Projeto não encontrado
 *       500:
 *         description: Erro ao obter relatório de projeto
 */
router.get("/project_report/:projectId", authMiddleware, async (req, res) => {
  const { projectId } = req.params;
  const { startDate, endDate } = req.query;
  const hasDateRange = startDate && endDate;

  const rows = db
    .prepare(
      `
        SELECT
            p.id AS project_id,
            p.name AS project_name,
            team.name AS team_name,
            tl.id AS list_id,
            tl.name AS list_name,
            tl.position,
            t.id AS task_id,
            t.title,
            t.status,
            te.created_at as due_date, 
            u.id AS user_id,
            u.username,
            COALESCE(SUM(te.duration), 0) AS user_time
        FROM projects p
        JOIN teams team
            ON team.id = p.team_id
        LEFT JOIN task_lists tl
            ON tl.project_id = p.id
            AND tl.active = 'TRUE'
        LEFT JOIN tasks t
            ON t.task_list_id = tl.id
        LEFT JOIN task_assignees ta
            ON ta.task_id = t.id
        LEFT JOIN users u
            ON u.id = ta.user_id
        LEFT JOIN time_entries te
            ON te.task_id = t.id
            AND te.user_id = u.id
            ${hasDateRange ? "AND date(te.start) >= date(@startDate) AND date(te.start) < date(@endDate, '+1 day')" : ""}
        WHERE p.id = @projectId
        GROUP BY
            p.id,
            tl.id,
            t.id,
            u.id
        ORDER BY
            tl.position,
            t.due_date,
            t.id,
            u.username
    `,
    )
    .all({ projectId, startDate, endDate });

  if (!rows.length) {
    return res.status(404).json({
      message: "Projeto não encontrado.",
    });
  }

  const report = {
    project: {
      id: rows[0].project_id,
      name: rows[0].project_name,
      team_name: rows[0].team_name,
    },
    task_lists: [],
  };

  const listsMap = new Map();

  rows.forEach((row) => {
    if (!listsMap.has(row.list_id)) {
      listsMap.set(row.list_id, {
        id: row.list_id,
        name: row.list_name,
        tasks: [],
      });

      report.task_lists.push(listsMap.get(row.list_id));
    }

    const list = listsMap.get(row.list_id);

    let task = list.tasks.find((t) => t.id === row.task_id);

    if (!task && row.task_id) {
      task = {
        id: row.task_id,
        title: row.title,
        status: row.status,
        due_date: row.due_date,
        total_time: 0,
        assignees: [],
      };

      list.tasks.push(task);
    }

    if (task && row.user_id) {
      task.assignees.push({
        id: row.user_id,
        username: row.username,
        time: row.user_time,
      });

      task.total_time += row.user_time;
    }
  });
  res.status(200).json(report);
});

/**
 * @openapi
 * /api/dashboard/colaborators_reports/:id:
 *   get:
 *     tags: [Dashboard]
 *     summary: Obter os dados necessários para o relatório geral de colaboradores
 *     description: Conta tarefas atribuídas e fechadas em projetos comuns com o utilizador autenticado. Na linha do próprio utilizador inclui também as tarefas pessoais.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Relatório de colaboradores retornado com sucesso
 *       401:
 *         description: Token inválido ou ausente
 *       500:
 *         description: Erro ao obter relatório de colaboradores
 */
router.get("/colaborators_reports/", authMiddleware, async (req, res) => {
  const id = req.user.id;
  const teamMates = db
    .prepare(
      `
        SELECT
            u.id AS user_id,
            u.username,
            COUNT(DISTINCT CASE
                WHEN t.created_at >= datetime('now', 'start of month')
                 AND t.created_at < datetime('now', 'start of month', '+1 month')
                 AND (
                    p.id IS NOT NULL
                    OR (u.id = $id AND t.task_list_id IS NULL)
                 )
                THEN t.id
            END) AS nr_tasks,
            COUNT(DISTINCT CASE
                WHEN t.status = 'done'
                 AND t.completed_at >= datetime('now', 'start of month')
                 AND t.completed_at < datetime('now', 'start of month', '+1 month')
                 AND (
                    p.id IS NOT NULL
                    OR (u.id = $id AND t.task_list_id IS NULL)
                 )
                THEN t.id
            END) AS nr_closed_tasks
        FROM team_members tm
        JOIN users u
            ON u.id = tm.user_id
        LEFT JOIN task_assignees ta
            ON ta.user_id = u.id
        LEFT JOIN tasks t
            ON t.id = ta.task_id
        LEFT JOIN task_lists tl
            ON tl.id = t.task_list_id
        LEFT JOIN projects p
            ON p.id = tl.project_id
           AND p.team_id IN (
                SELECT tm_me.team_id
                FROM team_members tm_me
                JOIN team_members tm_them
                  ON tm_them.team_id = tm_me.team_id
                 AND tm_them.user_id = u.id
                WHERE tm_me.user_id = $id
            )
        WHERE tm.team_id IN (
            SELECT team_id
            FROM team_members
            WHERE user_id = $id
        ) 
        GROUP BY
            u.id,
            u.username
        ORDER BY
            u.username;
    `,
    )
    .all({ id });

  const totalTimes = db
    .prepare(
      `
        SELECT
            te.user_id,
            COALESCE(SUM(te.duration), 0) AS total_time
        FROM time_entries te
        JOIN task_assignees ta
            ON ta.task_id = te.task_id
           AND ta.user_id = te.user_id
        JOIN tasks t
            ON t.id = te.task_id
        LEFT JOIN task_lists tl
            ON tl.id = t.task_list_id
        LEFT JOIN projects p
            ON p.id = tl.project_id
        WHERE (
            p.team_id IN (
                SELECT team_id
                FROM team_members
                WHERE user_id = $id
            )
            OR (te.user_id = $id AND t.task_list_id IS NULL)
          )
          AND te.end IS NOT NULL
          AND datetime(te.created_at) >= datetime('now', '-1 month')
        GROUP BY te.user_id
    `,
    )
    .all({ id });

  const timesMap = new Map(totalTimes.map((t) => [t.user_id, t.total_time]));

  teamMates.forEach((user) => {
    user.total_time = timesMap.get(user.user_id) || 0;
  });

  return res.status(200).json(teamMates);
});

/**
 * @openapi
 * /api/dashboard/colaborator_report/:id:
 *   get:
 *     tags: [Dashboard]
 *     summary: Obter os dados necessários para o relatório de colaborador
 *     description: Obtém os registos de tempo do colaborador em projetos comuns com o utilizador autenticado. Se o relatório for o próprio, inclui também tarefas pessoais.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Relatório de colaborador retornado com sucesso
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Colaborador não encontrado
 *       500:
 *         description: Erro ao obter relatório de colaborador
 */
router.get("/colaborator_report/:id", authMiddleware, (req, res) => {
  const userId = req.params.id;
  const loggedUserId = req.user.id;
  const isOwnReport = Number(loggedUserId) === Number(userId);
  const { startDate, endDate } = req.query;
  const hasDateRange = startDate && endDate;

  const params = [userId, loggedUserId, isOwnReport ? 1 : 0];
  if (hasDateRange) {
    params.push(startDate, endDate);
  }

  const timeEntries = db
    .prepare(
      `
        SELECT
            t.title,
            t.status,
            COALESCE(tl.name, 'Lista pessoal') AS task_list_name,
            COALESCE(p.name, 'Pessoal') AS project_name,
            te.*
        FROM time_entries te
        JOIN task_assignees ta
            ON ta.task_id = te.task_id
           AND ta.user_id = te.user_id
        JOIN tasks t
            ON t.id = te.task_id
        LEFT JOIN task_lists tl
            ON tl.id = t.task_list_id
        LEFT JOIN projects p
            ON p.id = tl.project_id
        WHERE te.user_id = ?
          AND (
            p.team_id IN (
                SELECT tm_me.team_id
                FROM team_members tm_me
                JOIN team_members tm_them
                  ON tm_them.team_id = tm_me.team_id
                 AND tm_them.user_id = te.user_id
                WHERE tm_me.user_id = ?
            )
            OR (? = 1 AND p.id IS NULL)
          )
          AND te.end IS NOT NULL
        ${hasDateRange ? "AND date(te.start) >= date(?) AND date(te.start) < date(?, '+1 day')" : ""}
    `,
    )
    .all(...params);

  return res.status(200).json(timeEntries);
});

module.exports = router;
