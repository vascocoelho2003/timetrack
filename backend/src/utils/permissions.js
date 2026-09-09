const { db } = require("../db");

/**
 * Obtém o membro da equipa
 * @param {*} userId
 * @param {*} teamId
 * @returns
 */
function getTeamMembership(userId, teamId) {
  return db
    .prepare("SELECT role FROM team_members WHERE user_id = ? AND team_id = ?")
    .get(userId, teamId);
}

/**
 * Verifica se o utilizador é administrador da equipa
 * @param {*} userId
 * @param {*} teamId
 * @returns
 */
function isTeamAdmin(userId, teamId) {
  const m = getTeamMembership(userId, teamId);
  return m?.role === "admin";
}

/**
 * Verifica se o utilizador é membro da equipa
 * @param {*} userId
 * @param {*} teamId
 * @returns
 */
function isTeamMember(userId, teamId) {
  return !!getTeamMembership(userId, teamId);
}

/**
 * Obtém o ID da equipa do projeto
 * @param {*} projectId
 * @returns
 */
function getTeamIdForProject(projectId) {
  const row = db
    .prepare("SELECT team_id FROM projects WHERE id = ?")
    .get(projectId);
  return row?.team_id;
}

/**
 * Obtém o ID da equipa da lista de tarefas
 * @param {*} taskListId
 * @returns
 */
function getTeamIdForTaskList(taskListId) {
  const row = db
    .prepare(
      `
    SELECT p.team_id FROM task_lists tl
    JOIN projects p ON p.id = tl.project_id
    WHERE tl.id = ?
  `,
    )
    .get(taskListId);
  return row?.team_id;
}

/**
 * Obtém o ID da equipa da tarefa
 */
function getTeamIdForTask(taskId) {
  const row = db
    .prepare(
      `
    SELECT p.team_id FROM tasks t
    LEFT JOIN task_lists tl ON tl.id = t.task_list_id
    LEFT JOIN projects p ON p.id = tl.project_id
    WHERE t.id = ?
  `,
    )
    .get(taskId);
  return row?.team_id;
}

/**
 * Verifica se o utilizador é responsável por uma tarefa
 * @param {*} userId
 * @param {*} taskId
 * @returns
 */
function isTaskAssignee(userId, taskId) {
  return !!db
    .prepare("SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?")
    .get(taskId, userId);
}

/**
 * Obtém a tarefa com o contexto da equipa
 * @param {*} taskId
 * @returns
 */
function getTaskWithContext(taskId) {
  return db
    .prepare(
      `
    SELECT t.*, tl.project_id, p.team_id
    FROM tasks t
    LEFT JOIN task_lists tl ON tl.id = t.task_list_id
    LEFT JOIN projects p ON p.id = tl.project_id
    WHERE t.id = ?
  `,
    )
    .get(taskId);
}

/**
 * Verifica se o utilizador é o proprietário da tarefa pessoal
 * @param {*} userId
 * @param {*} task
 * @returns
 */
function isPersonalTaskOwner(userId, task) {
  if (!task || task.team_id) return false;
  return (
    isTaskAssignee(userId, task.id) ||
    Number(task.created_by_user_id) === Number(userId)
  );
}

/**
 * Verifica se o utilizador pode visualizar uma tarefa
 * @param {*} userId
 * @param {*} taskId
 * @returns
 */
function canViewTask(userId, taskId) {
  const task = getTaskWithContext(taskId);
  if (!task) return false;
  if (task.team_id) return isTeamMember(userId, task.team_id);
  return isPersonalTaskOwner(userId, task);
}

/**
 * Obtém os IDs dos responsáveis por uma tarefa
 * @param {*} taskId
 * @returns
 */
function getAssigneeIds(taskId) {
  return db
    .prepare("SELECT user_id FROM task_assignees WHERE task_id = ?")
    .all(taskId)
    .map((r) => r.user_id);
}

/**
 * Obtem as tarefas com os responsáveis e o tempo total
 * @param {*} tasks
 * @returns
 */
function attachAssignees(tasks) {
  const assigneeStmt = db.prepare(`
    SELECT u.id, u.username, u.email
    FROM users u
    JOIN task_assignees ta ON ta.user_id = u.id
    WHERE ta.task_id = ?
  `);
  const totalTimeStmt = db.prepare(`
    SELECT COALESCE(SUM(duration), 0) AS total_time
    FROM time_entries
    WHERE task_id = ? AND end IS NOT NULL
  `);

  return tasks.map((t) => {
    const assignees = assigneeStmt.all(t.id);
    const totalTime = totalTimeStmt.get(t.id)?.total_time || 0;

    return {
      ...t,
      total_time: totalTime,
      assigneeIds: assignees.map((a) => a.id),
      assignees,
    };
  });
}

module.exports = {
  getTeamMembership,
  isTeamAdmin,
  isTeamMember,
  getTeamIdForProject,
  getTeamIdForTaskList,
  getTeamIdForTask,
  isTaskAssignee,
  getTaskWithContext,
  isPersonalTaskOwner,
  canViewTask,
  getAssigneeIds,
  attachAssignees,
};
