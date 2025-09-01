const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { 
  asyncHandler, 
  validateFields, 
  validateIdParams 
} = require('../middleware/validationMiddleware');

// Buscar clientes (para punto de venta)
router.get('/search', asyncHandler(clientController.searchClients));

// Obtener todos los clientes con filtros opcionales
router.get('/', asyncHandler(clientController.getClients));

// Obtener un cliente por ID
router.get('/:id', 
  validateIdParams(['id']),
  asyncHandler(clientController.getClientById)
);

// Crear un nuevo cliente
router.post('/',
  validateFields(['name']),
  asyncHandler(clientController.createClient)
);

// Actualizar un cliente
router.put('/:id',
  validateIdParams(['id']),
  validateFields(['name']),
  asyncHandler(clientController.updateClient)
);

// Eliminar un cliente
router.delete('/:id',
  validateIdParams(['id']),
  asyncHandler(clientController.deleteClient)
);

// Obtener historial de ventas de un cliente
router.get('/:id/sales',
  validateIdParams(['id']),
  asyncHandler(clientController.getClientSalesHistory)
);

// Actualizar puntos de un cliente manualmente
router.post('/:id/points',
  validateIdParams(['id']),
  validateFields(['points']),
  asyncHandler(clientController.updateClientPoints)
);

module.exports = router;
