const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { asyncHandler, validateFields, validateIdParams } = require('../middleware/validationMiddleware');

// Obtener todas las categorías
router.get('/', asyncHandler(categoryController.getCategories));

// Obtener una categoría por ID
router.get('/:id', 
  validateIdParams(['id']),
  asyncHandler(categoryController.getCategoryById)
);

// Crear una nueva categoría
router.post('/',
  validateFields(['name']),
  asyncHandler(categoryController.createCategory)
);

// Actualizar una categoría
router.put('/:id',
  validateIdParams(['id']),
  validateFields(['name']),
  asyncHandler(categoryController.updateCategory)
);

// Eliminar una categoría
router.delete('/:id',
  validateIdParams(['id']),
  asyncHandler(categoryController.deleteCategory)
);

module.exports = router;
