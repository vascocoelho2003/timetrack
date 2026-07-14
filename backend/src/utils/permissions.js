const { db } = require('../db');

function getTeamMembership(userId, teamId) {
  return db.prepare(
    'SELECT role FROM team_members WHERE user_id = ? AND team_id = ?'
  ).get(userId, teamId);
}

function isTeamAdmin(userId, teamId) {
  const m = getTeamMembership(userId, teamId);
  return m?.role === 'admin';
}

function isTeamMember(userId, teamId) {
  return !!getTeamMembership(userId, teamId);
}

function getTeamIdForProject(projectId) {
  const row = db.prepare('SELECT team_id FROM projects WHERE id = ?').get(projectId);
  return row?.team_id;
}

function getTeamIdForTaskList(taskListId) {
  const row = db.prepare(`
    SELECT p.team_id FROM task_lists tl
    JOIN projects p ON p.id = tl.project_id
    WHERE tl.id = ?
  `).get(taskListId);
  return row?.team_id;
}

function getTeamIdForTask(taskId) {
  const row = db.prepare(`
    SELECT p.team_id FROM tasks t
    JOIN task_lists tl ON tl.id = t.task_list_id
    JOIN projects p ON p.id = tl.project_id
    WHERE t.id = ?
  `).get(taskId);
  return row?.team_id;
}

function isTaskAssignee(userId, taskId) {
  return !!db.prepare(
    'SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?'
  ).get(taskId, userId);
}

function getTaskWithContext(taskId) {
  return db.prepare(`
    SELECT t.*, tl.project_id, p.team_id
    FROM tasks t
    JOIN task_lists tl ON tl.id = t.task_list_id
    JOIN projects p ON p.id = tl.project_id
    WHERE t.id = ?
  `).get(taskId);
}


function canViewTask(userId, taskId) {
  const task = getTaskWithContext(taskId);
  if (!task) return false;
  if (!isTeamMember(userId, task.team_id)) return false;
  if (isTeamAdmin(userId, task.team_id)) return true;
  return isTaskAssignee(userId, taskId);
}

function getAssigneeIds(taskId) {
  return db.prepare('SELECT user_id FROM task_assignees WHERE task_id = ?')
    .all(taskId)
    .map(r => r.user_id);
}

function attachAssignees(tasks) {
  const stmt = db.prepare('SELECT user_id FROM task_assignees WHERE task_id = ?');
  return tasks.map(t => ({
    ...t,
    assigneeIds: stmt.all(t.id).map(r => r.user_id),
  }));
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
  canViewTask,
  getAssigneeIds,
  attachAssignees
};
