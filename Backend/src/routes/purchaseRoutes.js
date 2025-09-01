const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { asyncHandler, validateIdParams, validateFields, validateNumericParams } = require('../middleware/validationMiddleware');

// Ruta base: /api/purchases

// Obtener todas las compras (con filtros y paginación)
router.get('/', purchaseController.getAllPurchases);

// Obtener reporte de compras
router.get('/report', purchaseController.getPurchaseReport);

// Obtener una compra específica por ID
router.get('/:id', purchaseController.getPurchaseById);

// Crear una nueva compra
router.post('/',
  validateFields(['supplierId', 'userId', 'totalAmount', 'items']),
  validateNumericParams(['supplierId', 'userId', 'totalAmount']),
  purchaseController.createPurchase
);

// Registrar un pago a proveedor (redirige al controlador específico)
router.post('/:id/payments',
  validateIdParams(['id']),
  validateFields(['amount', 'userId']),
  validateNumericParams(['amount', 'userId']),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    // Agregar el ID de compra al body para el controlador de pagos
    req.body.purchaseId = id;
    purchaseController.registerPayment(req, res);
  })
);

module.exports = router;
