const express = require('express');
const router = express.Router();
const dbAdapter = require('../config/dbAdapter');

router.get('/export', (req, res) => {
  const secret = req.query.secret;
  if (secret !== (process.env.SYNC_SECRET || 'sync123')) {
    return res.status(403).json({ error: 'Unauthorized sync access.' });
  }

  // Export vendors
  const vendors = dbAdapter.getVendors();

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    vendors
  });
});

module.exports = router;
