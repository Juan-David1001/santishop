const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { asyncHandler, validateIdParams, validateFields, validateNumericParams } = require('../middleware/validationMiddleware');

// Obtener todos los turnos
router.get('/', asyncHandler(shiftController.getShifts));

// Obtener turnos activos
router.get('/active', asyncHandler(shiftController.getActiveShifts));

// Iniciar un nuevo turno
router.post('/start',
  validateFields(['userId']),
  validateIdParams(['userId']),
  asyncHandler(shiftController.startShift)
);

// Finalizar un turno
router.post('/:id/end',
  validateIdParams(['id']),
  asyncHandler(shiftController.endShift)
);

// Crear cierre de caja para un turno
router.post('/:id/closure',
  validateIdParams(['id']),
  validateFields(['cashInRegister', 'transferAmount']),
  validateNumericParams(['cashInRegister', 'transferAmount']),
  asyncHandler(shiftController.createShiftClosure)
);

// Obtener cierres de caja
router.get('/closures', asyncHandler(shiftController.getShiftClosures));

// Obtener totales de ventas para un turno específico
router.get('/:id/totals', 
  validateIdParams(['id']),
  asyncHandler(shiftController.getShiftTotals)
);

module.exports = router;
