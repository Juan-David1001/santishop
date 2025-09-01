const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

/**
 * @route   GET /api/reports/sales
 * @desc    Obtiene reporte de ventas por periodo (día, semana, mes)
 * @access  Private
 */
router.get('/sales', reportController.getSalesReport);

/**
 * @route   GET /api/reports/top-products
 * @desc    Obtiene los productos más vendidos
 * @access  Private
 */
router.get('/top-products', reportController.getTopProducts);

/**
 * @route   GET /api/reports/low-stock
 * @desc    Obtiene alertas de productos con stock bajo
 * @access  Private
 */
router.get('/low-stock', reportController.getLowStockAlerts);

/**
 * @route   GET /api/reports/payment-status
 * @desc    Obtiene estado de pagos a proveedores
 * @access  Private
 */
router.get('/payment-status', reportController.getPaymentStatus);

/**
 * @route   GET /api/reports/general-balance
 * @desc    Obtiene balance general del negocio
 * @access  Private
 */
router.get('/general-balance', reportController.getGeneralBalance);

module.exports = router;
