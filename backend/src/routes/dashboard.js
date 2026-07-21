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

module.exports = router;