/**
 * Middleware para capturar errores en rutas asincrónicas
 * @param {Function} fn - Función de controlador asincrónica
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Middleware para validar que el cuerpo de la petición contenga los campos requeridos
 * @param {Array} requiredFields - Array con los nombres de los campos requeridos
 */
const validateFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => {
      return !req.body[field] && req.body[field] !== 0 && req.body[field] !== false;
    });

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Faltan campos requeridos: ${missingFields.join(', ')}` 
      });
    }

    next();
  };
};

/**
 * Middleware para validar que los parámetros numéricos sean valores válidos
 * @param {Array} numericParams - Array con los nombres de los parámetros numéricos
 */
const validateNumericParams = (numericParams) => {
  return (req, res, next) => {
    const invalidParams = numericParams.filter(param => {
      const value = req.body[param];
      return value !== undefined && (isNaN(Number(value)) || Number(value) < 0);
    });

    if (invalidParams.length > 0) {
      return res.status(400).json({ 
        error: `Los siguientes campos deben ser valores numéricos válidos: ${invalidParams.join(', ')}` 
      });
    }

    next();
  };
};

/**
 * Middleware para validar que los parámetros de tipo ID sean valores numéricos válidos
 * @param {Array} idParams - Array con los nombres de los parámetros ID
 */
const validateIdParams = (idParams) => {
  return (req, res, next) => {
    const invalidIds = idParams.filter(param => {
      const id = req.params[param] || req.body[param];
      return id !== undefined && (isNaN(parseInt(id)) || parseInt(id) <= 0);
    });

    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        error: `Los siguientes IDs deben ser números enteros positivos: ${invalidIds.join(', ')}` 
      });
    }

    next();
  };
};

// Middleware para manejar errores globales
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Si es un error de Prisma, formatear el mensaje
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: `Ya existe un registro con el mismo valor en el campo único: ${err.meta?.target || 'desconocido'}`
      });
    } else if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'El registro solicitado no existe'
      });
    }
  }
  
  // Error por defecto
  res.status(err.statusCode || 500).json({
    error: err.message || 'Error interno del servidor'
  });
};

module.exports = {
  asyncHandler,
  validateFields,
  validateNumericParams,
  validateIdParams,
  errorHandler
};
