const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { asyncHandler } = require('../middleware/validationMiddleware');

// Ventas por día/semana/mes
router.get('/sales', asyncHandler(reportController.getSalesReport));

// Productos más vendidos
router.get('/top-products', asyncHandler(reportController.getTopProducts));

// Alertas de stock bajo
router.get('/low-stock', asyncHandler(reportController.getLowStockAlerts));

// Estado de cuentas por pagar
router.get('/payment-status', asyncHandler(reportController.getPaymentStatus));

// Balance general
router.get('/general-balance', asyncHandler(reportController.getGeneralBalance));

module.exports = router;
