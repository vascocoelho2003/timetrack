const { db } = require('../db');
const { getTaskWithContext } = require('../utils/permissions');

function getRecurrency(taskOrTaskId){
  const taskId = typeof taskOrTaskId === 'object' ? taskOrTaskId.id : taskOrTaskId;
  return db.prepare('SELECT * FROM recurrence_rules WHERE task_id = ?').get(taskId);
}

function recurrenceRuleExists(taskId) {
  const rec = db.prepare(`
    SELECT *
    FROM recurrence_rules
    WHERE task_id = ?
      AND (
        active = 1
        OR active = 'true'
        OR active = 'TRUE'
        OR active = '1'
      )
  `).get(taskId);
  return !!rec;
}

function cloneTask(task, date, sourceTaskId){
    const result = db.prepare(`INSERT INTO tasks (task_list_id, parent_task_id, title, description, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)`).run(task.task_list_id, task.id, task.title, task.description, task.priority, date.toISOString());
    db.prepare(`UPDATE recurrence_rules SET task_id = ? WHERE task_id = ?`).run(result.lastInsertRowid, sourceTaskId);
}

function typeofRecurrency(taskId){
    const rec = getRecurrency(taskId);
    if(rec){
        return rec.rule_type;
    }
    return null;
}

function createRecurrency(taskId){
    const task = getTaskWithContext(taskId);
    const recurrenceRule = getRecurrency(taskId);

    if(!recurrenceRule || !recurrenceRuleExists(taskId)){
        throw new Error('No active recurrence rule found for this task');
    }

    switch(recurrenceRule.rule_type){
        case 'fixed_day':
            const date = calculateFixedDay(recurrenceRule, task.due_date);
            cloneTask(task, date, taskId);
            break;
        case 'business_day':
            const businessDate = calculateBusinessDay(recurrenceRule, task.due_date);
            cloneTask(task, businessDate, taskId);
            break;
        default:
            throw new Error('Unknown recurrence type');
    }
}

function calculateFixedDay(rule, currentDate) {
    const current = new Date(currentDate);
    const next = new Date(current);

  switch (rule.frequency) {

        case "daily":
            next.setDate(next.getDate() + rule.interval);
            break;

        case "weekly":
            next.setDate(next.getDate() + (7 * rule.interval));
            break;

        case "monthly":
            const year = current.getFullYear();
            const month = current.getMonth() + rule.interval;

            next.setFullYear(year);
            next.setMonth(month);
            next.setDate(1);

            const lastDayOfMonth = new Date(
                next.getFullYear(),
                next.getMonth() + 1,
                0
            ).getDate();

            next.setDate(Math.min(rule.day_of_month, lastDayOfMonth));
            break;

        case "yearly":
            next.setFullYear(next.getFullYear() + rule.interval);
            next.setMonth(rule.month_of_year - 1);
            next.setDate(rule.day_of_month);
            break;

        default:
            throw new Error("Unsupported frequency");
    }
    return next;
}

function isBusinessDay(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6;
}

function calculateBusinessDay(rule, currentDate) {
    const current = new Date(currentDate);
    const next = new Date(current);
    switch (rule.frequency) {
        case "daily":
            next.setDate(next.getDate() + rule.interval);
            while (!isBusinessDay(next)) {
                next.setDate(next.getDate() + 1);
            }
            break;
        case "weekly":
            next.setDate(next.getDate() + (7 * rule.interval));
            while (!isBusinessDay(next)) {
                next.setDate(next.getDate() + 1);
            }
            break;
        case "monthly": {
            next.setFullYear(current.getFullYear());
            next.setMonth(current.getMonth() + rule.interval);
            next.setDate(1);
            let businessDayCount = 0;
            while (true) {
                if (isBusinessDay(next)) {
                    businessDayCount++;
                    if (businessDayCount === rule.business_day) {
                        break;
                    }
                }
                next.setDate(next.getDate() + 1);
            }
            break;
        }
        case "yearly": {
            next.setFullYear(current.getFullYear() + rule.interval);
            next.setMonth(rule.month_of_year - 1);
            next.setDate(1);
            let businessDayCount = 0;
            while (true) {
                if (isBusinessDay(next)) {
                    businessDayCount++;
                    if (businessDayCount === rule.business_day) {
                        break;
                    }
                }
                next.setDate(next.getDate() + 1);
            }
            break;
        }
        default:
            throw new Error("Unsupported frequency");
    }
    return next;
}

module.exports = {
    getRecurrency,
    recurrenceRuleExists,
    createRecurrency
};
