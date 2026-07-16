const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service:'gmail',
    auth:{
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});

async function sendDueTaskEmail(user, task) {
    await transporter.sendMail({
        to: user.email,
        subject: `Prazo da tarefa "${task.title}"`,
        text: `Olá ${user.username},

        A tarefa "${task.title}" termina no dia ${task.due_date}.

        Não te esqueças de a concluir a tempo.`
    });
}

module.exports = {sendDueTaskEmail}