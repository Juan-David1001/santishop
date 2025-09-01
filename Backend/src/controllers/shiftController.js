const prisma = require('../config/db');
const { handleError } = require('../utils/helpers');
const { sendClosureEmail } = require('../services/emailService');
const { getActiveShift } = require('./saleController');

/**
 * Obtiene todos los turnos con filtros opcionales
 */
const getShifts = async (req, res) => {
  try {
    const { userId, active } = req.query;
    const where = {};
    
    if (userId) {
      where.userId = parseInt(userId);
    }
    
    if (active === 'true') {
      where.isActive = true;
    } else if (active === 'false') {
      where.isActive = false;
    }
    
    const shifts = await prisma.shift.findMany({
      where,
      include: {
        user: true,
        shiftClosure: true
      },
      orderBy: { startTime: 'desc' }
    });
    
    res.json(shifts);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene todos los turnos activos
 */
const getActiveShifts = async (req, res) => {
  try {
    const activeShifts = await prisma.shift.findMany({
      where: { isActive: true },
      include: {
        user: true,
        shiftClosure: true
      },
      orderBy: { startTime: 'desc' }
    });
    
    res.json(activeShifts);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Inicia un nuevo turno para un usuario
 */
const startShift = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Se requiere el ID de usuario' });
    }
    
    // Verificar si el usuario ya tiene un turno activo
    const activeShift = await getActiveShift(userId);
    
    if (activeShift) {
      return res.status(400).json({ 
        error: 'El usuario ya tiene un turno activo',
        activeShift 
      });
    }
    
    // Crear nuevo turno
    const newShift = await prisma.shift.create({
      data: {
        userId: parseInt(userId),
        isActive: true
      },
      include: { user: true }
    });
    
    res.status(201).json(newShift);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Finaliza un turno
 */
const endShift = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Actualizar turno como finalizado
    const endedShift = await prisma.shift.update({
      where: { id: parseInt(id) },
      data: {
        endTime: new Date(),
        isActive: false
      },
      include: { user: true }
    });
    
    res.json(endedShift);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Crea un cierre de caja para un turno
 */
const createShiftClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const { actualAmount, cashInRegister, transferAmount, notes } = req.body;
    
    // Obtener todas las ventas del turno
    const shiftSales = await prisma.sale.findMany({
      where: { shiftId: parseInt(id) }
    });
    
    // Calcular montos esperados separados por método de pago
    let totalEfectivo = 0;
    let totalTransferencia = 0;
    
    shiftSales.forEach(sale => {
      const amount = parseFloat(sale.amount);
      if (sale.paymentMethod === 'transferencia') {
        totalTransferencia += amount;
      } else {
        // Por defecto asumimos efectivo
        totalEfectivo += amount;
      }
    });
    
    // Calculamos el total esperado sumando ambos métodos
    const expectedAmount = totalEfectivo + totalTransferencia;
    
    // Calculamos las diferencias
    const cashDifference = parseFloat(cashInRegister) - totalEfectivo;
    const transferDifference = parseFloat(transferAmount) - totalTransferencia;
    const difference = cashDifference + transferDifference;
    
    // Crear cierre de caja
    const shiftClosure = await prisma.shiftClosure.create({
      data: {
        shiftId: parseInt(id),
        expectedAmount,
        actualAmount: parseFloat(cashInRegister) + parseFloat(transferAmount),
        difference,
        cashInRegister: parseFloat(cashInRegister),
        transferAmount: parseFloat(transferAmount),
        notes: notes || `Diferencia efectivo: ${cashDifference}, Diferencia transferencias: ${transferDifference}`
      },
      include: { shift: { include: { user: true } } }
    });
    
    // Obtener detalles del turno para el correo
    const shiftDetails = await prisma.shift.findUnique({
      where: { id: parseInt(id) },
      include: { user: true }
    });
    
    // Enviar correo electrónico con el resumen
    try {
      await sendClosureEmail(shiftClosure, shiftSales, shiftDetails);
    } catch (emailError) {
      console.error('Error al enviar correo de cierre:', emailError);
    }
    
    res.status(201).json(shiftClosure);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene todos los cierres de caja con filtros opcionales
 */
const getShiftClosures = async (req, res) => {
  try {
    const { userId, shiftId } = req.query;
    const where = {};
    
    if (shiftId) {
      where.shiftId = parseInt(shiftId);
    } else if (userId) {
      where.shift = { userId: parseInt(userId) };
    }
    
    const closures = await prisma.shiftClosure.findMany({
      where,
      include: {
        shift: { include: { user: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(closures);
  } catch (error) {
    handleError(error, res);
  }
};

module.exports = {
  getShifts,
  getActiveShifts,
  startShift,
  endShift,
  createShiftClosure,
  getShiftClosures
};
