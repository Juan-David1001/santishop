/**
 * Formatea un número como moneda
 * @param {number} amount - El monto a formatear
 * @param {string} [locale='es-MX'] - El locale para el formato
 * @param {string} [currency='MXN'] - La moneda para el formato
 * @returns {string} - El monto formateado como moneda
 */
export const formatCurrency = (amount, locale = 'es-MX', currency = 'MXN') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Formatea un número con un número específico de decimales
 * @param {number} value - El valor a formatear
 * @param {number} [decimals=2] - El número de decimales
 * @returns {string} - El valor formateado
 */
export const formatNumber = (value, decimals = 2) => {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Formatea una fecha en formato local
 * @param {Date|string} date - La fecha a formatear
 * @param {Object} options - Opciones para el formato
 * @returns {string} - La fecha formateada
 */
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  };
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return date.toLocaleDateString('es-MX', defaultOptions);
};

/**
 * Formatea una fecha y hora en formato local
 * @param {Date|string} dateTime - La fecha y hora a formatear
 * @param {Object} options - Opciones para el formato
 * @returns {string} - La fecha y hora formateada
 */
export const formatDateTime = (dateTime, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options
  };
  
  if (typeof dateTime === 'string') {
    dateTime = new Date(dateTime);
  }
  
  return dateTime.toLocaleString('es-MX', defaultOptions);
};
