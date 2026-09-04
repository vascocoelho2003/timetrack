const { db } = require('../db');

const STATUS_LABEL = {
  todo: 'Por fazer',
  doing: 'Em progresso',
  done: 'Concluída',
};

const TYPE_LABEL = {
  FS: 'Finish to Start',
  SS: 'Start to Start',
  FF: 'Finish to Finish',
  SF: 'Start to Finish',
};

function blockingReason(dep, targetStatus) {
  const title = dep.predecessor_title;
  const predLabel = STATUS_LABEL[dep.predecessor_status] || dep.predecessor_status;
  const typeLabel = TYPE_LABEL[dep.dependency_type] || dep.dependency_type;
  const predStatus = dep.predecessor_status;

  if (targetStatus !== 'todo') {
    if (dep.dependency_type === 'FS' && predStatus !== 'done') {
      return `A dependência ${dep.dependency_type} (${typeLabel}) com «${title}» exige que essa tarefa esteja concluída (Estado atual: ${predLabel}).`;
    }
    if (dep.dependency_type === 'SS' && predStatus === 'todo') {
      return `A dependência ${dep.dependency_type} (${typeLabel}) com «${title}» exige que essa tarefa já tenha arrancado (Estado atual: ${predLabel}).`;
    }
  }

  if (targetStatus === 'done') {
    if (dep.dependency_type === 'FF' && predStatus !== 'done') {
      return `A dependência ${dep.dependency_type} (${typeLabel}) com «${title}» exige que essa tarefa esteja concluída (Estado atual: ${predLabel}).`;
    }
    if (dep.dependency_type === 'SF' && predStatus === 'todo') {
      return `A dependência ${dep.dependency_type} (${typeLabel}) com «${title}» exige que essa tarefa já tenha arrancado (Estado atual: ${predLabel}).`;
    }
  }

  return null;
}

function checkDependencies(taskId, targetStatus) {
  if (!targetStatus) {
    return { ok: true };
  }

  const dependencies = db.prepare(`
    SELECT d.predecessor, d.dependency_type,
           p.title AS predecessor_title, p.status AS predecessor_status
    FROM dependencies d
    JOIN tasks p ON d.predecessor = p.id
    WHERE d.successor = ?
  `).all(taskId);

  if (dependencies.length === 0) {
    return { ok: true };
  }

  const blockers = [];
  for (const dep of dependencies) {
    const reason = blockingReason(dep, targetStatus);
    if (reason) {
      blockers.push({
        predecessor: dep.predecessor,
        predecessor_title: dep.predecessor_title,
        predecessor_status: dep.predecessor_status,
        dependency_type: dep.dependency_type,
        reason,
      });
    }
  }

  if (blockers.length === 0) {
    return { ok: true };
  }

  const error = blockers.length === 1
    ? `Não é possível alterar o estado. ${blockers[0].reason}`
    : `Não é possível alterar o estado:\n${blockers.map(b => `• ${b.reason}`).join('\n')}`;

  return { ok: false, error, blocking: blockers[0], blockers };
}

module.exports = {
  checkDependencies
};
