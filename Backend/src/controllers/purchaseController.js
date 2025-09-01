const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtener todas las compras
 */
exports.getAllPurchases = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      supplierId,
      startDate,
      endDate,
      status,
      sortBy = 'purchaseDate',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * parseInt(limit);
    
    // Construir filtros
    const filters = {};
    if (supplierId) filters.supplierId = parseInt(supplierId);
    if (status) filters.status = status;
    
    // Filtro de fechas
    if (startDate || endDate) {
      filters.purchaseDate = {};
      if (startDate) filters.purchaseDate.gte = new Date(startDate);
      if (endDate) {
        const endDateObj = new Date(endDate);
        // Ajustar la fecha final al final del día
        endDateObj.setHours(23, 59, 59, 999);
        filters.purchaseDate.lte = endDateObj;
      }
    }

    // Obtener compras con paginación
    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where: filters,
        include: {
          supplier: true,
          user: true,
          payments: true,
          purchaseItems: {
            include: {
              product: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.purchase.count({
        where: filters
      })
    ]);

    return res.status(200).json({
      purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      }
    });
  } catch (error) {
    console.error('Error getting purchases:', error);
    return res.status(500).json({ 
      error: 'Error al obtener las compras' 
    });
  }
};

/**
 * Obtener una compra por su ID
 */
exports.getPurchaseById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: parseInt(id) },
      include: {
        supplier: true,
        user: true,
        payments: true,
        purchaseItems: {
          include: {
            product: true
          }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({ 
        error: 'Compra no encontrada' 
      });
    }

    return res.status(200).json(purchase);
  } catch (error) {
    console.error('Error getting purchase:', error);
    return res.status(500).json({ 
      error: 'Error al obtener la compra' 
    });
  }
};

/**
 * Crear una nueva compra
 */
exports.createPurchase = async (req, res) => {
  const { 
    supplierId,
    userId,
    invoiceNumber,
    totalAmount,
    paidAmount = 0,
    notes,
    purchaseDate,
    dueDate,
    items
  } = req.body;

  // Validar campos requeridos
  if (!supplierId || !userId || !totalAmount || !items || !items.length) {
    return res.status(400).json({ 
      error: 'Se requiere proveedor, usuario, monto total y al menos un producto' 
    });
  }

  // Iniciar transacción
  try {
    const result = await prisma.$transaction(async (prisma) => {
      // Verificar que el proveedor existe
      const supplier = await prisma.supplier.findUnique({
        where: { id: parseInt(supplierId) }
      });
      
      if (!supplier) {
        throw new Error('Proveedor no encontrado');
      }

      // Verificar que el usuario existe
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) }
      });
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Crear la compra
      const purchase = await prisma.purchase.create({
        data: {
          supplierId: parseInt(supplierId),
          userId: parseInt(userId),
          invoiceNumber,
          totalAmount: parseFloat(totalAmount),
          paidAmount: parseFloat(paidAmount || 0),
          status: parseFloat(paidAmount || 0) >= parseFloat(totalAmount) ? 'paid' : 
                 parseFloat(paidAmount || 0) > 0 ? 'partially_paid' : 'pending',
          notes,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null
        }
      });

      // Crear los items de la compra y actualizar el stock de los productos
      for (const item of items) {
        // Validar item
        if (!item.productId || !item.quantity || !item.unitCost) {
          throw new Error('Todos los productos deben tener ID, cantidad y costo unitario');
        }

        // Verificar que el producto existe
        const product = await prisma.product.findUnique({
          where: { id: parseInt(item.productId) }
        });
        
        if (!product) {
          throw new Error(`Producto con ID ${item.productId} no encontrado`);
        }

        // Calcular costo total del ítem
        const totalCost = parseFloat(item.quantity) * parseFloat(item.unitCost);

        // Crear el ítem de compra
        await prisma.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: parseInt(item.productId),
            quantity: parseInt(item.quantity),
            unitCost: parseFloat(item.unitCost),
            totalCost
          }
        });

        // Actualizar stock del producto
        await prisma.product.update({
          where: { id: parseInt(item.productId) },
          data: {
            stock: {
              increment: parseInt(item.quantity)
            },
            costPrice: parseFloat(item.unitCost) // Actualizar el precio de costo al último
          }
        });

        // Registrar movimiento de stock
        await prisma.stockMovement.create({
          data: {
            productId: parseInt(item.productId),
            quantity: parseInt(item.quantity),
            type: 'compra',
            reference: `Compra #${purchase.id}`,
            notes: `Compra a proveedor: ${supplier.name}`,
            purchaseId: purchase.id
          }
        });
      }

      // Si hay pago inicial, registrarlo
      if (parseFloat(paidAmount || 0) > 0) {
        await prisma.supplierPayment.create({
          data: {
            supplierId: parseInt(supplierId),
            amount: parseFloat(paidAmount),
            description: `Pago inicial por compra #${purchase.id}`,
            userId: parseInt(userId),
            purchaseId: purchase.id
          }
        });
      }

      // Actualizar el saldo del proveedor
      const pendingAmount = parseFloat(totalAmount) - parseFloat(paidAmount || 0);
      await prisma.supplier.update({
        where: { id: parseInt(supplierId) },
        data: {
          balance: {
            increment: pendingAmount
          }
        }
      });

      // Retornar la compra completa con items
      return prisma.purchase.findUnique({
        where: { id: purchase.id },
        include: {
          supplier: true,
          user: true,
          payments: true,
          purchaseItems: {
            include: {
              product: true
            }
          }
        }
      });
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating purchase:', error);
    return res.status(500).json({ 
      error: `Error al crear la compra: ${error.message}` 
    });
  }
};

/**
 * Registrar un pago a un proveedor
 */
exports.registerPayment = async (req, res) => {
  const { 
    supplierId, 
    amount, 
    userId, 
    purchaseId, 
    description 
  } = req.body;

  // Validar campos requeridos
  if (!supplierId || !amount || !userId) {
    return res.status(400).json({ 
      error: 'Se requiere proveedor, monto y usuario' 
    });
  }

  if (parseFloat(amount) <= 0) {
    return res.status(400).json({ 
      error: 'El monto debe ser mayor a cero' 
    });
  }

  // Iniciar transacción
  try {
    const result = await prisma.$transaction(async (prisma) => {
      // Verificar que el proveedor existe
      const supplier = await prisma.supplier.findUnique({
        where: { id: parseInt(supplierId) }
      });
      
      if (!supplier) {
        throw new Error('Proveedor no encontrado');
      }

      // Verificar que el monto no excede el saldo pendiente
      if (parseFloat(amount) > supplier.balance) {
        throw new Error('El monto del pago excede el saldo pendiente');
      }

      // Crear el pago
      const payment = await prisma.supplierPayment.create({
        data: {
          supplierId: parseInt(supplierId),
          amount: parseFloat(amount),
          description: description || 'Pago a proveedor',
          userId: parseInt(userId),
          purchaseId: purchaseId ? parseInt(purchaseId) : null
        }
      });

      // Actualizar el saldo del proveedor
      await prisma.supplier.update({
        where: { id: parseInt(supplierId) },
        data: {
          balance: {
            decrement: parseFloat(amount)
          }
        }
      });

      // Si se especificó una compra, actualizar su estado
      if (purchaseId) {
        const purchase = await prisma.purchase.findUnique({
          where: { id: parseInt(purchaseId) },
          include: {
            payments: true
          }
        });

        if (purchase) {
          // Calcular el total pagado incluyendo el nuevo pago
          const totalPaid = purchase.payments.reduce((sum, p) => sum + p.amount, 0) + parseFloat(amount);
          
          // Determinar el nuevo estado
          let newStatus = 'pending';
          if (totalPaid >= purchase.totalAmount) {
            newStatus = 'paid';
          } else if (totalPaid > 0) {
            newStatus = 'partially_paid';
          }

          // Actualizar la compra
          await prisma.purchase.update({
            where: { id: parseInt(purchaseId) },
            data: {
              paidAmount: totalPaid,
              status: newStatus
            }
          });
        }
      }

      return payment;
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error registering payment:', error);
    return res.status(500).json({ 
      error: `Error al registrar el pago: ${error.message}` 
    });
  }
};

/**
 * Obtener reporte de compras por proveedor y/o período
 */
exports.getPurchaseReport = async (req, res) => {
  const { supplierId, startDate, endDate } = req.query;
  
  try {
    // Construir filtros
    const filters = {};
    if (supplierId) filters.supplierId = parseInt(supplierId);
    
    // Filtro de fechas
    if (startDate || endDate) {
      filters.purchaseDate = {};
      if (startDate) filters.purchaseDate.gte = new Date(startDate);
      if (endDate) {
        const endDateObj = new Date(endDate);
        // Ajustar la fecha final al final del día
        endDateObj.setHours(23, 59, 59, 999);
        filters.purchaseDate.lte = endDateObj;
      }
    }

    // Obtener las compras con los filtros
    const purchases = await prisma.purchase.findMany({
      where: filters,
      include: {
        supplier: true,
        purchaseItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    });

    // Procesar datos para el reporte
    const reportData = {
      totalPurchases: purchases.length,
      totalAmount: purchases.reduce((sum, p) => sum + p.totalAmount, 0),
      paidAmount: purchases.reduce((sum, p) => sum + p.paidAmount, 0),
      pendingAmount: purchases.reduce((sum, p) => sum + (p.totalAmount - p.paidAmount), 0),
      byStatus: {
        pending: purchases.filter(p => p.status === 'pending').length,
        partially_paid: purchases.filter(p => p.status === 'partially_paid').length,
        paid: purchases.filter(p => p.status === 'paid').length
      },
      bySupplier: {},
      byProduct: {},
      byMonth: {},
      purchases
    };

    // Agrupar por proveedor
    purchases.forEach(purchase => {
      const supplierId = purchase.supplierId;
      const supplierName = purchase.supplier.name;
      
      if (!reportData.bySupplier[supplierId]) {
        reportData.bySupplier[supplierId] = {
          name: supplierName,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          purchaseCount: 0
        };
      }
      
      reportData.bySupplier[supplierId].totalAmount += purchase.totalAmount;
      reportData.bySupplier[supplierId].paidAmount += purchase.paidAmount;
      reportData.bySupplier[supplierId].pendingAmount += (purchase.totalAmount - purchase.paidAmount);
      reportData.bySupplier[supplierId].purchaseCount++;
    });

    // Agrupar por producto
    purchases.forEach(purchase => {
      purchase.purchaseItems.forEach(item => {
        const productId = item.productId;
        const productName = item.product.name;
        
        if (!reportData.byProduct[productId]) {
          reportData.byProduct[productId] = {
            name: productName,
            totalQuantity: 0,
            totalAmount: 0,
            purchaseCount: 0
          };
        }
        
        reportData.byProduct[productId].totalQuantity += item.quantity;
        reportData.byProduct[productId].totalAmount += item.totalCost;
        reportData.byProduct[productId].purchaseCount++;
      });
    });

    // Agrupar por mes
    purchases.forEach(purchase => {
      const date = new Date(purchase.purchaseDate);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!reportData.byMonth[monthYear]) {
        reportData.byMonth[monthYear] = {
          totalAmount: 0,
          purchaseCount: 0
        };
      }
      
      reportData.byMonth[monthYear].totalAmount += purchase.totalAmount;
      reportData.byMonth[monthYear].purchaseCount++;
    });

    return res.status(200).json(reportData);
  } catch (error) {
    console.error('Error generating purchase report:', error);
    return res.status(500).json({ 
      error: 'Error al generar el reporte de compras' 
    });
  }
};
