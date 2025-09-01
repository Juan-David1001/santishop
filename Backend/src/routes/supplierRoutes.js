const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

// Ruta base: /api/suppliers

// Obtener todos los proveedores (con filtros y paginación)
router.get('/', supplierController.getAllSuppliers);

// Buscar proveedores por texto
router.get('/search', supplierController.searchSuppliers);

// Obtener un proveedor específico por ID
router.get('/:id', supplierController.getSupplierById);

// Obtener la cuenta corriente de un proveedor (compras y pagos)
router.get('/:id/account', supplierController.getSupplierAccount);

// Crear un nuevo proveedor
router.post('/', supplierController.createSupplier);

// Actualizar un proveedor existente
router.put('/:id', supplierController.updateSupplier);

// Eliminar un proveedor
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
