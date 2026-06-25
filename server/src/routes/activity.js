const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const ACTIVITY_DB_PATH = path.join(__dirname, '../../db/activity_logs.json');

// Initialize if not exists
if (!fs.existsSync(ACTIVITY_DB_PATH)) {
  fs.writeFileSync(ACTIVITY_DB_PATH, JSON.stringify([], null, 2));
}

// Read activity logs
const readActivityLogs = () => {
  try {
    const data = fs.readFileSync(ACTIVITY_DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

// Write activity logs
const writeActivityLogs = (logs) => {
  try {
    fs.writeFileSync(ACTIVITY_DB_PATH, JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('Failed to write activity logs:', err);
  }
};

// Exported utility to log an activity internally
const logSearchActivity = (activityObj) => {
  const logs = readActivityLogs();
  logs.unshift({
    id: 'act_' + Date.now(),
    timestamp: new Date().toISOString(),
    ...activityObj
  });
  // Keep only the last 1000 logs to prevent file bloat
  if (logs.length > 1000) {
    logs.length = 1000;
  }
  writeActivityLogs(logs);
};

// API Route: Get Activity Logs (Admin Only)
router.get('/', (req, res) => {
  const logs = readActivityLogs();
  res.json(logs);
});

module.exports = {
  router,
  logSearchActivity
};
