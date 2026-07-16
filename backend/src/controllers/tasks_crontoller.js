const { db } = require('../db');
const { sendDueTaskEmail } = require('../services/email.service')

function checkDueTasks(){
    result = db.prepare(`SELECT * FROM tasks WHERE status !='done' AND due_date BETWEEN DATE('now') AND DATE('now','+3 day')`).all();
    result.forEach(task => {
        users = db.prepare(`SELECT u.email, u.username FROM users u JOIN task_assignees ta ON ta.user_id = u.id WHERE ta.task_id = ?`).all(task.id)
        users.forEach(user => {
            sendDueTaskEmail(user,task);
        })
    });
}

module.exports ={
    checkDueTasks
}