const swaggerJsdoc = require("swagger-jsdoc");
const URI = process.env.URI;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "JC Ribeiro - Task Management API",
      version: "2.0.0",
      description: "Documentação automática da API do Task Management da JC Ribeiro.",
    },
    servers: [
      {
        url: URI,
        description: "Servidor local",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    tags: [
      { name: "Auth", description: "Autenticação e dados do utilizador" },
      { name: "Admin", description: "Administrador do Sistema" },
      { name: "Client", description: "Gestão de Clientes" },
      { name: "Dashboard", description: "Dados da Dashboard" },
      { name: "Department", description: "Gestão de Departamentos" },
      { name: "Report", description: "Dados dos relatórios" },
      { name: "Teams", description: "Gestão de equipas" },
      { name: "Projects", description: "Gestão de projetos" },
      { name: "Task Lists", description: "Gestão de listas de tarefas" },
      { name: "Tasks", description: "Gestão de tarefas e comentários" },
      { name: "Time Entries", description: "Gestão de tempo e relatórios" },
    ],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };
