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

/**
 * Obtiene la valorización de inventario por período
 */
const getInventoryValuation = async (req, res) => {
  try {
    const { timeRange = 'month' } = req.query;
    
    // Determinar el rango de fechas según el parámetro timeRange
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1); // Por defecto: último mes
    }
    
    // Obtener todos los productos actuales
    const products = await prisma.product.findMany({
      include: {
        category: true
      }
    });
    
    // Calcular la valorización actual
    let totalCostValue = 0;
    let totalSellingValue = 0;
    
    products.forEach(product => {
      totalCostValue += product.costPrice * product.stock;
      totalSellingValue += product.sellingPrice * product.stock;
    });
    
    // Obtener histórico de movimientos de stock para análisis por período
    const stockMovements = await prisma.stockMovement.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        product: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Función para formatear fecha según el período
    const formatDate = (date, format) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      if (format === 'month') {
        return `${year}-${month}`;
      } else if (format === 'quarter') {
        const quarter = Math.floor((d.getMonth() / 3)) + 1;
        return `${year}-Q${quarter}`;
      } else {
        // Para formato 'year', agrupar por mes
        return `${year}-${month}`;
      }
    };
    
    // Determinar las etiquetas (labels) para el gráfico según el período
    const labels = [];
    const costValues = [];
    const sellingValues = [];
    const potentialProfits = [];
    
    // Generar fechas para el período seleccionado
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const formattedDate = formatDate(currentDate, timeRange);
      
      if (!labels.includes(formattedDate)) {
        labels.push(formattedDate);
        
        // Inicializar con valores 0
        costValues.push(0);
        sellingValues.push(0);
        potentialProfits.push(0);
      }
      
      // Avanzar al siguiente período
      if (timeRange === 'month') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (timeRange === 'quarter') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }
    
    // Para este informe, simplemente vamos a simular datos históricos
    // En una implementación real, procesaríamos los stockMovements para obtener valores históricos
    for (let i = 0; i < labels.length; i++) {
      // Valores simulados que aumentan hacia el valor actual
      const factor = (i + 1) / labels.length;
      costValues[i] = Math.round(totalCostValue * (0.7 + (factor * 0.3)));
      sellingValues[i] = Math.round(totalSellingValue * (0.7 + (factor * 0.3)));
      potentialProfits[i] = sellingValues[i] - costValues[i];
    }
    
    // Calcular la ganancia potencial y el margen de ganancia
    const potentialProfit = totalSellingValue - totalCostValue;
    const profitMargin = totalCostValue > 0 ? (potentialProfit / totalCostValue) * 100 : 0;
    
    res.json({
      labels,
      data: {
        costValues,
        sellingValues,
        potentialProfits
      },
      summary: {
        totalCostValue,
        totalSellingValue,
        potentialProfit,
        profitMargin
      },
      timeRange: {
        start: startDate,
        end: endDate,
        type: timeRange
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene los movimientos de stock por período
 */
const getStockMovements = async (req, res) => {
  try {
    const { timeRange = 'month', productId, categoryId } = req.query;
    
    // Determinar el rango de fechas según el parámetro timeRange
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1); // Por defecto: último mes
    }
    
    // Construir filtro para los movimientos
    const filter = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
    
    // Filtrar por producto si se especifica
    if (productId) {
      filter.productId = parseInt(productId);
    }
    
    // Si se especifica categoría, primero necesitamos obtener los productos de esa categoría
    let productIds = [];
    if (categoryId && !productId) {
      const productsInCategory = await prisma.product.findMany({
        where: {
          categoryId: parseInt(categoryId)
        },
        select: {
          id: true
        }
      });
      productIds = productsInCategory.map(p => p.id);
      
      // Si hay productos en esta categoría, filtrar por ellos
      if (productIds.length > 0) {
        filter.productId = {
          in: productIds
        };
      }
    }
    
    // Obtener los movimientos de stock
    const stockMovements = await prisma.stockMovement.findMany({
      where: filter,
      include: {
        product: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Función para formatear fecha según el período
    const formatDate = (date, format) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      
      if (format === 'month') {
        return `${year}-${month}-${day}`;
      } else if (format === 'quarter') {
        const quarter = Math.floor((d.getMonth() / 3)) + 1;
        return `${year}-Q${quarter}`;
      } else {
        return `${year}-${month}`;
      }
    };
    
    // Agrupar movimientos por fecha
    const movementsByDate = {};
    
    stockMovements.forEach(movement => {
      const dateKey = formatDate(movement.createdAt, timeRange);
      
      if (!movementsByDate[dateKey]) {
        movementsByDate[dateKey] = {
          inflow: 0,
          outflow: 0
        };
      }
      
      // Sumar según tipo de movimiento
      if (movement.type === 'entrada') {
        movementsByDate[dateKey].inflow += movement.quantity;
      } else if (movement.type === 'salida') {
        movementsByDate[dateKey].outflow += movement.quantity;
      }
    });
    
    // Preparar arrays para el gráfico
    const labels = Object.keys(movementsByDate).sort();
    const inflows = [];
    const outflows = [];
    
    labels.forEach(label => {
      inflows.push(movementsByDate[label].inflow);
      outflows.push(movementsByDate[label].outflow);
    });
    
    // Calcular totales
    const totalInflow = inflows.reduce((sum, value) => sum + value, 0);
    const totalOutflow = outflows.reduce((sum, value) => sum + value, 0);
    
    res.json({
      labels,
      data: {
        inflows,
        outflows
      },
      summary: {
        totalInflow,
        totalOutflow,
        netChange: totalInflow - totalOutflow
      },
      timeRange: {
        start: startDate,
        end: endDate,
        type: timeRange
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene la distribución de productos por categoría
 */
const getCategoryDistribution = async (req, res) => {
  try {
    const { timeRange = 'month' } = req.query;
    
    // Obtener todas las categorías
    const categories = await prisma.category.findMany();
    
    // Obtener productos con sus categorías
    const products = await prisma.product.findMany({
      include: {
        category: true
      }
    });
    
    // Agrupar productos por categoría
    const productsByCategory = {};
    
    categories.forEach(category => {
      productsByCategory[category.id] = {
        id: category.id,
        name: category.name,
        productCount: 0,
        costValue: 0,
        sellingValue: 0
      };
    });
    
    // Procesar productos
    products.forEach(product => {
      const categoryId = product.categoryId;
      
      if (productsByCategory[categoryId]) {
        productsByCategory[categoryId].productCount += 1;
        productsByCategory[categoryId].costValue += product.costPrice * product.stock;
        productsByCategory[categoryId].sellingValue += product.sellingPrice * product.stock;
      }
    });
    
    // Convertir a arrays para el gráfico
    const labels = [];
    const productCounts = [];
    const costValues = [];
    const sellingValues = [];
    
    Object.values(productsByCategory).forEach(category => {
      labels.push(category.name);
      productCounts.push(category.productCount);
      costValues.push(category.costValue);
      sellingValues.push(category.sellingValue);
    });
    
    res.json({
      labels,
      data: {
        productCounts,
        costValues,
        sellingValues
      },
      summary: {
        totalCategories: categories.length,
        totalProducts: products.length,
        totalCostValue: costValues.reduce((sum, value) => sum + value, 0),
        totalSellingValue: sellingValues.reduce((sum, value) => sum + value, 0)
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
  getGeneralBalance,
  getInventoryValuation,
  getStockMovements,
  getCategoryDistribution
};
