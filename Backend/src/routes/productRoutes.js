const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { 
  asyncHandler, 
  validateFields, 
  validateNumericParams, 
  validateIdParams 
} = require('../middleware/validationMiddleware');

// Obtener todos los productos con filtros opcionales
router.get('/', asyncHandler(productController.getProducts));

// Obtener un producto por ID
router.get('/:id', 
  validateIdParams(['id']),
  asyncHandler(productController.getProductById)
);

// Crear un nuevo producto
router.post('/',
  validateFields(['sku', 'name', 'costPrice', 'sellingPrice', 'categoryId']),
  validateNumericParams(['costPrice', 'sellingPrice', 'stock', 'minimumStock', 'categoryId']),
  asyncHandler(productController.createProduct)
);

// Actualizar un producto
router.put('/:id',
  validateIdParams(['id']),
  validateNumericParams(['costPrice', 'sellingPrice', 'minimumStock', 'categoryId']),
  asyncHandler(productController.updateProduct)
);

// Eliminar un producto
router.delete('/:id',
  validateIdParams(['id']),
  asyncHandler(productController.deleteProduct)
);

// Registrar movimiento de stock
router.post('/:id/stock-movements',
  validateIdParams(['id']),
  validateFields(['quantity', 'type']),
  validateNumericParams(['quantity']),
  asyncHandler(productController.addStockMovement)
);

// Obtener historial de movimientos de stock
router.get('/:id/stock-movements',
  validateIdParams(['id']),
  asyncHandler(productController.getStockMovements)
);

// Obtener reporte de valorización de inventario
router.get('/reports/valuation', asyncHandler(productController.getInventoryValuation));

// Obtener productos con stock bajo
router.get('/reports/low-stock', asyncHandler(productController.getLowStockProducts));

module.exports = router;
