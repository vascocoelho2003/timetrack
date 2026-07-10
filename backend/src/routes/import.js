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
                db.prepare(`
                    INSERT INTO tasks (task_list_id,title,description,due_date) VALUES (?, ?, ?, ?)`).run(tasklist.id,row.tarefa,row.descricao,dueDate);
            } else {
                db.prepare(`INSERT INTO tasks (task_list_id,title,description,priority,due_date) VALUES (?, ?, ?, ?, ?)`).run(tasklist.id,row.tarefa,
                    row.descricao,
                    row.priority,
                    dueDate
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