const express = require('express');
const router = express.Router();
const { healthCheck } = require('../controllers/healthController');

// Ruta para comprobar el estado del API
router.get('/', healthCheck);

module.exports = router;