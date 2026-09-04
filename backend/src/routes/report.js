const express = require('express');
const { db } = require('../db');
const {authMiddleware} = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware)

/**
 * Prepara a data de início para ser utilizada na query
 * @param {*} date 
 * @returns 
 */
function toStartOfDay(date) {
    if (!date) return date;
    
    if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(date)) {
        const [dia, mes, ano] = date.split(/[-/]/);
        date = `${ano}-${mes}-${dia}`;
    }
    return date.length <= 10 ? `${date}T00:00:00.000Z` : date;
}

/**
 * Prepara a data de fim para ser utilizada na query
 * @param {*} date 
 * @returns 
 */
function toEndOfDay(date) {
    if (!date) return date;
    
    if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(date)) {
        const [dia, mes, ano] = date.split(/[-/]/);
        date = `${ano}-${mes}-${dia}`;
    }
    return date.length <= 10 ? `${date}T23:59:59.999Z` : date;
}

/**
 * Relatório Geral do Clientes:
 * Relatório com o nome dos colaboradores, nr_tarefas e tempo despendido em tarefas onde eu(ou o meu departamento) sou o cliente
 */
router.get('/generalClientReport', authMiddleware, async (req, res) => {
    const user_id = req.user.id;
    const department = req.query.department === 'true';
    const currentYear = new Date().getFullYear();
    const startDate = toStartOfDay(req.query.startDate || req.body.startDate || `${currentYear}-01-01`);
    const endDate = toEndOfDay(req.query.endDate || req.body.endDate || new Date().toISOString().slice(0, 10));

    let client = null;
    if (department) {
        const dep = db.prepare(`SELECT department_id FROM users WHERE id = ?`).get(user_id);
        if (!dep?.department_id) {
            return res.status(404).json({ error: 'Departamento não encontrado.' });
        }
        client = db.prepare(`SELECT id FROM clients WHERE department_id = ?`).get(dep.department_id);
        if (!client) {
            return res.status(404).json({ error: 'Cliente de departamento não encontrado.' });
        }
    } else {
        client = db.prepare(`SELECT id FROM clients WHERE user_id = ?`).get(user_id);
        if (!client) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
    }

    const registos = db.prepare(`
        SELECT 
            te.user_id,
            u.username,
            COUNT(DISTINCT te.task_id) AS total_tarefas,
            SUM(te.duration) AS tempo_total,
            MAX(te.end) AS ultima_atualizacao
        FROM time_entries te
        JOIN tasks t ON te.task_id = t.id
        LEFT JOIN users u ON te.user_id = u.id
        WHERE t.client_id = ?
          AND te.start >= ? 
          AND te.end <= ?
        GROUP BY te.user_id, u.username
    `).all(client.id, startDate, endDate);

    return res.status(200).json(registos);
});

/**
 * Individual Client Report
 * Relatório de um colaborador individual com tarefas onde eu(ou o meu departamento) sou o cliente
 */
router.get('/ClientReport/:user_id', authMiddleware, async(req,res)=>{
    const user_logged = req.user.id;
    const user_id = Number(req.params.user_id);
    const department = req.query.department === 'true';

    const currentYear = new Date().getFullYear();
    const startDate = toStartOfDay(req.query.startDate || `${currentYear}-01-01`);
    const endDate = toEndOfDay(req.query.endDate || new Date().toISOString().slice(0, 10));
    let client = null;
    if (department) {
        const dep = db.prepare(`SELECT department_id FROM users WHERE id = ?`).get(user_logged);
        if (!dep?.department_id) {
            return res.status(404).json({ error: 'Departamento não encontrado.' });
        }
        client = db.prepare(`SELECT id FROM clients WHERE department_id = ?`).get(dep.department_id);
        if (!client) {
            return res.status(404).json({ error: 'Cliente de departamento não encontrado.' });
        }
    } else {
        client = db.prepare(`SELECT id FROM clients WHERE user_id = ?`).get(user_logged);
        if (!client) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
    }

    const tasks = db.prepare(`
        SELECT t.title, t.status, t.due_date, ta.task_id, ta.user_id,
               SUM(te.duration) as duration, MAX(te.end) as ultima_atualizacao
        FROM tasks t
        JOIN task_assignees ta ON t.id = ta.task_id
        JOIN time_entries te ON ta.task_id = te.task_id AND ta.user_id = te.user_id
        WHERE t.client_id = ?
          AND ta.user_id = ?
          AND te.start >= ?
          AND te.end <= ?
        GROUP BY t.id, ta.user_id
    `).all(client.id, user_id, startDate, endDate);

    res.status(200).json(tasks);
});

/**
 * Relatório Pessoal
 * nr de tarefas e tempo despendido pelo colaborador para cada cliente
 */
router.get('/ColaboratorReport', authMiddleware, async(req,res)=>{
    logged_user_id = req.user.id;
    const currentYear = new Date().getFullYear();
    const startDate = toStartOfDay(req.query.startDate || `${currentYear}-01-01`);
    const endDate = toEndOfDay(req.query.endDate || new Date().toISOString().slice(0, 10));
    registos = db.prepare(`SELECT c.id, c.user_id as user_id, c.department_id as department_id, c.client_type, COUNT(DISTINCT t.id) as nr_tarefas, SUM(te.duration) as duration from task_assignees ta JOIN tasks t ON ta.task_id = t.id JOIN time_entries te ON te.user_id = ta.user_id AND te.task_id = t.id JOIN clients c ON t.client_id = c.id WHERE ta.user_id = ?  AND te.start >= ?
          AND te.end <= ? GROUP BY client_id`).all(logged_user_id,startDate, endDate);
    registos.forEach(r => {
        let name;
        if(r.client_type==='person'){
            name = db.prepare(`SELECT username as name FROM users WHERE id = ?`).get(r.user_id);      
        }else if(r.client_type==='department'){
            name = db.prepare(`SELECT name as name FROM departments WHERE id = ?`).get(r.department_id);
        }
        r.name=name?.name
    });
    return res.status(200).json(registos);
});

/**
 * Relatório do Cliente para o Colaborador
 */
router.get('/ColaboratorClientReport/:client_id', authMiddleware, async (req, res) => {
    const logged_user_id = req.user.id;
    const client_id = Number(req.params.client_id);
    const currentYear = new Date().getFullYear();
    const startDate = toStartOfDay(req.query.startDate || `${currentYear}-01-01`);
    const endDate = toEndOfDay(req.query.endDate || new Date().toISOString().slice(0, 10));
    const tasks = db.prepare(`
        SELECT t.title, t.status, t.due_date, t.id as task_id,
               SUM(te.duration) as duration, MAX(te.end) as ultima_atualizacao
        FROM tasks t
        JOIN task_assignees ta ON t.id = ta.task_id
        JOIN time_entries te ON t.id = te.task_id AND te.user_id = ta.user_id
        WHERE ta.user_id = ?
          AND t.client_id = ?
          AND te.start >= ?
          AND te.end <= ?
        GROUP BY t.id
    `).all(logged_user_id, client_id, startDate, endDate);
    return res.status(200).json(tasks);
});

module.exports = router;