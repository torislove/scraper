const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const EMPLOYEES_FILE = path.join(__dirname, '../../data', 'employees.json');
const getEmployees = () => fs.existsSync(EMPLOYEES_FILE) ? JSON.parse(fs.readFileSync(EMPLOYEES_FILE, 'utf-8')) : [];

const ADMIN_FILE = path.join(__dirname, '../../data', 'admin.json');
const getAdminCredentials = () => fs.existsSync(ADMIN_FILE) ? JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8')) : { username: 'admin', password: 'password123' };

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = getAdminCredentials();
  
  if (username === admin.username && password === admin.password) {
    return res.json({ success: true, user: { role: 'admin', name: 'Administrator' } });
  }

  const employees = getEmployees();
  const employee = employees.find(e => e.username === username && e.password === password);
  if (employee) {
    return res.json({ success: true, user: { role: 'employee', name: employee.name, location: employee.location, id: employee.id, avatar: employee.avatar } });
  }

  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

router.put('/admin', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  
  if (!fs.existsSync(path.dirname(ADMIN_FILE))) {
    fs.mkdirSync(path.dirname(ADMIN_FILE), { recursive: true });
  }
  fs.writeFileSync(ADMIN_FILE, JSON.stringify({ username, password }));
  res.json({ success: true, message: 'Admin credentials updated' });
});

module.exports = router;
