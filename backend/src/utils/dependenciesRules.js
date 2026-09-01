const { db } = require('../db');

function checkDependencies(taskId, targetStatus) {
    // 1. Procura as dependências da tarefa
    const dependencies = db.prepare(`
        SELECT d.dependency_type, p.status AS predecessor_status
        FROM dependencies d
        JOIN tasks p ON d.predecessor = p.id
        WHERE d.successor = ?
    `).all(taskId);

    // Se não tem dependências, TRUE
    if (dependencies.length === 0) {
        return true;
    }

    // 2. Valida apenas as dependências relevantes para o novo estado
    for (const dep of dependencies) {
        const predStatus = dep.predecessor_status;

        // Validações para 'doing'
        if (targetStatus !='todo') {
            if (dep.dependency_type === 'FS' && predStatus !== 'done') {
                return false; // FS: Predecessora tem de estar 'done'
            }
            if (dep.dependency_type === 'SS' && predStatus === 'todo') {
                return false; // SS: Predecessora tem de ter arrancado ('doing' ou 'done')
            }
        }

        // Validações para 'done'
        if (targetStatus === 'done') {
            if (dep.dependency_type === 'FF' && predStatus !== 'done') {
                return false; // FF: Predecessora tem de estar 'done'
            }
            if (dep.dependency_type === 'SF' && predStatus === 'todo') {
                return false; // SF: Predecessora tem de ter arrancado ('doing' ou 'done')
            }
        }
    }

    // Se nenhuma regra bloqueou, a transição é permitida
    return true;
}

module.exports = {
    checkDependencies
};