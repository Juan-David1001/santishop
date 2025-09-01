const prisma = require('../config/db');
const { handleError } = require('../utils/helpers');

/**
 * Función de utilidad para obtener el turno activo de un usuario
 */
const getActiveShift = async (userId) => {
  return await prisma.shift.findFirst({
    where: {
      userId: parseInt(userId),
      isActive: true
    }
  });
};

/**
 * Busca productos por nombre, SKU o código de barras
 */
const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ products: [] });
    }
    
    // Convertir la búsqueda a minúsculas para buscar de forma insensible a mayúsculas/minúsculas
    const searchLower = query.toLowerCase();
    
    // Buscar por nombre, SKU o código de barras
    // Usamos toLowerCase() como alternativa a mode: 'insensitive' que no es soportado
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query } }, // Búsqueda básica, puede ser case-sensitive
          { sku: { contains: query } },
          { barcode: { contains: query } }
        ]
      },
      include: {
        category: true
      },
      take: 15,
      orderBy: { name: 'asc' }
    });
    
    // Filtrado adicional para búsquedas insensibles a mayúsculas/minúsculas en el nombre
    // si la base de datos no lo soporta directamente
    const filteredProducts = products.filter(product => 
      product.name.toLowerCase().includes(searchLower) ||
      (product.sku && product.sku.includes(query)) ||
      (product.barcode && product.barcode.includes(query))
    );
    
    res.json({ products: filteredProducts });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene todas las ventas con filtros opcionales
 */
const getSales = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      minAmount, 
      maxAmount,
      paymentMethod,
      userId,
      shiftId,
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
    
    // Filtros de fecha
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Inicio del día
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Final del día
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
    
    // Filtro de método de pago
    if (paymentMethod) {
      where.payments = {
        some: {
          type: paymentMethod
        }
      };
    }
    
    // Filtros de usuario y turno
    if (userId) {
      where.userId = parseInt(userId);
    }
    
    if (shiftId) {
      where.shiftId = parseInt(shiftId);
    }

    // Contar el número total de registros para la paginación
    const totalCount = await prisma.sale.count({ where });

    // Consultar ventas con paginación
    const sales = await prisma.sale.findMany({
      where,
      include: {
        user: true,
        shift: true,
        saleItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      ...(shouldUseFullLoad ? {} : { skip, take: limitNum })
    });

    // Consulta separada para obtener totales
    const allSalesForTotals = await prisma.sale.findMany({
      where,
      include: {
        payments: true,
        user: true
      }
    });

    // Calcular totales
    const totalAmount = allSalesForTotals.reduce((sum, sale) => sum + parseFloat(sale.amount), 0);
    
    // Agrupar totales por método de pago
    const paymentMethodTotals = {};
    allSalesForTotals.forEach(sale => {
      sale.payments.forEach(payment => {
        const type = payment.type;
        if (!paymentMethodTotals[type]) {
          paymentMethodTotals[type] = 0;
        }
        paymentMethodTotals[type] += parseFloat(payment.amount);
      });
    });

    const totals = {
      total: totalAmount,
      byPaymentMethod: paymentMethodTotals
    };
    
    // Si hay filtro de usuario, agregar totales por usuario
    if (userId || (sales.length > 0 && sales.some(s => s.userId))) {
      // Agrupar ventas por usuario
      const salesByUser = {};
      allSalesForTotals.forEach(sale => {
        if (sale.userId) {
          if (!salesByUser[sale.userId]) {
            salesByUser[sale.userId] = {
              total: 0,
              userName: sale.user ? sale.user.name : 'Desconocido'
            };
          }
          salesByUser[sale.userId].total += parseFloat(sale.amount);
        }
      });
      
      totals.byUser = salesByUser;
    }

    // Calcular información de paginación
    const totalPages = shouldUseFullLoad ? 1 : Math.ceil(totalCount / limitNum);
    
    res.json({
      sales,
      totals,
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
 * Crea una nueva venta con items
 */
const createSale = async (req, res) => {
  try {
    const { 
      userId, 
      shiftId: requestShiftId,
      items = [],
      clientId = null,
      payments = [],
      subtotal = 0,
      tax = 0,
      discount = 0,
      amount = 0,
      pointsEarned = 0,
      pointsRedeemed = 0,
      notes = ''
    } = req.body;
    
    // Validar que hay items en la venta
    if (!items.length) {
      return res.status(400).json({ error: 'La venta debe tener al menos un producto' });
    }
    
    // Validar que hay métodos de pago
    if (!payments.length) {
      return res.status(400).json({ error: 'Debe especificar al menos un método de pago' });
    }
    
    // Validar los métodos de pago
    const validPaymentMethods = ['efectivo', 'tarjeta', 'transferencia', 'puntos', 'otro'];
    for (const payment of payments) {
      if (!validPaymentMethods.includes(payment.type)) {
        return res.status(400).json({ 
          error: `Método de pago '${payment.type}' no válido. Debe ser uno de: ${validPaymentMethods.join(', ')}` 
        });
      }
    }

    // Usar el shiftId proporcionado o intentar obtenerlo del usuario
    let shiftId = requestShiftId ? parseInt(requestShiftId) : null;
    
    // Si no hay shiftId pero sí hay userId, intentar obtener el turno activo
    if (!shiftId && userId) {
      const activeShift = await getActiveShift(userId);
      if (activeShift) {
        shiftId = activeShift.id;
      } else {
        return res.status(400).json({ 
          error: 'El usuario no tiene un turno activo. Debe iniciar un turno antes de registrar ventas.' 
        });
      }
    }
    
    // Validar y obtener productos
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    
    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'Uno o más productos no existen' });
    }
    
    // Verificar stock disponible
    const productsMap = {};
    products.forEach(product => {
      productsMap[product.id] = product;
    });
    
    for (const item of items) {
      const product = productsMap[item.productId];
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}` 
        });
      }
    }
    
    // Crear la venta
    const sale = await prisma.$transaction(async (prisma) => {
      // Crear la venta con todos los datos proporcionados
      const newSale = await prisma.sale.create({
        data: {
          amount,
          subtotal,
          tax,
          discount,
          userId: userId ? parseInt(userId) : null,
          shiftId,
          clientId: clientId ? parseInt(clientId) : null,
          pointsEarned: parseInt(pointsEarned) || 0,
          pointsRedeemed: parseInt(pointsRedeemed) || 0,
          notes,
          saleItems: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice
            }))
          },
          payments: {
            create: payments.map(payment => ({
              type: payment.type,
              amount: parseFloat(payment.amount) || 0,
              reference: payment.reference || null
            }))
          }
        },
        include: {
          user: true,
          shift: true,
          client: true,
          payments: true,
          saleItems: {
            include: {
              product: true
            }
          }
        }
      });
      
      // Actualizar puntos del cliente si corresponde
      if (clientId && (pointsEarned > 0 || pointsRedeemed > 0)) {
        const client = await prisma.client.findUnique({
          where: { id: parseInt(clientId) }
        });
        
        if (client) {
          // Actualizar los puntos del cliente
          await prisma.client.update({
            where: { id: parseInt(clientId) },
            data: {
              totalPoints: client.totalPoints + parseInt(pointsEarned),
              usedPoints: client.usedPoints + parseInt(pointsRedeemed),
              totalSpent: { increment: amount },
              lastVisit: new Date()
            }
          });
        }
      }
      
      // Actualizar el stock de los productos
      for (const item of items) {
        const product = productsMap[item.productId];
        
        // Actualizar stock
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: product.stock - item.quantity }
        });
        
        // Registrar movimiento de stock
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity,
            type: 'venta',
            reference: `Venta #${newSale.id}`,
            notes: `Venta realizada. ID: ${newSale.id}`
          }
        });
      }
      
      return newSale;
    });
    
    res.status(201).json(sale);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene los detalles de una venta por su ID
 */
const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        shift: true,
        saleItems: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!sale) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    res.json(sale);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Elimina una venta
 */
const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener los detalles de la venta antes de eliminarla
    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(id) },
      include: {
        saleItems: true
      }
    });
    
    if (!sale) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    await prisma.$transaction(async (prisma) => {
      // Restaurar el stock de los productos
      for (const item of sale.saleItems) {
        // Actualizar stock
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity
            }
          }
        });
        
        // Registrar movimiento de stock de restauración
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            type: 'ajuste',
            reference: `Cancelación Venta #${sale.id}`,
            notes: `Venta cancelada/eliminada. ID: ${sale.id}`
          }
        });
      }
      
      // Eliminar la venta (los items se eliminarán en cascada)
      await prisma.sale.delete({
        where: { id: parseInt(id) }
      });
    });
    
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
};

module.exports = {
  getSales,
  createSale,
  getSaleById,
  deleteSale,
  searchProducts,
  getActiveShift
};
