const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const EMPLOYEES_FILE = path.join(__dirname, '../../data', 'employees.json');

const getEmployees = () => {
  if (!fs.existsSync(EMPLOYEES_FILE)) return [];
  return JSON.parse(fs.readFileSync(EMPLOYEES_FILE, 'utf-8'));
};

const writeEmployees = (data) => {
  if (!fs.existsSync(path.dirname(EMPLOYEES_FILE))) {
    fs.mkdirSync(path.dirname(EMPLOYEES_FILE), { recursive: true });
  }
  fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(data, null, 2));
};

// API: Get all employees
router.get('/', (req, res) => {
  const employees = getEmployees().filter(e => e.role === 'employee');
  res.json(employees);
});

// API: Create an Employee
router.post('/', (req, res) => {
  const employees = getEmployees();
  const newEmp = { ...req.body, id: 'emp_' + Date.now(), role: 'employee' };
  employees.push(newEmp);
  writeEmployees(employees);
  res.json({ success: true, employee: newEmp });
});

// API: Update an Employee
router.put('/:id', (req, res) => {
  const employees = getEmployees();
  const index = employees.findIndex(e => e.id === req.params.id);
  if (index > -1) {
    employees[index] = { ...employees[index], ...req.body };
    writeEmployees(employees);
    res.json({ success: true, employee: employees[index] });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// API: Delete an Employee
router.delete('/:id', (req, res) => {
  let employees = getEmployees();
  employees = employees.filter(e => e.id !== req.params.id);
  writeEmployees(employees);
  res.json({ success: true });
});

module.exports = router;
