const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TimeTrack API',
      version: '1.0.0',
      description: 'Documentação automática da API do TimeTrack.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Autenticação e dados do utilizador' },
      { name: 'Teams', description: 'Gestão de equipas' },
      { name: 'Projects', description: 'Gestão de projetos' },
      { name: 'Task Lists', description: 'Gestão de listas de tarefas' },
      { name: 'Tasks', description: 'Gestão de tarefas e comentários' },
      { name: 'Time Entries', description: 'Gestão de tempo e relatórios' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };