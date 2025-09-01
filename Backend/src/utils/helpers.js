/**
 * Formatea cantidades de dinero en formato colombiano
 * @param {number} amount - Cantidad a formatear
 * @returns {string} - Cantidad formateada como moneda colombiana
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Formatea fechas en formato colombiano
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(date));
}

/**
 * Maneja errores en controladores de forma estandarizada
 * @param {Error} error - Error a manejar
 * @param {Object} res - Objeto de respuesta de Express
 */
function handleError(error, res) {
  console.error(`Error: ${error.message}`, error);
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({ 
    error: error.message || 'Error interno del servidor' 
  });
}

module.exports = {
  formatCurrency,
  formatDate,
  handleError
};
