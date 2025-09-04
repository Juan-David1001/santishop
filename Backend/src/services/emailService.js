const nodemailer = require('nodemailer');
const config = require('../config/config');
const { formatCurrency, formatDate } = require('../utils/helpers');

// Configuración del transporter de Nodemailer
const transporter = nodemailer.createTransport(config.emailConfig);

/**
 * Envía un email con el resumen del cierre de caja
 * @param {Object} closure - Datos del cierre de caja
 * @param {Array} sales - Listado de ventas del turno
 * @param {Object} shiftDetails - Detalles del turno
 * @returns {Promise} - Resultado del envío del email
 */
async function sendClosureEmail(closure, sales, shiftDetails) {
  try {
    // Calcular totales por método de pago
    let totalEfectivo = 0;
    let totalTransferencia = 0;
    
    sales.forEach(sale => {
      const amount = parseFloat(sale.amount);
      if (sale.paymentMethod === 'transferencia') {
        totalTransferencia += amount;
      } else {
        totalEfectivo += amount;
      }
    });
    
    // Obtener pagos a proveedores realizados durante este turno
    const prisma = require('../config/db');
    const supplierPayments = await prisma.supplierPayment.findMany({
      where: { shiftId: closure.shiftId }
    });
    
    // Calcular total de pagos a proveedores
    const totalSupplierPayments = supplierPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    
    // Crear tabla HTML con el listado de ventas
    let salesTable = '';
    if (sales.length > 0) {
      salesTable = `
        <h3>Listado de Ventas</h3>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th>ID</th>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Método de Pago</th>
            </tr>
          </thead>
          <tbody>
            ${sales.map(sale => `
              <tr>
                <td>${sale.id}</td>
                <td>${formatDate(sale.createdAt)}</td>
                <td style="text-align: right;">${formatCurrency(sale.amount)}</td>
                <td>${sale.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      salesTable = '<p>No se encontraron ventas para este turno.</p>';
    }
    
    // Crear tabla HTML con el listado de pagos a proveedores
    let supplierPaymentsTable = '';
    if (supplierPayments.length > 0) {
      supplierPaymentsTable = `
        <h3>Pagos a Proveedores</h3>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th>ID</th>
              <th>Proveedor</th>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            ${supplierPayments.map(payment => `
              <tr>
                <td>${payment.id}</td>
                <td>${payment.supplier}</td>
                <td>${formatDate(payment.createdAt)}</td>
                <td style="text-align: right;">${formatCurrency(payment.amount)}</td>
                <td>${payment.description || '-'}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f2f2f2; font-weight: bold;">
              <td colspan="3" style="text-align: right;">Total Pagos a Proveedores:</td>
              <td style="text-align: right;">${formatCurrency(totalSupplierPayments)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      `;
    } else {
      supplierPaymentsTable = '<p>No se encontraron pagos a proveedores para este turno.</p>';
    }
    
    // Crear resumen de cierre de caja
    const cashDifference = parseFloat(closure.cashInRegister) - totalEfectivo;
    const transferDifference = parseFloat(closure.transferAmount) - totalTransferencia;
    
    const mailOptions = {
      from: config.emailConfig.auth.user,
      to: 'david28.jdo@gmail.com',
      subject: `Resumen de Cierre de Caja #${closure.id} - ${formatDate(closure.createdAt)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h2>Resumen de Cierre de Caja #${closure.id}</h2>
          <p><strong>Fecha:</strong> ${formatDate(closure.createdAt)}</p>
          <p><strong>Turno ID:</strong> ${closure.shiftId}</p>
          <p><strong>Usuario:</strong> ${shiftDetails.user ? shiftDetails.user.name : 'No disponible'}</p>
          
          <h3>Resumen de Totales</h3>
          <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <tr style="background-color: #f2f2f2;">
              <th>Concepto</th>
              <th>Monto</th>
            </tr>
            <tr>
              <td>Total Ventas</td>
              <td style="text-align: right;">${formatCurrency(closure.expectedAmount)}</td>
            </tr>
            <tr>
              <td>Total Efectivo (Esperado)</td>
              <td style="text-align: right;">${formatCurrency(totalEfectivo)}</td>
            </tr>
            <tr>
              <td>Total Transferencias (Esperado)</td>
              <td style="text-align: right;">${formatCurrency(totalTransferencia)}</td>
            </tr>
            <tr>
              <td>Efectivo en Caja (Real)</td>
              <td style="text-align: right;">${formatCurrency(closure.cashInRegister)}</td>
            </tr>
            <tr>
              <td>Transferencias Reportadas</td>
              <td style="text-align: right;">${formatCurrency(closure.transferAmount)}</td>
            </tr>
            <tr style="background-color: #fff0f0;">
              <td>Total Pagos a Proveedores</td>
              <td style="text-align: right;">${formatCurrency(totalSupplierPayments)}</td>
            </tr>
            <tr style="background-color: #f2f2f2; font-weight: bold;">
              <td>Balance Final</td>
              <td style="text-align: right;">${formatCurrency(closure.expectedAmount - totalSupplierPayments)}</td>
            </tr>
          </table>
          
          <h3>Diferencias</h3>
          <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <tr style="background-color: #f2f2f2;">
              <th>Concepto</th>
              <th>Monto</th>
            </tr>
            <tr style="background-color: ${cashDifference >= 0 ? '#e6ffe6' : '#ffe6e6'}">
              <td>Diferencia en Efectivo</td>
              <td style="text-align: right;">${formatCurrency(cashDifference)}</td>
            </tr>
            <tr style="background-color: ${transferDifference >= 0 ? '#e6ffe6' : '#ffe6e6'}">
              <td>Diferencia en Transferencias</td>
              <td style="text-align: right;">${formatCurrency(transferDifference)}</td>
            </tr>
            <tr style="background-color: ${closure.difference >= 0 ? '#e6ffe6' : '#ffe6e6'}; font-weight: bold;">
              <td>DIFERENCIA TOTAL</td>
              <td style="text-align: right;">${formatCurrency(closure.difference)}</td>
            </tr>
          </table>
          
          ${salesTable}
          
          ${supplierPaymentsTable}
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ccc;">
            <p style="color: #666; font-size: 12px;">
              Este es un correo automático generado por el sistema de gestión de caja.
              No responda a este correo.
            </p>
          </div>
        </div>
      `
    };
    
    // Enviar el correo
    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado:', info.response);
    return info;
  } catch (error) {
    console.error('Error al enviar email:', error);
    throw error;
  }
}

// Función para enviar alertas de stock bajo
async function sendLowStockAlert(product) {
  try {
    const mailOptions = {
      from: config.emailConfig.auth.user,
      to: '165dario@gmail.com',
      subject: `ALERTA: Stock bajo de producto ${product.sku} - ${product.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e74c3c; border-radius: 5px;">
          <h2 style="color: #e74c3c;">⚠️ Alerta de Stock Bajo</h2>
          <p>El siguiente producto ha alcanzado un nivel de stock por debajo del mínimo configurado:</p>
          
          <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <tr style="background-color: #f8f8f8;">
              <th>SKU</th>
              <td>${product.sku}</td>
            </tr>
            <tr>
              <th>Nombre</th>
              <td>${product.name}</td>
            </tr>
            <tr style="background-color: #f8f8f8;">
              <th>Stock Actual</th>
              <td style="font-weight: bold; color: #e74c3c;">${product.stock}</td>
            </tr>
            <tr>
              <th>Stock Mínimo</th>
              <td>${product.minimumStock}</td>
            </tr>
            <tr style="background-color: #f8f8f8;">
              <th>Categoría</th>
              <td>${product.category.name}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px;">
            Por favor, realice un nuevo pedido de este producto para reponer el inventario.
          </p>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ccc;">
            <p style="color: #666; font-size: 12px;">
              Este es un correo automático generado por el sistema de gestión de inventario.
              No responda a este correo.
            </p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Alerta de stock bajo enviada para producto ${product.sku}:`, info.response);
    return info;
  } catch (error) {
    console.error(`Error al enviar alerta de stock bajo para producto ${product.sku}:`, error);
    throw error;
  }
}

module.exports = {
  sendClosureEmail,
  sendLowStockAlert
};
