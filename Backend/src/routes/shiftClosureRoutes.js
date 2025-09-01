const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { asyncHandler, validateIdParams } = require('../middleware/validationMiddleware');

// Obtener todos los cierres de caja
router.get('/', asyncHandler(shiftController.getShiftClosures));

module.exports = router;