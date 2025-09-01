const express = require('express');
const router = express.Router();
const supplierPaymentController = require('../controllers/supplierPaymentController');
const { asyncHandler, validateIdParams, validateFields, validateNumericParams } = require('../middleware/validationMiddleware');

// Obtener todos los pagos a proveedores
router.get('/', asyncHandler(supplierPaymentController.getSupplierPayments));

// Obtener reporte de deudas a proveedores
router.get('/debts-report', asyncHandler(supplierPaymentController.getSupplierDebtsReport));
router.get('/reports/debts', asyncHandler(supplierPaymentController.getSupplierDebtsReport));

// Obtener balance general del sistema
router.get('/general-balance', asyncHandler(supplierPaymentController.getGeneralBalance));
router.get('/reports/balance', asyncHandler(supplierPaymentController.getGeneralBalance));

// Obtener un pago por ID
router.get('/:id', 
  validateIdParams(['id']),
  asyncHandler(supplierPaymentController.getSupplierPaymentById)
);

// Crear un nuevo pago a proveedor
router.post('/',
  validateFields(['amount', 'supplierId']),
  validateNumericParams(['amount', 'supplierId']),
  asyncHandler(supplierPaymentController.createSupplierPayment)
);

// Actualizar un pago a proveedor
router.put('/:id',
  validateIdParams(['id']),
  validateFields(['amount']),
  validateNumericParams(['amount']),
  asyncHandler(supplierPaymentController.updateSupplierPayment)
);

// Eliminar un pago a proveedor
router.delete('/:id',
  validateIdParams(['id']),
  asyncHandler(supplierPaymentController.deleteSupplierPayment)
);

module.exports = router;
