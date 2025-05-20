const express = require('express');
const router = express.Router();
const broadcastService = require('../websocket/broadcastService');

// HTTP polling endpoint for environments where WebSockets are blocked
router.get('/', (req, res) => {
  const lastTimestamp = parseInt(req.query.since || '0');
  res.json(broadcastService.getUpdatesSince(lastTimestamp));
});

module.exports = router; 