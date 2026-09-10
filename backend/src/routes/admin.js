const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../db");
const { authMiddleware, signToken } = require("../middleware/auth");

/**
 * Verifica se o utilizador está ativo
 * @param {} value
 * @returns
 */
function isUserActive(value) {
  return (
    value === 1 || value === true || String(value).toLowerCase() === "true"
  );
}

const USER_SELECT = `
  SELECT u.id, u.username, u.email, u.profile, u.active, u.created_at,
         u.department_id, d.name AS department_name
  FROM users u
  LEFT JOIN departments d ON d.id = u.department_id
`;

function mapUser(user) {
  return { ...user, active: isUserActive(user.active) };
}

function getMappedUser(userId) {
  const user = db.prepare(`${USER_SELECT} WHERE u.id = ?`).get(userId);
  return user ? mapUser(user) : null;
}

function parseUserId(value) {
  const userId = Number(value);
  return userId && !Number.isNaN(userId) ? userId : null;
}

function validateUserPayload(body, { requirePassword }) {
  const username = body.username?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const passwordConfirm = body.passwordConfirm;
  const profile = body.profile === "admin" ? "admin" : "user";
  const departmentId = Number(body.department_id);

  if (!username || !email) {
    return { error: "Username e email são obrigatórios" };
  }
  if (!/^[a-zA-Z0-9._]+$/.test(username)) {
    return {
      error: "O username só pode conter letras, números, ponto e underscore",
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Email inválido" };
  }
  if (!body.department_id || Number.isNaN(departmentId)) {
    return { error: "Departamento é obrigatório" };
  }
  const department = db
    .prepare("SELECT id FROM departments WHERE id = ?")
    .get(departmentId);
  if (!department) {
    return { error: "Departamento inválido" };
  }
  if (requirePassword || (password !== undefined && password !== "")) {
    if (!password || password.length < 6) {
      return { error: "Password deve ter pelo menos 6 caracteres" };
    }
    if (requirePassword && password !== passwordConfirm) {
      return { error: "As passwords não coincidem" };
    }
  }

  return { username, email, password, profile, departmentId };
}

const router = express.Router();
router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user?.profile !== "admin") {
    return res
      .status(403)
      .json({ error: "Acesso reservado a administradores" });
  }
  next();
});

/**
 * Endpoint para obter os dados da Dashboard
 */
router.get("/dashboard", (_req, res) => {
  const count = (sql) => db.prepare(sql).get().n;
  return res.status(200).json({
    total_users: count("SELECT COUNT(*) AS n FROM users"),
    total_departments: count("SELECT COUNT(*) AS n FROM departments"),
    total_teams: count("SELECT COUNT(*) AS n FROM teams"),
    total_projects: count("SELECT COUNT(*) AS n FROM projects"),
    total_tasks: count("SELECT COUNT(*) AS n FROM tasks"),
    total_clients: count("SELECT COUNT(*) AS n FROM clients"),
  });
});

/**
 * Endpoint para obter os utilizadores registados no sistema
 */
router.get("/users", (_req, res) => {
  const users = db
    .prepare(`${USER_SELECT} ORDER BY u.username COLLATE NOCASE`)
    .all()
    .map(mapUser);
  return res.status(200).json(users);
});

/**
 * Endpoint para registar um utilizador no sistema
 */
router.post("/users", (req, res) => {
  const parsed = validateUserPayload(req.body, { requirePassword: true });
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const existingEmail = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(parsed.email);
  if (existingEmail) {
    return res.status(409).json({ error: "Email já registado" });
  }
  const existingUsername = db
    .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
    .get(parsed.username);
  if (existingUsername) {
    return res.status(409).json({ error: "Username já registado" });
  }

  const hash = bcrypt.hashSync(parsed.password, 10);
  const result = db
    .prepare(
      "INSERT INTO users (email, password_hash, username, department_id, profile) VALUES (?, ?, ?, ?, ?)",
    )
    .run(
      parsed.email,
      hash,
      parsed.username,
      parsed.departmentId,
      parsed.profile,
    );
  db.prepare("INSERT INTO clients (client_type, user_id) VALUES (?, ?)").run(
    "person",
    result.lastInsertRowid,
  );

  return res.status(201).json(getMappedUser(result.lastInsertRowid));
});

/**
 * Endpoint para obter o utilizador através do ID
 */
router.get("/users/:id", (req, res) => {
  const userId = parseUserId(req.params.id);
  if (!userId) {
    return res.status(400).json({ error: "Utilizador inválido" });
  }
  const user = getMappedUser(userId);
  if (!user) {
    return res.status(404).json({ error: "Utilizador não encontrado" });
  }
  return res.status(200).json(user);
});

/**
 * Endpoint para atualizar o utilizador do id
 */
router.put("/users/:id", (req, res) => {
  const userId = parseUserId(req.params.id);
  if (!userId) {
    return res.status(400).json({ error: "Utilizador inválido" });
  }
  const existing = db
    .prepare("SELECT id, profile FROM users WHERE id = ?")
    .get(userId);
  if (!existing) {
    return res.status(404).json({ error: "Utilizador não encontrado" });
  }

  const parsed = validateUserPayload(req.body, { requirePassword: false });
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  if (userId === Number(req.user.id) && parsed.profile !== "admin") {
    return res
      .status(400)
      .json({
        error: "Não pode remover o seu próprio perfil de administrador",
      });
  }

  const emailTaken = db
    .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
    .get(parsed.email, userId);
  if (emailTaken) {
    return res.status(409).json({ error: "Email já registado" });
  }
  const usernameTaken = db
    .prepare(
      "SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?",
    )
    .get(parsed.username, userId);
  if (usernameTaken) {
    return res.status(409).json({ error: "Username já registado" });
  }

  if (parsed.password) {
    const passwordHash = bcrypt.hashSync(parsed.password, 10);
    db.prepare(
      "UPDATE users SET username = ?, email = ?, password_hash = ?, department_id = ?, profile = ? WHERE id = ?",
    ).run(
      parsed.username,
      parsed.email,
      passwordHash,
      parsed.departmentId,
      parsed.profile,
      userId,
    );
  } else {
    db.prepare(
      "UPDATE users SET username = ?, email = ?, department_id = ?, profile = ? WHERE id = ?",
    ).run(
      parsed.username,
      parsed.email,
      parsed.departmentId,
      parsed.profile,
      userId,
    );
  }

  const user = getMappedUser(userId);
  const payload = { user };
  if (userId === Number(req.user.id)) {
    payload.token = signToken(user);
  }
  return res.status(200).json(payload);
});

/**
 * Endpoint para ativar/desativar utilizador
 */
router.put("/users/:id/active", (req, res) => {
  const userId = parseUserId(req.params.id);
  const active = req.body?.active === true || req.body?.active === "true";
  if (!userId) {
    return res.status(400).json({ error: "Utilizador inválido" });
  }
  if (userId === Number(req.user.id) && !active) {
    return res
      .status(400)
      .json({ error: "Não pode desativar a sua própria conta" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!existing) {
    return res.status(404).json({ error: "Utilizador não encontrado" });
  }
  db.prepare("UPDATE users SET active = ? WHERE id = ?").run(
    active ? "True" : "False",
    userId,
  );
  return res.status(200).json(getMappedUser(userId));
});

/**
 * Endpoint para obter os departamento registados no sistema e conta o numero de utilizadores por departamento
 */
router.get("/departments", (_req, res) => {
  const departments = db
    .prepare(
      `
    SELECT d.id, d.name,
           (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) AS nr_users
    FROM departments d
    ORDER BY d.name COLLATE NOCASE
  `,
    )
    .all();
  return res.status(200).json(departments);
});

/**
 * Endpoint para obter o nome das equipas registadas e o numero de membros
 */
router.get("/teams", (_req, res) => {
  const teams = db
    .prepare(
      `
    SELECT t.id, t.name, t.created_at, u.username AS created_by_name,
           (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) AS nr_members
    FROM teams t
    LEFT JOIN users u ON u.id = t.created_by
    ORDER BY t.name COLLATE NOCASE
  `,
    )
    .all();
  return res.status(200).json(teams);
});

/**
 * Endpoint para obter os projetos
 */
router.get("/projects", (_req, res) => {
  const projects = db
    .prepare(
      `
    SELECT p.id, p.name, t.name AS team_name, p.created_at
    FROM projects p
    JOIN teams t ON t.id = p.team_id
    ORDER BY p.name COLLATE NOCASE
  `,
    )
    .all();
  return res.status(200).json(projects);
});

module.exports = router;
