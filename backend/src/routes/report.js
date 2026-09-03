const express = require('express');
const { db } = require('../db');
const {authMiddleware} = require('../middleware/auth');
const router = express.Router();

function toStartOfDay(date) {
    if (!date) return date;
    
    if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(date)) {
        const [dia, mes, ano] = date.split(/[-/]/);
        date = `${ano}-${mes}-${dia}`;
    }
    return date.length <= 10 ? `${date}T00:00:00.000Z` : date;
}

function toEndOfDay(date) {
    if (!date) return date;
    
    if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(date)) {
        const [dia, mes, ano] = date.split(/[-/]/);
        date = `${ano}-${mes}-${dia}`;
    }
    return date.length <= 10 ? `${date}T23:59:59.999Z` : date;
}

router.use(authMiddleware)

router.get('/generalClientReport', authMiddleware, async (req, res) => {
    const user_id = req.user.id;

    const currentYear = new Date().getFullYear();
    const startDate = toStartOfDay(req.query.startDate || req.body.startDate || `${currentYear}-01-01`);
    const endDate = toEndOfDay(req.query.endDate || req.body.endDate || new Date().toISOString().slice(0, 10));

    const client = db.prepare(`SELECT id FROM clients WHERE user_id = ?`).get(user_id);
    if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
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

router.get('/ClientReport/:user_id', authMiddleware, async(req,res)=>{
    const user_logged = req.user.id;
    const user_id = Number(req.params.user_id);
    const client = db.prepare('SELECT * FROM clients WHERE user_id = ?').get(user_logged);
    if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const tasks = db.prepare(`
        SELECT t.title, t.status, t.due_date, ta.task_id, ta.user_id,
               SUM(te.duration) as duration, MAX(te.end) as ultima_atualizacao
        FROM tasks t
        JOIN task_assignees ta ON t.id = ta.task_id
        JOIN time_entries te ON ta.task_id = te.task_id AND ta.user_id = te.user_id
        WHERE t.client_id = ?
          AND ta.user_id = ?
        GROUP BY t.id, ta.user_id
    `).all(client.id, user_id);

    res.status(200).json(tasks);
})

module.exports = router;