const express = require("express");
const { db } = require("../db");
const { authMiddleware } = require("../middleware/auth");
const router = express.Router();

/**
 * @openapi
 * /api/department/getDepartments:
 *   get:
 *     tags: [Department]
 *     summary: Obter todos os departamentos registados no sistema
 *     description: Obter todos os departamentos registados no sistema.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Departamentos retornados com sucesso
 *       401:
 *         description: Token inválido ou ausente
 *       500:
 *         description: Erro ao obter departamentos
 */
router.get("/getDepartments", async (req, res) => {
  const departments = db.prepare(`SELECT * FROM departments`).all();
  return res.status(200).json(departments);
});

router.use(authMiddleware);

/**
 * @openapi
 * /api/department/createDepartment:
 *   post:
 *     tags: [Department]
 *     summary: Criar um novo departamento no sistema
 *     description: Criar um novo departamento no sistema.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Departamento criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Departamento já registado
 *       500:
 *         description: Erro ao criar departamento
 */
router.post("/createDepartment", authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (typeof name !== "string") {
    return res.status(400).json({
      error: "O campo name deve ser uma string"
    });
  }
  const departmentExists = db
    .prepare(`SELECT * FROM departments WHERE name = ?`)
    .get(name);
  if (departmentExists) {
    return res
      .status(401)
      .json(`O Departamento ${name} já está registado no sistema`);
  }
  const department = db
    .prepare(`INSERT INTO departments (name) VALUES (?) `)
    .run(name);
  const client = db
    .prepare(`INSERT INTO clients (client_type, department_id) VALUES(?,?)`)
    .run("department", department.lastInsertRowid);
  return res.status(200).json(department);
});

/**
 * @openapi
 * /api/department/getDepartment/:department_id:
 *   get:
 *     tags: [Department]
 *     summary: Obter um departamento registado no sistema através do id
 *     description: Obter um departamento registado no sistema através do id.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Departamento retornado com sucesso
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Departamento não encontrado
 *       500:
 *         description: Erro ao obter departamento
 */
router.get(
  "/getDepartment/:department_id",
  authMiddleware,
  async (req, res) => {
    const { department_id } = req.params;
    const department = db
      .prepare(`SELECT id, name FROM departments WHERE id = ?`)
      .get(department_id);
    if (!department) {
      return res.status(404).json({ error: "Departamento não encontrado" });
    }
    return res.status(200).json(department);
  },
);

/**
 * @openapi
 * /api/department/deleteDepartment/:department_id:
 *   delete:
 *     tags: [Department]
 *     summary: Eliminar um departamento registado no sistema através do id
 *     description: Eliminar um departamento registado no sistema através do id.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Departamento eliminado com sucesso
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Departamento não encontrado
 *       500:
 *         description: Erro ao eliminar departamento
 */
router.delete(
  "/deleteDepartment/:department_id",
  authMiddleware,
  async (req, res) => {
    const { department_id } = req.params;
    resposta = db
      .prepare(`DELETE FROM departments WHERE id = ?`)
      .run(department_id);
    return res.status(200).json(resposta);
  },
);

/**
 * @openapi
 * /api/department/getMyDepartment:
 *   get:
 *     tags: [Department]
 *     summary: Obter o departamento do utilizador logado
 *     description: Obter o departamento do utilizador logado.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Departamento retornado com sucesso
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Departamento não encontrado
 *       500:
 *         description: Erro ao obter departamento
 */
router.get("/getMyDepartment", authMiddleware, async (req, res) => {
  const dept = db
    .prepare(
      `SELECT d.id , d.name FROM users u JOIN departments d ON d.id = u.department_id WHERE u.id = ?`,
    )
    .get(req.user.id);
  return res.status(200).json(dept || null);
});

/**
 * @openapi
 * /api/departments/getDepartmentMembers/:department_id:
 *   get:
 *     tags: [Department]
 *     summary: Obter os utilizadores de um departamento
 *     description: Obter os utilizadores de um departamento.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Utilizadores retornados com sucesso
 *       401:
 *         description: Token inválido ou ausente
 *       404:
 *         description: Departamento não encontrado
 *       500:
 *         description: Erro ao obter utilizadores do departamento
 */
router.get("/getDepartmentMembers/:department_id", authMiddleware, async (req, res) => {
  const { department_id } = req.params;
  const department = db
    .prepare(`SELECT id FROM departments WHERE id = ?`)
    .get(department_id);
  if (!department) {
    return res.status(404).json({ error: "Departamento não encontrado" });
  }
  const members = db
    .prepare(
      `SELECT id, username, email, profile, active
       FROM users
       WHERE department_id = ?
       ORDER BY username COLLATE NOCASE`,
    )
    .all(department_id)
    .map((user) => ({
      ...user,
      active:
        user.active === 1 ||
        user.active === true ||
        String(user.active).toLowerCase() === "true",
    }));
  return res.status(200).json(members);
});

module.exports = router;
