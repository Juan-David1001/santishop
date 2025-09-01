const prisma = require('../config/db');
const { handleError } = require('../utils/helpers');

/**
 * Obtiene las ventas agrupadas por día, semana o mes
 */
const getSalesReport = async (req, res) => {
  try {
    const { period = 'day', startDate, endDate } = req.query;
    
    // Validar que el período sea válido
    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(400).json({ error: 'Período inválido. Use day, week o month' });
    }
    
    // Establecer fechas por defecto si no se proporcionan
    const end = endDate ? new Date(endDate) : new Date();
    
    // Por defecto, el rango depende del período
    let start;
    if (startDate) {
      start = new Date(startDate);
    } else {
      switch (period) {
        case 'day':
          // Último mes por defecto
          start = new Date();
          start.setDate(start.getDate() - 30);
          break;
        case 'week':
          // Últimos 3 meses por defecto
          start = new Date();
          start.setMonth(start.getMonth() - 3);
          break;
        case 'month':
          // Último año por defecto
          start = new Date();
          start.setFullYear(start.getFullYear() - 1);
          break;
      }
    }
    
    // Ajustar horas para incluir días completos
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
    
    // Consulta base: todas las ventas completadas en el rango
    const sales = await prisma.sale.findMany({
      where: {
        status: 'completed',
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        saleItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Función para formatear fecha según el período
    const formatPeriodKey = (date) => {
      const d = new Date(date);
      switch (period) {
        case 'day':
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        case 'week':
          // Obtener primer día de la semana (lunes)
          const firstDay = new Date(d);
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
          firstDay.setDate(diff);
          return `${firstDay.getFullYear()}-W${String(Math.ceil(firstDay.getDate() / 7) + 
            (firstDay.getDay() === 1 && firstDay.getDate() <= 7 ? 0 : 
             firstDay.getMonth() * 4)).padStart(2, '0')}`;
        case 'month':
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    };
    
    // Agrupar ventas por período
    const salesByPeriod = {};
    let totalSales = 0;
    let totalProfit = 0;
    
    sales.forEach(sale => {
      const periodKey = formatPeriodKey(sale.createdAt);
      
      if (!salesByPeriod[periodKey]) {
        salesByPeriod[periodKey] = {
          period: periodKey,
          count: 0,
          total: 0,
          profit: 0
        };
      }
      
      // Calcular ganancia de esta venta
      let saleProfit = 0;
      sale.saleItems.forEach(item => {
        const costPrice = item.product.costPrice || 0;
        const itemProfit = (item.unitPrice - costPrice) * item.quantity;
        saleProfit += itemProfit;
      });
      
      salesByPeriod[periodKey].count += 1;
      salesByPeriod[periodKey].total += parseFloat(sale.amount);
      salesByPeriod[periodKey].profit += saleProfit;
      
      totalSales += parseFloat(sale.amount);
      totalProfit += saleProfit;
    });
    
    // Convertir a array para respuesta
    const result = Object.values(salesByPeriod);
    
    res.json({
      period,
      data: result,
      summary: {
        periodCount: result.length,
        totalSales,
        totalProfit,
        averageSalesPerPeriod: result.length > 0 ? totalSales / result.length : 0,
        profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0
      },
      timeRange: {
        start,
        end
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene los productos más vendidos
 */
const getTopProducts = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    
    // Convertir límite a número
    const limitNum = parseInt(limit, 10);
    
    // Establecer fechas por defecto si no se proporcionan (último mes)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end);
    if (!startDate) {
      start.setMonth(start.getMonth() - 1); // Por defecto, último mes
    }
    
    // Ajustar horas para incluir días completos
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
    
    // Agrupar ventas por producto
    const productSales = await prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        totalPrice: true
      },
      where: {
        sale: {
          status: 'completed',
          createdAt: {
            gte: start,
            lte: end
          }
        }
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: limitNum
    });
    
    // Obtener detalles de los productos
    const productIds = productSales.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds
        }
      },
      include: {
        category: true
      }
    });
    
    // Combinar datos
    const result = productSales.map(sale => {
      const product = products.find(p => p.id === sale.productId);
      const profit = product ? 
        (sale._sum.totalPrice - (product.costPrice * sale._sum.quantity)) : 0;
      
      return {
        id: product?.id,
        name: product?.name,
        sku: product?.sku,
        category: product?.category.name,
        quantitySold: sale._sum.quantity,
        totalSales: parseFloat(sale._sum.totalPrice),
        profit,
        profitMargin: sale._sum.totalPrice > 0 ? 
          (profit / sale._sum.totalPrice) * 100 : 0,
        currentStock: product?.stock || 0
      };
    });
    
    res.json({
      topProducts: result,
      timeRange: {
        start,
        end
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene productos con stock bajo
 */
const getLowStockAlerts = async (req, res) => {
  try {
    const { threshold } = req.query;
    
    // Consultar productos con stock menor o igual al umbral mínimo
    const lowStockProducts = await prisma.product.findMany({
      where: {
        // Si se proporciona un umbral, usarlo; de lo contrario usar minimumStock
        ...(threshold ? { stock: { lte: parseInt(threshold, 10) } } : 
                       { stock: { lte: prisma.product.fields.minimumStock } })
      },
      include: {
        category: true,
        saleItems: {
          where: {
            sale: {
              createdAt: {
                // Últimos 30 días
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            }
          }
        }
      },
      orderBy: [
        // Primero los que tienen stock 0
        { stock: 'asc' },
        // Luego por la diferencia entre stock y mínimo
        { minimumStock: 'desc' }
      ]
    });
    
    // Calcular estadísticas adicionales
    const productsWithStats = lowStockProducts.map(product => {
      // Calcular ventas recientes (últimos 30 días)
      const recentSalesQty = product.saleItems.reduce((total, item) => total + item.quantity, 0);
      
      // Estimar días restantes de stock
      const dailyAvgSales = recentSalesQty / 30; // Promedio diario de ventas
      const daysRemaining = dailyAvgSales > 0 ? Math.round(product.stock / dailyAvgSales) : null;
      
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category.name,
        currentStock: product.stock,
        minimumStock: product.minimumStock,
        recentSales: recentSalesQty,
        daysRemaining,
        status: product.stock === 0 ? 'out_of_stock' : 
               product.stock <= product.minimumStock / 2 ? 'critical' : 'warning',
        restockNeeded: product.minimumStock - product.stock
      };
    });
    
    // Agrupar por nivel de severidad
    const outOfStock = productsWithStats.filter(p => p.status === 'out_of_stock');
    const critical = productsWithStats.filter(p => p.status === 'critical');
    const warning = productsWithStats.filter(p => p.status === 'warning');
    
    res.json({
      alerts: {
        outOfStock,
        critical,
        warning
      },
      summary: {
        totalAlerts: productsWithStats.length,
        outOfStockCount: outOfStock.length,
        criticalCount: critical.length,
        warningCount: warning.length
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene un reporte del estado de cuentas por pagar vs pagos realizados
 */
const getPaymentStatus = async (req, res) => {
  try {
    // 1. Obtener todas las compras con sus pagos
    const purchases = await prisma.purchase.findMany({
      include: {
        supplier: true,
        payments: true
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' }
      ]
    });
    
    // 2. Agrupar por estado
    const pending = [];
    const partiallyPaid = [];
    const paid = [];
    
    // Variables para totales
    let totalPending = 0;
    let totalPaid = 0;
    let totalPartiallyPaid = 0;
    let totalDue = 0;
    
    purchases.forEach(purchase => {
      const dueAmount = parseFloat(purchase.totalAmount) - parseFloat(purchase.paidAmount);
      const purchaseData = {
        id: purchase.id,
        supplier: purchase.supplier.name,
        supplierId: purchase.supplierId,
        invoiceNumber: purchase.invoiceNumber,
        totalAmount: parseFloat(purchase.totalAmount),
        paidAmount: parseFloat(purchase.paidAmount),
        dueAmount,
        purchaseDate: purchase.purchaseDate,
        dueDate: purchase.dueDate,
        status: purchase.status,
        payments: purchase.payments.map(payment => ({
          id: payment.id,
          amount: parseFloat(payment.amount),
          date: payment.createdAt
        }))
      };
      
      // Categorizar según estado
      switch (purchase.status) {
        case 'pending':
          pending.push(purchaseData);
          totalPending += parseFloat(purchase.totalAmount);
          break;
        case 'partially_paid':
          partiallyPaid.push(purchaseData);
          totalPartiallyPaid += parseFloat(purchase.totalAmount);
          totalPaid += parseFloat(purchase.paidAmount);
          break;
        case 'paid':
          paid.push(purchaseData);
          totalPaid += parseFloat(purchase.totalAmount);
          break;
      }
      
      // Calcular total adeudado
      if (purchase.status !== 'paid') {
        totalDue += dueAmount;
      }
    });
    
    // 3. Agrupar por proveedor para análisis
    const supplierSummary = {};
    purchases.forEach(purchase => {
      const supplierId = purchase.supplierId;
      if (!supplierSummary[supplierId]) {
        supplierSummary[supplierId] = {
          id: supplierId,
          name: purchase.supplier.name,
          totalPurchases: 0,
          totalAmount: 0,
          paidAmount: 0,
          dueAmount: 0,
          purchaseIds: []
        };
      }
      
      supplierSummary[supplierId].totalPurchases += 1;
      supplierSummary[supplierId].totalAmount += parseFloat(purchase.totalAmount);
      supplierSummary[supplierId].paidAmount += parseFloat(purchase.paidAmount);
      supplierSummary[supplierId].dueAmount += 
        parseFloat(purchase.totalAmount) - parseFloat(purchase.paidAmount);
      supplierSummary[supplierId].purchaseIds.push(purchase.id);
    });
    
    res.json({
      purchases: {
        pending,
        partiallyPaid,
        paid
      },
      suppliers: Object.values(supplierSummary),
      summary: {
        totalPurchases: purchases.length,
        totalPending,
        totalPartiallyPaid,
        totalPaid,
        totalDue,
        paymentCompletionRate: purchases.length > 0 ? 
          (paid.length / purchases.length) * 100 : 0
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene un balance general del sistema
 */
const getGeneralBalance = async (req, res) => {
  try {
    // 1. Valor del inventario
    const products = await prisma.product.findMany({
      select: {
        costPrice: true,
        sellingPrice: true,
        stock: true
      }
    });
    
    const inventoryValue = products.reduce((sum, product) => {
      return sum + (product.costPrice * product.stock);
    }, 0);
    
    const inventoryRetailValue = products.reduce((sum, product) => {
      return sum + (product.sellingPrice * product.stock);
    }, 0);
    
    // 2. Ventas acumuladas
    const salesStats = await prisma.sale.aggregate({
      _sum: {
        amount: true,
        subtotal: true,
        tax: true,
        discount: true
      },
      _count: true,
      where: {
        status: 'completed'
      }
    });
    
    // 3. Calcular ganancias (necesitamos datos de costo)
    const saleItems = await prisma.saleItem.findMany({
      include: {
        product: true,
        sale: {
          where: {
            status: 'completed'
          }
        }
      }
    });
    
    let totalCost = 0;
    saleItems.forEach(item => {
      if (item.sale) { // Asegurar que la venta existe y no fue cancelada
        totalCost += (item.product?.costPrice || 0) * item.quantity;
      }
    });
    
    const grossProfit = salesStats._sum.amount 
      ? salesStats._sum.amount - totalCost 
      : 0;
    
    // 4. Deudas a proveedores
    const supplierDebts = await prisma.purchase.aggregate({
      _sum: {
        totalAmount: true,
        paidAmount: true
      },
      where: {
        status: { not: 'paid' }
      }
    });
    
    const totalDebt = supplierDebts._sum.totalAmount 
      ? supplierDebts._sum.totalAmount - (supplierDebts._sum.paidAmount || 0)
      : 0;
    
    // 5. Resumen del balance
    const netWorth = (salesStats._sum.amount || 0) + inventoryValue - totalDebt;
    
    res.json({
      inventory: {
        value: inventoryValue,
        retailValue: inventoryRetailValue,
        potentialProfit: inventoryRetailValue - inventoryValue,
        itemCount: products.reduce((sum, p) => sum + p.stock, 0),
        productCount: products.length
      },
      sales: {
        totalSales: salesStats._sum.amount || 0,
        totalCount: salesStats._count || 0,
        avgTicket: salesStats._count && salesStats._count > 0 
          ? (salesStats._sum.amount || 0) / salesStats._count
          : 0,
        totalTax: salesStats._sum.tax || 0,
        totalDiscount: salesStats._sum.discount || 0
      },
      profit: {
        grossProfit,
        profitMargin: salesStats._sum.amount && salesStats._sum.amount > 0
          ? (grossProfit / salesStats._sum.amount) * 100
          : 0
      },
      debt: {
        total: totalDebt,
        paidAmount: supplierDebts._sum.paidAmount || 0,
        totalPurchases: supplierDebts._sum.totalAmount || 0
      },
      summary: {
        netWorth,
        liquidAssets: salesStats._sum.amount || 0,
        inventoryAssets: inventoryValue,
        liabilities: totalDebt
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

module.exports = {
  getSalesReport,
  getTopProducts,
  getLowStockAlerts,
  getPaymentStatus,
  getGeneralBalance
};
