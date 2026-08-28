const express = require('express');
const { db } = require('../db');
const {authMiddleware}=require('../middleware/auth');
const router = express.Router();

// Public: used by the register page before login
router.get('/getDepartments', async(req,res)=>{
    const departments = db.prepare(`SELECT * FROM departments`).all();
    return res.status(200).json(departments);
})

router.use(authMiddleware)

// CREATE A DEPARTMENT
router.post('/createDepartment', authMiddleware, async(req,res)=>{
    const {name} = req.body
    const departmentExists = db.prepare(`SELECT * FROM departments WHERE name = ?`).get(name);
    if(departmentExists){
        return res.status(401).json(`O Departamento ${name} já está registado no sistema`);
    }
    const department = db.prepare(`INSERT INTO departments (name) VALUES (?) `).run(name);
    const client = db.prepare(`INSERT INTO clients (client_type, department_id) VALUES(?,?)`).run('department',department.lastInsertRowid)
    return res.status(200).json(department)
})

// READ ONE DEPARTMENT
router.get('/getDepartment/:department_id', authMiddleware, async(req,res)=>{
    const { department_id } = req.params;
    const department = db.prepare(`SELECT * FROM departments WHERE id = ?`).get(department_id)
    return res.status(200).json(department);
})

// DELETE A DEPARTMENT
router.delete('/deleteDepartment/:department_id', authMiddleware, async(req,res)=>{
    const {department_id} = req.params;
    resposta = db.prepare(`DELETE FROM departments WHERE id = ?`).run(department_id);
    return res.status(200).json(resposta);
})

// GET MY DEPARTMENT
router.get('/getMyDepartment',authMiddleware, async(req,res)=>{
    const dept = db.prepare(`SELECT d.id , d.name FROM users u JOIN departments d ON d.id = u.department_id WHERE u.id = ?`).get(req.user.id);
    return res.status(200).json(dept || null);
});

module.exports = router;