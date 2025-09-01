const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const moment = require('moment');

/**
 * Obtiene un reporte de ventas agrupado por el período seleccionado
 */
async function getSalesReport(req, res) {
  try {
    const { period = 'week' } = req.query;
    let groupBy, dateFormat, daysToSubtract, dateField;

    // Configurar parámetros según el período
    switch (period) {
      case 'day':
        groupBy = { by: ['date'] };
        dateFormat = 'YYYY-MM-DD';
        daysToSubtract = 30;
        dateField = 'date';
        break;
      case 'week':
        groupBy = { by: ['year', 'week'] };
        dateFormat = '[Semana] W, YYYY';
        daysToSubtract = 90; // ~3 months
        dateField = 'date';
        break;
      case 'month':
        groupBy = { by: ['year', 'month'] };
        dateFormat = 'MMMM YYYY';
        daysToSubtract = 365; // 1 year
        dateField = 'date';
        break;
      default:
        return res.status(400).json({ error: 'Período inválido' });
    }

    // Obtener fecha límite
    const limitDate = moment().subtract(daysToSubtract, 'days').toDate();

    // Obtener ventas agrupadas por período
    const salesByPeriod = await prisma.sale.groupBy({
      ...groupBy,
      where: {
        [dateField]: {
          gte: limitDate,
        },
        status: 'COMPLETED'
      },
      _sum: {
        total: true,
        profit: true
      },
      orderBy: period === 'day' ? { date: 'asc' } : [{ year: 'asc' }, period === 'week' ? { week: 'asc' } : { month: 'asc' }]
    });

    // Formatear los datos según el período
    const formattedData = salesByPeriod.map(item => {
      let periodLabel;
      
      if (period === 'day') {
        periodLabel = moment(item.date).format(dateFormat);
      } else if (period === 'week') {
        periodLabel = moment().year(item.year).isoWeek(item.week).format(dateFormat);
      } else { // month
        periodLabel = moment().year(item.year).month(item.month - 1).format(dateFormat);
      }
      
      return {
        period: periodLabel,
        total: item._sum.total || 0,
        profit: item._sum.profit || 0
      };
    });

    // Obtener totales generales
    const totalSales = formattedData.reduce((sum, item) => sum + item.total, 0);
    const totalProfit = formattedData.reduce((sum, item) => sum + item.profit, 0);
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
    const averageSalesPerPeriod = formattedData.length > 0 ? totalSales / formattedData.length : 0;

    // Devolver datos formateados
    res.json({
      data: formattedData,
      summary: {
        totalSales,
        totalProfit,
        profitMargin,
        averageSalesPerPeriod
      }
    });
  } catch (error) {
    console.error('Error en getSalesReport:', error);
    res.status(500).json({ error: 'Error al obtener el reporte de ventas' });
  }
}

/**
 * Obtiene un listado de los productos más vendidos
 */
async function getTopProducts(req, res) {
  try {
    const { limit = 10 } = req.query;
    const numLimit = parseInt(limit, 10);
    
    // Obtener productos más vendidos basado en artículos de ventas
    const topSellingProducts = await prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        total: true,
        profit: true
      },
      orderBy: {
        _sum: {
          quantity: true
        }
      },
      take: numLimit
    });

    // Obtener detalles de los productos
    const productDetails = await Promise.all(
      topSellingProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            category: true,
            stock: true,
            costPrice: true,
            sellingPrice: true
          }
        });

        if (!product) return null;

        const totalSales = item._sum.total || 0;
        const profit = item._sum.profit || 0;
        const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

        return {
          id: product.id,
          name: product.name,
          category: product.category,
          quantitySold: item._sum.quantity || 0,
          totalSales: totalSales,
          profit: profit,
          profitMargin: profitMargin,
          currentStock: product.stock
        };
      })
    );

    // Filtrar productos nulos y ordenar por cantidad
    const validProducts = productDetails
      .filter(product => product !== null)
      .sort((a, b) => b.quantitySold - a.quantitySold);

    res.json({ topProducts: validProducts });
  } catch (error) {
    console.error('Error en getTopProducts:', error);
    res.status(500).json({ error: 'Error al obtener los productos más vendidos' });
  }
}

/**
 * Obtiene un listado de productos con stock bajo
 */
async function getLowStockAlerts(req, res) {
  try {
    // Obtener todos los productos activos
    const products = await prisma.product.findMany({
      where: {
        active: true
      },
      select: {
        id: true,
        name: true,
        category: true,
        sku: true,
        stock: true,
        minimumStock: true,
        criticalStock: true
      }
    });

    // Calcular ventas recientes (últimos 30 días) para cada producto
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSales = await Promise.all(
      products.map(async (product) => {
        const sales = await prisma.saleItem.aggregate({
          where: {
            productId: product.id,
            sale: {
              date: {
                gte: thirtyDaysAgo
              }
            }
          },
          _sum: {
            quantity: true
          }
        });

        return {
          productId: product.id,
          recentSales: sales._sum.quantity || 0
        };
      })
    );

    // Crear mapa de ventas recientes
    const recentSalesMap = recentSales.reduce((map, item) => {
      map[item.productId] = item.recentSales;
      return map;
    }, {});

    // Calcular cuántos días de stock quedan (basado en ventas recientes)
    const productsWithDaysRemaining = products.map(product => {
      const recentSaleQty = recentSalesMap[product.id] || 0;
      // Calculo de días restantes si hay ventas recientes
      const daysRemaining = recentSaleQty > 0 
        ? Math.round((product.stock / (recentSaleQty / 30)) * 10) / 10 
        : null;
      
      return {
        ...product,
        recentSales: recentSaleQty,
        daysRemaining
      };
    });

    // Clasificar productos según nivel de stock
    const outOfStock = productsWithDaysRemaining.filter(p => p.stock === 0);
    const critical = productsWithDaysRemaining.filter(p => p.stock > 0 && p.stock <= (p.criticalStock || 5));
    const warning = productsWithDaysRemaining.filter(p => 
      p.stock > (p.criticalStock || 5) && 
      p.stock <= (p.minimumStock || 10)
    );

    res.json({
      alerts: {
        outOfStock,
        critical,
        warning
      }
    });
  } catch (error) {
    console.error('Error en getLowStockAlerts:', error);
    res.status(500).json({ error: 'Error al obtener alertas de stock' });
  }
}

/**
 * Obtiene el estado de pagos a proveedores
 */
async function getPaymentStatus(req, res) {
  try {
    // Obtener todas las compras con sus pagos
    const purchases = await prisma.purchase.findMany({
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        payments: true
      }
    });

    // Calcular pagos pendientes y realizados
    const processedPurchases = purchases.map(purchase => {
      const totalPaid = purchase.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const dueAmount = purchase.total - totalPaid;
      const paymentStatus = dueAmount <= 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING';
      
      return {
        id: purchase.id,
        supplier: purchase.supplier.name,
        invoiceNumber: purchase.invoiceNumber,
        purchaseDate: purchase.date,
        dueDate: purchase.dueDate,
        totalAmount: purchase.total,
        paidAmount: totalPaid,
        dueAmount: dueAmount > 0 ? dueAmount : 0,
        status: paymentStatus
      };
    });

    // Clasificar compras según estado de pago
    const pending = processedPurchases.filter(p => p.status === 'PENDING');
    const partiallyPaid = processedPurchases.filter(p => p.status === 'PARTIAL');
    const paid = processedPurchases.filter(p => p.status === 'PAID');

    res.json({
      purchases: {
        pending,
        partiallyPaid,
        paid
      }
    });
  } catch (error) {
    console.error('Error en getPaymentStatus:', error);
    res.status(500).json({ error: 'Error al obtener estado de pagos' });
  }
}

/**
 * Obtiene el balance general
 */
async function getGeneralBalance(req, res) {
  try {
    // Obtener valor total del inventario
    const inventoryValue = await prisma.product.aggregate({
      _sum: {
        costPrice: true,
        sellingPrice: true
      },
      _count: {
        id: true
      }
    });

    // Calcular el valor del inventario a precio de costo
    const stockValue = await prisma.product.aggregate({
      _sum: {
        costPriceTotal: true,
        sellingPriceTotal: true
      }
    });
    
    // Ventas totales y ganancias
    const salesData = await prisma.sale.aggregate({
      where: {
        status: 'COMPLETED'
      },
      _sum: {
        total: true,
        profit: true
      },
      _count: {
        id: true
      }
    });

    // Deudas pendientes a proveedores
    const purchases = await prisma.purchase.findMany({
      include: {
        payments: true
      }
    });
    
    const totalDebt = purchases.reduce((sum, purchase) => {
      const paidAmount = purchase.payments.reduce((paid, payment) => paid + payment.amount, 0);
      const remaining = purchase.total - paidAmount;
      return sum + (remaining > 0 ? remaining : 0);
    }, 0);

    // Construir respuesta
    const balance = {
      inventory: {
        count: inventoryValue._count.id,
        value: stockValue._sum.costPriceTotal || 0,
        retailValue: stockValue._sum.sellingPriceTotal || 0,
        potentialProfit: (stockValue._sum.sellingPriceTotal || 0) - (stockValue._sum.costPriceTotal || 0),
      },
      sales: {
        count: salesData._count.id,
        totalSales: salesData._sum.total || 0
      },
      profit: {
        grossProfit: salesData._sum.profit || 0,
        profitMargin: salesData._sum.total > 0 ? (salesData._sum.profit / salesData._sum.total) * 100 : 0
      },
      debt: {
        total: totalDebt
      },
      summary: {
        // Patrimonio neto = (Ventas + Valor inventario) - Deudas
        netWorth: ((salesData._sum.total || 0) + (stockValue._sum.costPriceTotal || 0)) - totalDebt
      }
    };

    res.json(balance);
  } catch (error) {
    console.error('Error en getGeneralBalance:', error);
    res.status(500).json({ error: 'Error al obtener el balance general' });
  }
}

module.exports = {
  getSalesReport,
  getTopProducts,
  getLowStockAlerts,
  getPaymentStatus,
  getGeneralBalance
};
