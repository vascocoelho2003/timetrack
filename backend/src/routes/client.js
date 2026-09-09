const express = require("express");
const { db } = require("../db");
const { authMiddleware } = require("../middleware/auth");
const router = express.Router();

router.use(authMiddleware);

/**
 * Obtém todos os Clientes Departamento
 */
router.get("/getDepartmentClients", authMiddleware, async (req, res) => {
  const clients = db
    .prepare(`SELECT * FROM clients WHERE client_type='department'`)
    .all();
  return res.status(200).json(clients);
});

/**
 * Obtém todos os clientes Individuais
 */
router.get("/getIndividualClients", authMiddleware, async (req, res) => {
  const clients = db
    .prepare(`SELECT * FROM clients WHERE client_type='person'`)
    .all();
  return res.status(200).json(clients);
});

/**
 * Obtém todos os Clientes
 */
router.get("/getAllClients", authMiddleware, (req, res) => {
  const clients = db
    .prepare(
      `
        SELECT c.id, c.client_type, c.user_id, c.department_id,
               COALESCE(u.username, d.name) AS name
        FROM clients c
        LEFT JOIN users u ON c.client_type = 'person' AND u.id = c.user_id
        LEFT JOIN departments d ON c.client_type = 'department' AND d.id = c.department_id
    `,
    )
    .all();
  return res.status(200).json(clients);
});

/**
 * Criar Clientes
 */
router.post("/createClient", authMiddleware, async (req, res) => {
  const { client_type, user_id, department_id } = req.body;

  // 1. Sanitização: Garante que apenas o ID relevante é preenchido e força null no outro
  const finalUserId = client_type === "person" ? user_id || null : null;
  const finalDeptId =
    client_type === "department" ? department_id || null : null;

  // 2. Validação do tipo de cliente
  if (!["person", "department"].includes(client_type)) {
    return res.status(400).json({ error: "Tipo de cliente inválido." });
  }

  // 3. Validação de existência da Foreign Key
  if (client_type === "person") {
    if (!finalUserId)
      return res
        .status(400)
        .json({ error: "user_id é obrigatório para o tipo person." });
    const userExists = db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(finalUserId);
    if (!userExists)
      return res
        .status(404)
        .json({ error: `Utilizador com ID ${finalUserId} não existe.` });
  }

  if (client_type === "department") {
    if (!finalDeptId)
      return res
        .status(400)
        .json({ error: "department_id é obrigatório para o tipo department." });
    const deptExists = db
      .prepare("SELECT id FROM departments WHERE id = ?")
      .get(finalDeptId);
    if (!deptExists)
      return res
        .status(404)
        .json({ error: `Departamento com ID ${finalDeptId} não existe.` });
  }

  // 4. Inserção segura
  try {
    const insertClient = db.prepare(`
            INSERT INTO clients (client_type, user_id, department_id) 
            VALUES (?, ?, ?)
        `);

    const result = insertClient.run(client_type, finalUserId, finalDeptId);

    return res.status(201).json({
      id: result.lastInsertRowid,
      client_type,
      user_id: finalUserId,
      department_id: finalDeptId,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
