const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/teams');
const projectRoutes = require('./routes/projects');
const taskListRoutes = require('./routes/taskLists');
const taskRoutes = require('./routes/tasks');
const timeEntryRoutes = require('./routes/timeEntries');
const importRoutes = require('./routes/import');
const { swaggerSpec } = require('./swagger');
const dotenv = require('dotenv');
dotenv.config();

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

initDb();

const app = express();
const PORT = process.env.PORT;
const URI = process.env.URI;

app.use(cors({ origin: 'http://localhost:4200', credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/docs.json', (_req, res) => {
  res.setHeader('content-type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/task-lists', taskListRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/time', timeEntryRoutes);
app.use('/api', importRoutes)

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const server = app.listen(PORT, () => {
  console.log(`TimeTrack API a correr em ${URI}:${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    const fallbackPort = Number(PORT) + 1;
    console.warn(`Porta ${PORT} ocupada. A tentar ${fallbackPort}...`);
    app.listen(fallbackPort, () => {
      console.log(`TimeTrack API a correr em ${URI}:${fallbackPort}`);
    });
  } else {
    console.error(error);
    process.exit(1);
  }
});
