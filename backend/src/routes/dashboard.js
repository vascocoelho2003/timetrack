const express = require('express');
const { db } = require('../db');
const {authMiddleware}=require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware)

router.get('/dashboard', authMiddleware, async (req, res) => {
    const dashboard = db.prepare(`
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
    `).get(req.user.id);

    return res.status(200).json(dashboard);
});

router.get('/my-todo-tasks', authMiddleware, async (req, res) => {
    const tasks = db.prepare(`
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
    `).all(req.user.id);

    return res.status(200).json(tasks);
});

router.get('/my-projects', authMiddleware, async (req, res) => {
    const projects = db.prepare(`
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
    `).all(req.user.id);

    return res.status(200).json(projects);
});

router.get('/project_report/:projectId', authMiddleware, async(req, res) => {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;
    const hasDateRange = startDate && endDate;

    const rows = db.prepare(`
        SELECT
            p.id AS project_id,
            p.name AS project_name,

            tl.id AS list_id,
            tl.name AS list_name,
            tl.position,

            t.id AS task_id,
            t.title,
            t.status,
            t.due_date,

            u.id AS user_id,
            u.username,

            COALESCE(SUM(te.duration), 0) AS user_time

        FROM projects p

        LEFT JOIN task_lists tl
            ON tl.project_id = p.id
            AND tl.active = 'TRUE'

        LEFT JOIN tasks t
            ON t.task_list_id = tl.id
            ${hasDateRange ? "AND date(t.due_date) >= date(@startDate) AND date(t.due_date) < date(@endDate, '+1 day')" : ''}

        LEFT JOIN task_assignees ta
            ON ta.task_id = t.id

        LEFT JOIN users u
            ON u.id = ta.user_id

        LEFT JOIN time_entries te
            ON te.task_id = t.id
            AND te.user_id = u.id
            ${hasDateRange ? "AND date(te.start) >= date(@startDate) AND date(te.start) < date(@endDate, '+1 day')" : ''}

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
    `).all({ projectId, startDate, endDate });

    if (!rows.length) {
        return res.status(404).json({
            message: 'Projeto não encontrado.'
        });
    }

    const report = {
        project: {
            id: rows[0].project_id,
            name: rows[0].project_name
        },
        task_lists: []
    };

    const listsMap = new Map();

    rows.forEach(row => {

        if (!listsMap.has(row.list_id)) {
            listsMap.set(row.list_id, {
                id: row.list_id,
                name: row.list_name,
                tasks: []
            });

            report.task_lists.push(listsMap.get(row.list_id));
        }

        const list = listsMap.get(row.list_id);

        let task = list.tasks.find(t => t.id === row.task_id);

        if (!task && row.task_id) {
            task = {
                id: row.task_id,
                title: row.title,
                status: row.status,
                due_date: row.due_date,
                total_time: 0,
                assignees: []
            };

            list.tasks.push(task);
        }

        if (task && row.user_id) {
            task.assignees.push({
                id: row.user_id,
                username: row.username,
                time: row.user_time
            });

            task.total_time += row.user_time;
        }

    });
    res.status(200).json(report);
});

router.get('/colaborators_reports/', authMiddleware, async(req,res)=>{
    const id = req.user.id;
    const teamMates = db.prepare(`
        SELECT
            u.id AS user_id,
            u.username,

            COUNT(DISTINCT t.id) AS nr_tasks,

            COUNT(DISTINCT CASE
                WHEN t.status = 'done' THEN t.id
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

        WHERE tm.team_id IN (
            SELECT team_id
            FROM team_members
            WHERE user_id = ?
        )

        GROUP BY
            u.id,
            u.username

        ORDER BY
            u.username;
    `).all(id);

    const totalTimes = db.prepare(`
        SELECT
            te.user_id,
            COALESCE(SUM(te.duration), 0) AS total_time
        FROM time_entries te
        JOIN task_assignees ta
            ON ta.task_id = te.task_id
           AND ta.user_id = te.user_id
        JOIN tasks t
            ON t.id = te.task_id
        JOIN task_lists tl
            ON tl.id = t.task_list_id
        JOIN projects p
            ON p.id = tl.project_id
        WHERE p.team_id IN (
            SELECT team_id
            FROM team_members
            WHERE user_id = ?
        )
          AND datetime(te.created_at) >= datetime('now', '-1 month')
        GROUP BY te.user_id
    `).all(id);
    
    const timesMap = new Map(
        totalTimes.map(t => [t.user_id, t.total_time])
    );
    
    teamMates.forEach(user => {
        user.total_time = timesMap.get(user.user_id) || 0;
    });

    return res.status(200).json(teamMates);
});

router.get('/colaborator_report/:id', authMiddleware, (req, res) => {
    const userId = req.params.id;
    const { startDate, endDate } = req.query;
    const hasDateRange = startDate && endDate;

    const timeEntries = db.prepare(`
        SELECT
            t.title,
            t.status,
            tl.name AS task_list_name,
            p.name AS project_name,
            te.*
        FROM time_entries te
        JOIN task_assignees ta
            ON ta.task_id = te.task_id
           AND ta.user_id = te.user_id
        JOIN tasks t
            ON t.id = te.task_id
        JOIN task_lists tl
            ON tl.id = t.task_list_id
        JOIN projects p
            ON p.id = tl.project_id
        JOIN team_members tm
            ON tm.team_id = p.team_id
           AND tm.user_id = te.user_id
        WHERE te.user_id = ?
        ${hasDateRange ? "AND date(te.start) >= date(?) AND date(te.start) < date(?, '+1 day')" : ''}
    `).all(...(hasDateRange ? [userId, startDate, endDate] : [userId]));

    return res.status(200).json(timeEntries);
});

module.exports = router;