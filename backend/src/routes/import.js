const express = require('express');
const { db } = require('../db');
const {authMiddleware}=require('../middleware/auth');
const router = express.Router();
const { getDaysBetweenAlertAndDue } = require('../utils/diffDates');


router.post('/import/:team_id/:project_id', async (req,res) =>{
    try{
        const rows = req.body;
        const team_id = req.params.team_id
        const project = req.params.project_id
        // Lê todas as linhas da tabela
        for (const row of rows) {
            var task = "";
            var user = "";
            let dueDate;
            if(!row.data_limite || !row.tarefa || !row.responsavel || !row.tasklist){
                return res.status(400).json("Dados insuficientes para criar a tarefa");
            }
            if(typeof row.data_limite==="number")
            {
                dueDate = new Date((row.data_limite-25569)*86400*1000).toISOString().split("T")[0];
            }else{
                dueDate = row.data_limite;
            }

            const hojeStr = new Date().toISOString().split('T')[0];
            if(dueDate<=hojeStr){
                continue;
            }
            tasklist = db.prepare("SELECT * FROM task_lists Where project_id=? AND name=? ").get(project,row.tasklist);
            if(tasklist==null){
                db.prepare(`INSERT INTO task_lists (project_id, name) VALUES(?,?)`).run(project, row.tasklist);
                tasklist = db.prepare("SELECT * FROM task_lists Where project_id=? AND name=? ").get(project,row.tasklist);
            }

            // verifica se a tarefa já foi importada
            task = db.prepare("SELECT * FROM tasks WHERE title=? AND task_list_id=? AND due_date=?").get(row.tarefa,tasklist.id,dueDate);
            if(task){continue;}

            // Cria a tarefa na BD
            insertTaskStmt = db.prepare(`INSERT INTO tasks(task_list_id,title,description,priority,due_date,created_by_user_id,next_alert_date, alert_offset_days) VALUES(?,?,?,?,?,?,?, ?)`);
            const priority = row.priority ?? 'medium';
            if(row.alert_date){
                alert_date = new Date((row.alert_date-25569)*86400*1000).toISOString().split("T")[0];
            }else{
                alert_date=null;
            }
            let alert_offset_days
            if (alert_date && dueDate) {
                alert_offset_days = getDaysBetweenAlertAndDue(alert_date, dueDate);
            }
            if (alert_offset_days != null && alert_offset_days <= 0) {
                alert_offset_days = 0;
                alert_date = null;
                dueDate = null;
            }
            
            const diffInDays = getDaysBetweenAlertAndDue(alert_date, dueDate);

            task = insertTaskStmt.run(
                tasklist.id,
                row.tarefa,
                row.descricao || '',
                priority,
                dueDate,
                req.user.id,
                alert_date,
                alert_offset_days = diffInDays || 0
            )

            // Atribui a tarefa a um utilizador
            if(row.responsavel){
                user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(row.responsavel);
                if(user)team_member = db.prepare(`SELECT * FROM team_members WHERE user_id = ? AND team_id = ?`).get(user.id, team_id)
                if(user && team_member){db.prepare(`INSERT INTO task_assignees (task_id, user_id) VALUES(?,?)`).run(task.lastInsertRowid, user.id)}
            }

            // Cria o registo da tabela recurrence_rules
            if(row.recurrency == null){
                continue;
            }else{
                // Recomenda-se colocar o prepare FORA do ciclo de importação para máxima performance:
                const insertRecurrenceStmt = db.prepare(`
                    INSERT INTO recurrence_rules (
                        task_id, frequency, interval, start_date, weekday, day_of_month, month_of_year
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `);

                // --- DENTRO DO CICLO / FLUXO DE PROCESSAMENTO ---
                if (!task || !row.recurrency) continue;

                // 1. Tratamento da data (Cria o objeto Date uma única vez)
                const dateObj = typeof row.data_limite === "number"
                    ? new Date((row.data_limite - 25569) * 86400 * 1000)
                    : new Date(row.data_limite);

                const dueDate = dateObj.toISOString().split("T")[0];
                const dias = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

                // 2. Extração condicional dos campos de recorrência
                let weekday = null;
                let dayOfMonth = null;
                let monthOfYear = null;

                switch (row.recurrency) {
                    case "weekly":
                        weekday = dias[dateObj.getDay()];
                        break;
                    case "monthly":
                        dayOfMonth = dateObj.getDate();
                        break;
                    case "yearly":
                        dayOfMonth = dateObj.getDate();
                        monthOfYear = dateObj.getMonth() + 1;
                        break;
                    case "daily":
                        break;
                    default:
                        continue; // Ignora se for um tipo de recorrência desconhecido
                }

                // 3. Inserção única e limpa na BD
                insertRecurrenceStmt.run(
                    task.lastInsertRowid,
                    row.recurrency,
                    row.interval || 1,
                    dueDate,
                    weekday,
                    dayOfMonth,
                    monthOfYear
                );
            }
        }
        return res.status(200).json(rows)

    }catch (error) {
        console.error(error);
        res.status(500).json({
        success: false
        });
    }
    }
);

module.exports = router;