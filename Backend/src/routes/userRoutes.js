const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { asyncHandler, validateFields, validateIdParams } = require('../middleware/validationMiddleware');

// Obtener todos los usuarios
router.get('/', asyncHandler(userController.getUsers));

// Obtener un usuario por ID
router.get('/:id', 
  validateIdParams(['id']),
  asyncHandler(userController.getUserById)
);

// Crear un nuevo usuario
router.post('/',
  validateFields(['name', 'username']),
  asyncHandler(userController.createUser)
);

// Actualizar un usuario
router.put('/:id',
  validateIdParams(['id']),
  validateFields(['name', 'username']),
  asyncHandler(userController.updateUser)
);

// Eliminar un usuario
router.delete('/:id',
  validateIdParams(['id']),
  asyncHandler(userController.deleteUser)
);

module.exports = router;
