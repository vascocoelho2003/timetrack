const { db } = require("../db");

function taskHasRegisteredTime(taskId) {
  if (!taskId) return false;
  const row = db
    .prepare("SELECT 1 FROM time_entries WHERE task_id = ? LIMIT 1")
    .get(taskId);
  return !!row;
}

function markTaskInProgressIfTodo(taskId) {
  if (!taskId) return;
  db.prepare(
    "UPDATE tasks SET status = 'doing' WHERE id = ? AND status = 'todo'",
  ).run(taskId);
}

module.exports = { taskHasRegisteredTime, markTaskInProgressIfTodo };
