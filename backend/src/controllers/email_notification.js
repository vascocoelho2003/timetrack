const { db } = require("../db");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Verifica se o Gmail está configurado corretamente
transporter.verify((error, success) => {
    if (error) {
        console.error("Erro no SMTP:", error);
    } else {
        console.log("Servidor de email pronto");
    }
});


async function getNearDueDateTasks() {
    try {
        const tasks = db.prepare(`
            SELECT id, title, due_date
            FROM tasks
            WHERE date(next_alert_date) = date('now')
            AND status != 'done'
            AND (near_due_email_sent = 0 OR near_due_email_sent IS NULL);
        `).all();

        console.log("Tarefas a notificar:", tasks);

        await sendEmailNotifications(tasks);

    } catch (error) {
        console.error("Erro ao procurar tarefas:", error);
    }
}

async function sendEmailNotifications(tasks) {

    const getUsers = db.prepare(`
        SELECT u.email
        FROM users u
        JOIN task_assignees ta ON u.id = ta.user_id
        WHERE ta.task_id = ?
    `);


    const markAsSent = db.prepare(`
        UPDATE tasks
        SET near_due_email_sent = 1
        WHERE id = ?
    `);


    for (const task of tasks) {

        try {

            const users = getUsers.all(task.id);

            console.log(
                `Tarefa "${task.title}" atribuída a:`,
                users
            );


            if (users.length === 0) {
                console.log(
                    `A tarefa ${task.id} não tem responsáveis`
                );
                continue;
            }


            for (const user of users) {

                await sendEmail(
                    user.email,
                    "A sua tarefa vence dentro de uma semana",
                    `
                        Olá,

                        A tarefa "${task.title}" vence no dia ${task.due_date}.

                        Por favor, verifique se consegue concluí-la antes da data limite.

                        Cumprimentos,
                        Task Manager
                        `
                );

                console.log(
                    `Email enviado para ${user.email}`
                );
            }


            // Só marca como enviado se todos os emails foram enviados
            markAsSent.run(task.id);

            console.log(
                `Tarefa ${task.id} marcada como notificada`
            );


        } catch (error) {

            console.error(
                `Erro ao enviar notificação da tarefa ${task.id}:`,
                error
            );

        }
    }
}

async function sendEmail(to, subject, text) {

    await transporter.sendMail({
        from: process.env.EMAIL,
        to,
        subject,
        text
    });

}

module.exports = {
    getNearDueDateTasks
};