const prisma = require('../config/db');
const { handleError } = require('../utils/helpers');
const { getActiveShift } = require('./saleController');

/**
 * Obtiene todos los pagos a proveedores con filtros opcionales
 */
const getSupplierPayments = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      minAmount, 
      maxAmount,
      supplierId,
      purchaseId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '10',
      fullLoad = 'false'
    } = req.query;

    // Verificar si se está filtrando por fechas para cargar todos los datos
    const isFilteringByDate = startDate || endDate;
    const shouldUseFullLoad = isFilteringByDate || fullLoad === 'true';
    
    // Convertir parámetros de paginación a números
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = shouldUseFullLoad ? 0 : (pageNum - 1) * limitNum;
    
    // Construir condiciones de filtro
    const where = {};
    
    // Filtros de fecha - Ajustando para la zona horaria de Colombia (UTC-5)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(5, 0, 0, 0); // 5 horas después de UTC medianoche = 00:00 Colombia
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(29, 59, 59, 999); // 29 = 24 + 5, final del día ajustado a Colombia
        where.createdAt.lte = end;
      }
    }
    
    // Filtros de monto
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) {
        where.amount.gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        where.amount.lte = parseFloat(maxAmount);
      }
    }
    
    // Filtro de proveedor por ID
    if (supplierId) {
      where.supplierId = parseInt(supplierId);
    }
    
    // Filtro de compra por ID
    if (purchaseId) {
      where.purchaseId = parseInt(purchaseId);
    }

    // Contar el número total de registros para la paginación
    const totalCount = await prisma.supplierPayment.count({ where });

    // Consultar pagos con paginación
    const payments = await prisma.supplierPayment.findMany({
      where,
      include: {
        user: true,
        shift: true,
        supplier: true,
        purchase: true
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      ...(shouldUseFullLoad ? {} : { skip, take: limitNum })
    });

    // Calcular suma total de todos los pagos filtrados
    const totalAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    
    // Calcular información de paginación
    const totalPages = shouldUseFullLoad ? 1 : Math.ceil(totalCount / limitNum);
    
    res.json({
      payments,
      totals: {
        total: totalAmount
      },
      pagination: {
        page: shouldUseFullLoad ? 1 : pageNum,
        limit: shouldUseFullLoad ? totalCount : limitNum,
        totalItems: totalCount,
        totalPages,
        isFullLoad: shouldUseFullLoad
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Crea un nuevo pago a proveedor
 */
const createSupplierPayment = async (req, res) => {
  try {
    const { amount, supplierId, description, userId, shiftId: requestShiftId, purchaseId } = req.body;
    
    if (!amount || !supplierId) {
      return res.status(400).json({ 
        error: 'Se requiere el monto y el ID del proveedor' 
      });
    }
    
    // Primero intentamos usar el shiftId proporcionado directamente
    let shiftId = requestShiftId ? parseInt(requestShiftId) : null;
    
    // Si no tenemos un shiftId pero tenemos un userId, buscamos el turno activo
    if (!shiftId && userId) {
      const activeShift = await getActiveShift(userId);
      if (activeShift) {
        shiftId = activeShift.id;
      } else {
        return res.status(400).json({ 
          error: 'El usuario no tiene un turno activo. Debe iniciar un turno antes de registrar pagos.' 
        });
      }
    }
    
    // Si recibimos un shiftId, intentamos obtener el userId asociado al turno
    let userIdToSave = userId ? parseInt(userId) : null;
    if (shiftId && !userIdToSave) {
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        select: { userId: true }
      });
      if (shift && shift.userId) {
        userIdToSave = shift.userId;
      }
    }
    
    // Verificar que el proveedor existe
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(supplierId) }
    });
    
    if (!supplier) {
      return res.status(404).json({ 
        error: 'Proveedor no encontrado' 
      });
    }
    
    // Iniciar transacción para asegurar la consistencia de los datos
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Crear el pago
      const payment = await prisma.supplierPayment.create({
        data: {
          amount: parseFloat(amount),
          supplierId: parseInt(supplierId),
          description,
          userId: userIdToSave,
          shiftId,
          purchaseId: purchaseId ? parseInt(purchaseId) : null
        },
        include: {
          user: true,
          shift: true,
          supplier: true,
          purchase: true
        }
      });
      
      // 2. Actualizar el saldo del proveedor
      await prisma.supplier.update({
        where: { id: parseInt(supplierId) },
        data: {
          balance: {
            decrement: parseFloat(amount)
          }
        }
      });
      
      // 3. Si hay una compra asociada, actualizar su estado
      if (purchaseId) {
        const purchaseIdInt = parseInt(purchaseId);
        const purchase = await prisma.purchase.findUnique({
          where: { id: purchaseIdInt }
        });
        
        if (purchase) {
          // Actualizar el monto pagado
          const newPaidAmount = parseFloat(purchase.paidAmount) + parseFloat(amount);
          
          // Determinar el estado basado en el monto pagado
          let newStatus;
          if (newPaidAmount >= purchase.totalAmount) {
            newStatus = 'paid';
          } else if (newPaidAmount > 0) {
            newStatus = 'partially_paid';
          } else {
            newStatus = 'pending';
          }
          
          // Actualizar la compra
          await prisma.purchase.update({
            where: { id: purchaseIdInt },
            data: {
              paidAmount: newPaidAmount,
              status: newStatus
            }
          });
        }
      }
      
      return payment;
    });
    
    res.status(201).json(result);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene un pago a proveedor por su ID
 */
const getSupplierPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await prisma.supplierPayment.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        shift: true,
        supplier: true,
        purchase: true
      }
    });
    
    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    
    res.json(payment);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Actualiza un pago a proveedor
 */
const updateSupplierPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, shiftId } = req.body;
    
    // Obtener el pago actual para comparar los montos
    const currentPayment = await prisma.supplierPayment.findUnique({
      where: { id: parseInt(id) },
      include: { supplier: true, purchase: true }
    });
    
    if (!currentPayment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    
    const amountDifference = parseFloat(amount) - currentPayment.amount;
    
    // Construir objeto de datos para actualizar
    const updateData = {
      amount: parseFloat(amount),
      description
    };
    
    // Si se proporciona shiftId, agregarlo a los datos a actualizar
    if (shiftId) {
      updateData.shiftId = parseInt(shiftId);
      
      // Si hay un turno, intentamos obtener el userId asociado
      const shift = await prisma.shift.findUnique({
        where: { id: parseInt(shiftId) },
        select: { userId: true }
      });
      
      if (shift && shift.userId) {
        updateData.userId = shift.userId;
      }
    }
    
    // Iniciar transacción para asegurar la consistencia de los datos
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Actualizar el pago
      const updatedPayment = await prisma.supplierPayment.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          user: true,
          shift: true,
          supplier: true,
          purchase: true
        }
      });
      
      // 2. Actualizar el saldo del proveedor si el monto cambió
      if (amountDifference !== 0) {
        await prisma.supplier.update({
          where: { id: currentPayment.supplierId },
          data: {
            balance: {
              // Si el nuevo monto es mayor, decrementar más el saldo
              // Si el nuevo monto es menor, incrementar el saldo (menos decremento)
              decrement: amountDifference
            }
          }
        });
      }
      
      // 3. Si hay una compra asociada, actualizar su estado
      if (currentPayment.purchaseId && amountDifference !== 0) {
        const purchase = await prisma.purchase.findUnique({
          where: { id: currentPayment.purchaseId }
        });
        
        if (purchase) {
          // Actualizar el monto pagado
          const newPaidAmount = purchase.paidAmount + amountDifference;
          
          // Determinar el estado basado en el monto pagado
          let newStatus;
          if (newPaidAmount >= purchase.totalAmount) {
            newStatus = 'paid';
          } else if (newPaidAmount > 0) {
            newStatus = 'partially_paid';
          } else {
            newStatus = 'pending';
          }
          
          // Actualizar la compra
          await prisma.purchase.update({
            where: { id: currentPayment.purchaseId },
            data: {
              paidAmount: newPaidAmount,
              status: newStatus
            }
          });
        }
      }
      
      return updatedPayment;
    });
    
    res.json(result);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Elimina un pago a proveedor
 */
const deleteSupplierPayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener el pago antes de eliminarlo para actualizar relaciones
    const payment = await prisma.supplierPayment.findUnique({
      where: { id: parseInt(id) },
      include: { purchase: true }
    });
    
    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    
    // Iniciar transacción para asegurar la consistencia de los datos
    await prisma.$transaction(async (prisma) => {
      // 1. Actualizar el saldo del proveedor (devolver el monto al saldo)
      await prisma.supplier.update({
        where: { id: payment.supplierId },
        data: {
          balance: {
            increment: payment.amount
          }
        }
      });
      
      // 2. Si hay una compra asociada, actualizar su estado
      if (payment.purchaseId) {
        const purchase = await prisma.purchase.findUnique({
          where: { id: payment.purchaseId }
        });
        
        if (purchase) {
          // Actualizar el monto pagado
          const newPaidAmount = purchase.paidAmount - payment.amount;
          
          // Determinar el estado basado en el monto pagado
          let newStatus;
          if (newPaidAmount <= 0) {
            newStatus = 'pending';
          } else if (newPaidAmount < purchase.totalAmount) {
            newStatus = 'partially_paid';
          } else {
            newStatus = 'paid';
          }
          
          // Actualizar la compra
          await prisma.purchase.update({
            where: { id: payment.purchaseId },
            data: {
              paidAmount: Math.max(0, newPaidAmount),
              status: newStatus
            }
          });
        }
      }
      
      // 3. Eliminar el pago
      await prisma.supplierPayment.delete({
        where: { id: parseInt(id) }
      });
    });
    
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtener reporte de deudas a proveedores
 */
const getSupplierDebtsReport = async (req, res) => {
  try {
    const { status, minAmount, maxAmount } = req.query;
    
    // 1. Obtener deudas activas (compras pendientes o parcialmente pagadas)
    const activeDebts = await prisma.purchase.findMany({
      where: {
        status: {
          in: ['pending', 'partially_paid']
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      },
      include: {
        supplier: {
          select: {
            name: true
          }
        }
      }
    });
    
    // 2. Obtener deudas pagadas (compras completamente pagadas)
    const paidDebts = await prisma.purchase.findMany({
      where: {
        status: 'paid'
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 20, // Limitar a las últimas 20 deudas pagadas
      include: {
        supplier: {
          select: {
            name: true
          }
        },
        payments: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });
    
    // Calcular totales
    const activeTotal = activeDebts.reduce((sum, debt) => sum + (debt.totalAmount - debt.paidAmount), 0);
    const paidTotal = paidDebts.reduce((sum, debt) => sum + debt.totalAmount, 0);
    
    // Formatear datos activos para la UI
    const formattedActiveDebts = activeDebts.map(debt => ({
      id: debt.id,
      supplier: debt.supplier.name,
      amount: debt.totalAmount - debt.paidAmount,
      totalAmount: debt.totalAmount,
      paidAmount: debt.paidAmount,
      date: debt.purchaseDate,
      dueDate: debt.dueDate || null,
      status: debt.status
    }));
    
    // Formatear datos pagados para la UI
    const formattedPaidDebts = paidDebts.map(debt => ({
      id: debt.id,
      supplier: debt.supplier.name,
      amount: debt.totalAmount,
      paymentDate: debt.payments.length > 0 ? debt.payments[0].createdAt : debt.updatedAt
    }));
    
    res.json({
      active: formattedActiveDebts,
      paid: formattedPaidDebts,
      summary: {
        activeTotal,
        paidTotal,
        totalDebts: activeTotal + paidTotal,
        activeCount: activeDebts.length,
        paidCount: paidDebts.length
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtener balance general del sistema
 */
const getGeneralBalance = async (req, res) => {
  try {
    // Fecha de inicio (por defecto 30 días atrás)
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Fecha final (por defecto hoy)
    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date();
    
    // Ajustar las horas para incluir el día completo
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);
    
    // 1. Total de deudas a proveedores
    const suppliersDebt = await prisma.purchase.aggregate({
      _sum: {
        totalAmount: true,
        paidAmount: true
      },
      where: {
        status: { not: 'paid' }
      }
    });
    
    const totalDebts = suppliersDebt._sum.totalAmount 
      ? suppliersDebt._sum.totalAmount - (suppliersDebt._sum.paidAmount || 0)
      : 0;
    
    // 2. Total del valor del inventario (costo)
    // Calcular valor total del inventario multiplicando costo por cantidad
    const products = await prisma.product.findMany({
      select: {
        costPrice: true,
        stock: true
      }
    });
    
    const totalInventory = products.reduce((sum, product) => {
      return sum + (product.costPrice * product.stock);
    }, 0);
    
    // 3. Total de ventas en el período
    const salesTotal = await prisma.sale.aggregate({
      _sum: {
        amount: true
      },
      where: {
        status: 'completed'
      }
    });
    
    const totalSales = salesTotal._sum.amount || 0;
    
    // 4. Calcular balance neto
    const netBalance = totalSales + totalInventory - totalDebts;
    
    // Respuesta simplificada para la interfaz
    res.json({
      totalDebts,
      totalInventory,
      totalSales,
      netBalance,
      lastUpdated: new Date()
    });
  } catch (error) {
    handleError(error, res);
  }
};

module.exports = {
  getSupplierPayments,
  createSupplierPayment,
  getSupplierPaymentById,
  updateSupplierPayment,
  deleteSupplierPayment,
  getSupplierDebtsReport,
  getGeneralBalance
};
