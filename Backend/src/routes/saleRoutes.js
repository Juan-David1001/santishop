const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { asyncHandler, validateIdParams, validateFields, validateNumericParams } = require('../middleware/validationMiddleware');

// Búsqueda de productos para el punto de venta
router.get('/search-products', asyncHandler(saleController.searchProducts));

// Obtener todas las ventas con filtros opcionales
router.get('/', asyncHandler(saleController.getSales));

// Obtener una venta por ID
router.get('/:id', 
  validateIdParams(['id']),
  asyncHandler(saleController.getSaleById)
);

// Crear una nueva venta
router.post('/',
  validateFields(['items']),
  asyncHandler(saleController.createSale)
);

// Eliminar una venta
router.delete('/:id',
  validateIdParams(['id']),
  asyncHandler(saleController.deleteSale)
);

// Cancelar una venta
router.post('/:id/cancel',
  validateIdParams(['id']),
  asyncHandler(saleController.cancelSale || saleController.deleteSale)
);

module.exports = router;
