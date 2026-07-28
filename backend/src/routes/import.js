const express = require('express');
const { db } = require('../db');
const {authMiddleware}=require('../middleware/auth');
const router = express.Router();


router.post('/import/:team_id/:project_id', async (req,res) =>{
    try{
        const rows = req.body;
        const team_id = req.params.team_id
        const project = req.params.project_id
        for (const row of rows) {
            var task = "";
            var user = "";
            if(!row.data_limite || !row.tarefa || !row.responsavel || !row.tasklist){
                return res.status(400).json("Dados insuficientes para criar a tarefa");
            }
            let dueDate;
            if(typeof row.data_limite==="number")
            {
                dueDate = new Date((row.data_limite-25569)*86400*1000).toISOString().split("T")[0];
            }else{
                dueDate = row.data_limite;
            }
            tasklist = db.prepare("SELECT * FROM task_lists Where project_id=? AND name=? ").get(project,row.tasklist);
            if(tasklist==null){
                db.prepare(`INSERT INTO task_lists (project_id, name) VALUES(?,?)`).run(project, row.tasklist);
                tasklist = db.prepare("SELECT * FROM task_lists Where project_id=? AND name=? ").get(project,row.tasklist);
            }
            task = db.prepare("SELECT * FROM tasks WHERE title=? AND task_list_id=? AND due_date=?").get(row.tarefa,tasklist.id,dueDate);
            if(task){continue;}
            if (row.priority == null) {
                task = db.prepare(`
                    INSERT INTO tasks (task_list_id,title,description,due_date) VALUES (?, ?, ?, ?)`).run(tasklist.id,row.tarefa,row.descricao,dueDate);
            } else {
                task = db.prepare(`INSERT INTO tasks (task_list_id,title,description,priority,due_date) VALUES (?, ?, ?, ?, ?)`).run(tasklist.id,row.tarefa,
                    row.descricao,
                    row.priority,
                    dueDate
                );
            }

            if(row.responsavel){
                user = db.prepare(`SELECT * FROM users WHERE username = ?`).get(row.responsavel);
                if(user){db.prepare(`INSERT INTO task_assignees (task_id, user_id) VALUES(?,?)`).run(task.lastInsertRowid, user.id)}
            }

            if(row.recurrency == null){
                continue;
            }else{
                if(task){
                    let dueDate;
                    if (typeof row.data_limite === "number") {
                        dueDate = new Date((row.data_limite - 25569) * 86400 * 1000)
                            .toISOString()
                            .split("T")[0];
                    } else {
                        dueDate = row.data_limite;
                    }

                const dias = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
                const diaSemana = dias[new Date(dueDate).getDay()];
                const day_of_month = new Date(dueDate).getDate();
                const month_of_year = new Date(dueDate).getMonth() + 1;

                switch(row.recurrency){
                    case "daily":
                        if(row.interval){
                            db.prepare('INSERT INTO recurrence_rules (task_id, frequency, interval, start_date) VALUES (?,?,?,?)').run(task.lastInsertRowid, "daily", row.interval, dueDate)
                        }else{
                            db.prepare('INSERT INTO recurrence_rules (task_id, frequency, interval, start_date) VALUES (?,?,?,?)').run(task.lastInsertRowid, "daily", 1, dueDate)
                        }
                        break;
                    case "weekly":
                        if(row.interval){
                            db.prepare('INSERT INTO recurrence_rules (task_id, frequency, interval, start_date, weekday) VALUES (?,?,?,?,?)').run(task.lastInsertRowid, "weekly", row.interval, dueDate, diaSemana)
                        }else{
                            db.prepare('INSERT INTO recurrence_rules (task_id, frequency, interval, start_date, weekday) VALUES (?,?,?,?,?)').run(task.lastInsertRowid, "weekly", 1, dueDate, diaSemana)
                        }
                        break;
                    case "monthly":
                        if(row.interval){
                            db.prepare('INSERT INTO recurrence_rules (task_id, frequency, interval, start_date, day_of_month) VALUES (?,?,?,?,?)').run(task.lastInsertRowid, "monthly", row.interval,dueDate, day_of_month)
                        }else{
                            db.prepare('INSERT INTO recurrence_rules (task_id, frequency, interval, start_date, day_of_month) VALUES (?,?,?,?,?)').run(task.lastInsertRowid, "monthly", 1, dueDate, day_of_month)
                        }
                        break;
                    case "yearly":
                        if(row.interval){
                            db.prepare('INSERT INTO recurrence_rules (task_id, frequency, interval, start_date, day_of_month,month_of_year ) VALUES (?,?,?,?,?,?)').run(task.lastInsertRowid, "yearly", row.interval, dueDate, day_of_month, month_of_year)
                        }else{
                            db.prepare('INSERT INTO recurrence_rules (task_id, frequency, interval, start_date, day_of_month,month_of_year ) VALUES (?,?,?,?,?,?)').run(task.lastInsertRowid, "yearly", 1, dueDate, day_of_month, month_of_year)
                        }
                        break;
                }}{continue;}
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