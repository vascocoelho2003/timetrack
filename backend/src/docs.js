const docs = [
  {
    group: 'Saúde',
    method: 'GET',
    path: '/api/health',
    auth: false,
    description: 'Verifica se a API está disponível.',
  },
  {
    group: 'Autenticação',
    method: 'POST',
    path: '/api/auth/register',
    auth: false,
    description: 'Cria um novo utilizador, guarda a password com hash e devolve um token JWT.',
  },
  {
    group: 'Autenticação',
    method: 'POST',
    path: '/api/auth/login',
    auth: false,
    description: 'Autentica um utilizador e devolve um token JWT.',
  },
  {
    group: 'Autenticação',
    method: 'GET',
    path: '/api/auth/me',
    auth: true,
    description: 'Devolve os dados do utilizador autenticado.',
  },
  {
    group: 'Equipas',
    method: 'GET',
    path: '/api/teams',
    auth: true,
    description: 'Lista as equipas às quais o utilizador atual pertence.',
  },
  {
    group: 'Equipas',
    method: 'POST',
    path: '/api/teams',
    auth: true,
    description: 'Cria uma nova equipa e define o utilizador como administrador.',
  },
  {
    group: 'Equipas',
    method: 'GET',
    path: '/api/teams/:teamId/members',
    auth: true,
    description: 'Lista os membros de uma equipa.',
  },
  {
    group: 'Equipas',
    method: 'POST',
    path: '/api/teams/:teamId/members',
    auth: true,
    description: 'Adiciona um utilizador à equipa, desde que o pedido seja feito por um administrador.',
  },
  {
    group: 'Equipas',
    method: 'DELETE',
    path: '/api/teams/:teamId/members/:userId',
    auth: true,
    description: 'Remove um membro da equipa.',
  },
  {
    group: 'Equipas',
    method: 'DELETE',
    path: '/api/teams/:teamId',
    auth: true,
    description: 'Elimina uma equipa, disponível apenas para administradores.',
  },
  {
    group: 'Projetos',
    method: 'GET',
    path: '/api/projects/team/:teamId',
    auth: true,
    description: 'Lista os projetos de uma equipa.',
  },
  {
    group: 'Projetos',
    method: 'POST',
    path: '/api/projects/team/:teamId',
    auth: true,
    description: 'Cria um projeto numa equipa e cria automaticamente uma lista inicial “A fazer”.',
  },
  {
    group: 'Projetos',
    method: 'GET',
    path: '/api/projects/:projectId',
    auth: true,
    description: 'Obtém os detalhes de um projeto.',
  },
  {
    group: 'Projetos',
    method: 'PUT',
    path: '/api/projects/:projectId',
    auth: true,
    description: 'Atualiza os dados de um projeto, disponível apenas para administradores.',
  },
  {
    group: 'Projetos',
    method: 'DELETE',
    path: '/api/projects/:projectId',
    auth: true,
    description: 'Elimina um projeto, disponível apenas para administradores.',
  },
  {
    group: 'Listas de tarefas',
    method: 'GET',
    path: '/api/task-lists/project/:projectId',
    auth: true,
    description: 'Lista as listas de tarefas de um projeto.',
  },
  {
    group: 'Listas de tarefas',
    method: 'POST',
    path: '/api/task-lists/project/:projectId',
    auth: true,
    description: 'Cria uma nova lista de tarefas num projeto.',
  },
  {
    group: 'Listas de tarefas',
    method: 'GET',
    path: '/api/task-lists/:listId/tasks',
    auth: true,
    description: 'Lista as tarefas de uma lista. Utilizadores normais só veem as tarefas em que estão atribuídos.',
  },
  {
    group: 'Listas de tarefas',
    method: 'DELETE',
    path: '/api/task-lists/:listId',
    auth: true,
    description: 'Remove uma lista de tarefas, disponível apenas para administradores.',
  },
  {
    group: 'Tarefas',
    method: 'POST',
    path: '/api/tasks',
    auth: true,
    description: 'Cria uma nova tarefa numa lista e opcionalmente associa assignees.',
  },
  {
    group: 'Tarefas',
    method: 'GET',
    path: '/api/tasks/:taskId',
    auth: true,
    description: 'Obtém os detalhes de uma tarefa, incluindo subtarefas, comentários e assignees.',
  },
  {
    group: 'Tarefas',
    method: 'PUT',
    path: '/api/tasks/:taskId',
    auth: true,
    description: 'Atualiza uma tarefa. Administradores podem editar tudo; outros utilizadores só podem alterar o estado.',
  },
  {
    group: 'Tarefas',
    method: 'DELETE',
    path: '/api/tasks/:taskId',
    auth: true,
    description: 'Remove uma tarefa, disponível apenas para administradores.',
  },
  {
    group: 'Tarefas',
    method: 'POST',
    path: '/api/tasks/:taskId/comments',
    auth: true,
    description: 'Adiciona um comentário a uma tarefa.',
  },
  {
    group: 'Tarefas',
    method: 'DELETE',
    path: '/api/tasks/:taskId/comments/:commentId',
    auth: true,
    description: 'Remove um comentário, disponível apenas para o autor.',
  },
  {
    group: 'Tempo',
    method: 'POST',
    path: '/api/time/start',
    auth: true,
    description: 'Inicia um registo de tempo para uma tarefa, disponível apenas para assignees.',
  },
  {
    group: 'Tempo',
    method: 'POST',
    path: '/api/time/stop',
    auth: true,
    description: 'Termina o timer ativo do utilizador atual.',
  },
  {
    group: 'Tempo',
    method: 'GET',
    path: '/api/time/active',
    auth: true,
    description: 'Devolve o timer ativo do utilizador atual, se existir.',
  },
  {
    group: 'Tempo',
    method: 'GET',
    path: '/api/time/task/:taskId',
    auth: true,
    description: 'Lista os registos de tempo de uma tarefa.',
  },
  {
    group: 'Tempo',
    method: 'GET',
    path: '/api/time/reports/team/:teamId',
    auth: true,
    description: 'Gera relatórios de tempo por utilizador, projeto e tarefa para uma equipa.',
  },
  {
    group: 'Tempo',
    method: 'GET',
    path: '/api/time/reports/project/:projectId',
    auth: true,
    description: 'Gera relatórios de tempo por utilizador e tarefa para um projeto.',
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderDocsPage() {
  const grouped = docs.reduce((acc, endpoint) => {
    const section = acc[endpoint.group] || [];
    section.push(endpoint);
    acc[endpoint.group] = section;
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([group, endpoints]) => `
    <section>
      <h2>${escapeHtml(group)}</h2>
      <div class="cards">
        ${endpoints.map((endpoint) => `
          <article class="card">
            <div class="header">
              <span class="method ${escapeHtml(endpoint.method.toLowerCase())}">${escapeHtml(endpoint.method)}</span>
              <code>${escapeHtml(endpoint.path)}</code>
            </div>
            <p>${escapeHtml(endpoint.description)}</p>
            <small>${endpoint.auth ? 'Autenticação obrigatória' : 'Sem autenticação'}</small>
          </article>
        `).join('')}
      </div>
    </section>
  `).join('');

  return `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TimeTrack API Docs</title>
    <style>
      :root { color-scheme: dark; }
      body { font-family: Arial, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
      main { max-width: 1100px; margin: 0 auto; padding: 32px 20px 60px; }
      h1 { margin-bottom: 8px; }
      .intro { color: #94a3b8; margin-bottom: 24px; }
      section { margin-top: 28px; }
      h2 { border-bottom: 1px solid #334155; padding-bottom: 8px; }
      .cards { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
      .card { background: #111827; border: 1px solid #334155; border-radius: 10px; padding: 14px; }
      .header { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
      .method { display: inline-block; width: fit-content; padding: 4px 8px; border-radius: 999px; font-weight: bold; font-size: 0.85rem; text-transform: uppercase; }
      .method.get { background: #2563eb; color: white; }
      .method.post { background: #16a34a; color: white; }
      .method.put { background: #ca8a04; color: white; }
      .method.delete { background: #dc2626; color: white; }
      code { font-family: Consolas, monospace; color: #f8fafc; }
      p { margin: 0 0 8px; line-height: 1.5; }
      small { color: #94a3b8; }
    </style>
  </head>
  <body>
    <main>
      <h1>TimeTrack API Documentation</h1>
      <p class="intro">Esta página documenta os endpoints disponíveis na API e os respetivos requisitos de autenticação.</p>
      ${sections}
    </main>
  </body>
</html>`;
}

module.exports = { docs, renderDocsPage };