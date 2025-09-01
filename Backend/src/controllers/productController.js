const prisma = require('../config/db');
const { handleError } = require('../utils/helpers');
const { sendLowStockAlert } = require('../services/emailService');

/**
 * Obtiene la lista de productos con filtros opcionales
 */
const getProducts = async (req, res) => {
  try {
    const { 
      sku,
      name,
      categoryId,
      minStock,
      maxStock,
      minPrice,
      maxPrice,
      lowStock,
      page = '1',
      limit = '10',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;
    
    // Construir condiciones de filtro
    const where = {};
    
    if (sku) {
      where.sku = { contains: sku };
    }
    
    if (name) {
      where.name = { contains: name };
    }
    
    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }
    
    // Filtros para stock
    if (minStock || maxStock) {
      where.stock = {};
      if (minStock) {
        where.stock.gte = parseInt(minStock);
      }
      if (maxStock) {
        where.stock.lte = parseInt(maxStock);
      }
    }
    
    // Filtros para precios
    if (minPrice || maxPrice) {
      where.sellingPrice = {};
      if (minPrice) {
        where.sellingPrice.gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        where.sellingPrice.lte = parseFloat(maxPrice);
      }
    }
    
    // Filtro para productos con stock bajo
    if (lowStock === 'true') {
      // Productos donde el stock es menor o igual al stock mínimo
      where.stock = {
        ...where.stock,
        lte: prisma.product.fields.minimumStock
      };
    }
    
    // Convertir parámetros de paginación a números
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Consultar total de productos que cumplen con los filtros
    const totalCount = await prisma.product.count({ where });
    
    // Consultar productos con paginación
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take: limitNum
    });
    
    // Calcular totales para informe de valorización
    const inventoryValuation = await prisma.product.aggregate({
      where,
      _sum: {
        costPrice: true,
        sellingPrice: true
      }
    });
    
    // Calcular valor total del inventario (costo y precio de venta)
    const totalCostValue = products.reduce(
      (sum, product) => sum + (product.costPrice * product.stock), 
      0
    );
    
    const totalSellingValue = products.reduce(
      (sum, product) => sum + (product.sellingPrice * product.stock), 
      0
    );
    
    // Calcular margen potencial
    const potentialProfit = totalSellingValue - totalCostValue;
    const potentialProfitMargin = totalCostValue > 0 
      ? (potentialProfit / totalCostValue) * 100 
      : 0;
    
    res.json({
      products,
      valuation: {
        totalCostValue,
        totalSellingValue,
        potentialProfit,
        potentialProfitMargin
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Crea un nuevo producto
 */
const createProduct = async (req, res) => {
  try {
    const { 
      sku, 
      name, 
      description, 
      costPrice, 
      sellingPrice, 
      stock, 
      minimumStock, 
      categoryId, 
      userId 
    } = req.body;
    
    // Verificar que la categoría existe
    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) }
    });
    
    if (!category) {
      return res.status(400).json({ error: 'La categoría especificada no existe' });
    }
    
    // Crear el producto
    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        costPrice: parseFloat(costPrice),
        sellingPrice: parseFloat(sellingPrice),
        stock: parseInt(stock) || 0,
        minimumStock: parseInt(minimumStock) || 5,
        categoryId: parseInt(categoryId),
        userId: userId ? parseInt(userId) : null
      },
      include: {
        category: true,
        user: true
      }
    });
    
    // Crear registro de movimiento de stock inicial si hay stock
    if (parseInt(stock) > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: parseInt(stock),
          type: 'entrada',
          reference: 'Inventario inicial',
          notes: 'Creación del producto'
        }
      });
    }
    
    // Verificar si el stock está por debajo del mínimo para enviar alerta
    if (product.stock <= product.minimumStock) {
      try {
        await sendLowStockAlert(product);
      } catch (emailError) {
        console.error('Error al enviar alerta de stock bajo:', emailError);
        // No detenemos el flujo por un error en el envío del correo
      }
    }
    
    res.status(201).json(product);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene un producto por su ID
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true
          }
        },
        stockMovements: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json(product);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Actualiza un producto existente
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      sku, 
      name, 
      description, 
      costPrice, 
      sellingPrice, 
      minimumStock, 
      categoryId, 
      userId 
    } = req.body;
    
    // Nota: No permitimos actualizar el stock directamente, debe hacerse a través de movimientos
    
    // Verificar que la categoría existe si se está actualizando
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) }
      });
      
      if (!category) {
        return res.status(400).json({ error: 'La categoría especificada no existe' });
      }
    }
    
    // Actualizar el producto
    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        sku,
        name,
        description,
        costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
        sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : undefined,
        minimumStock: minimumStock !== undefined ? parseInt(minimumStock) : undefined,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        userId: userId ? parseInt(userId) : undefined
      },
      include: {
        category: true
      }
    });
    
    res.json(product);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Elimina un producto
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay ventas asociadas a este producto
    const salesCount = await prisma.saleItem.count({
      where: { productId: parseInt(id) }
    });
    
    if (salesCount > 0) {
      return res.status(400).json({
        error: `No se puede eliminar el producto porque tiene ${salesCount} ventas asociadas`
      });
    }
    
    // Eliminar movimientos de stock asociados al producto
    await prisma.stockMovement.deleteMany({
      where: { productId: parseInt(id) }
    });
    
    // Eliminar el producto
    await prisma.product.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Registra un nuevo movimiento de stock para un producto
 */
const addStockMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, reference, notes } = req.body;
    
    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true
      }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    // Validar que el tipo de movimiento sea válido
    const validTypes = ['entrada', 'salida', 'ajuste', 'venta'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Tipo de movimiento no válido. Debe ser uno de: ${validTypes.join(', ')}`
      });
    }
    
    // Validar la cantidad según el tipo de movimiento
    const quantityValue = parseInt(quantity);
    
    // Para salidas y ventas, verificar que haya stock suficiente
    if ((type === 'salida' || type === 'venta') && product.stock < quantityValue) {
      return res.status(400).json({
        error: `Stock insuficiente. Stock actual: ${product.stock}, Cantidad solicitada: ${quantityValue}`
      });
    }
    
    // Calcular nuevo stock según el tipo de movimiento
    let newStock;
    let movementQuantity;
    
    switch (type) {
      case 'entrada':
        newStock = product.stock + quantityValue;
        movementQuantity = quantityValue;
        break;
      case 'salida':
      case 'venta':
        newStock = product.stock - quantityValue;
        movementQuantity = -quantityValue;
        break;
      case 'ajuste':
        newStock = quantityValue;
        movementQuantity = quantityValue - product.stock;
        break;
    }
    
    // Registrar el movimiento de stock
    const stockMovement = await prisma.stockMovement.create({
      data: {
        productId: parseInt(id),
        quantity: movementQuantity,
        type,
        reference,
        notes
      }
    });
    
    // Actualizar el stock del producto
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { stock: newStock },
      include: {
        category: true
      }
    });
    
    // Verificar si el stock está por debajo del mínimo para enviar alerta
    if (updatedProduct.stock <= updatedProduct.minimumStock) {
      try {
        await sendLowStockAlert(updatedProduct);
      } catch (emailError) {
        console.error('Error al enviar alerta de stock bajo:', emailError);
        // No detenemos el flujo por un error en el envío del correo
      }
    }
    
    res.status(201).json({
      stockMovement,
      product: updatedProduct
    });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene el historial de movimientos de stock de un producto
 */
const getStockMovements = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query;
    
    // Convertir parámetros de paginación a números
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    // Contar total de movimientos
    const totalCount = await prisma.stockMovement.count({
      where: { productId: parseInt(id) }
    });
    
    // Obtener movimientos con paginación
    const movements = await prisma.stockMovement.findMany({
      where: { productId: parseInt(id) },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });
    
    res.json({
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        stock: product.stock
      },
      movements,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene un reporte de valorización de inventario
 */
const getInventoryValuation = async (req, res) => {
  try {
    const { categoryId } = req.query;
    
    // Filtro por categoría si se proporciona
    const where = categoryId ? { categoryId: parseInt(categoryId) } : {};
    
    // Obtener todos los productos para el cálculo
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true
      }
    });
    
    // Calcular valorización por producto
    const productValuations = products.map(product => {
      const costValue = product.costPrice * product.stock;
      const sellingValue = product.sellingPrice * product.stock;
      const potentialProfit = sellingValue - costValue;
      const profitMargin = costValue > 0 ? (potentialProfit / costValue) * 100 : 0;
      
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        category: product.category.name,
        stock: product.stock,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        costValue,
        sellingValue,
        potentialProfit,
        profitMargin
      };
    });
    
    // Calcular totales generales
    const totalCostValue = productValuations.reduce((sum, item) => sum + item.costValue, 0);
    const totalSellingValue = productValuations.reduce((sum, item) => sum + item.sellingValue, 0);
    const totalPotentialProfit = totalSellingValue - totalCostValue;
    const overallProfitMargin = totalCostValue > 0 
      ? (totalPotentialProfit / totalCostValue) * 100 
      : 0;
    
    // Agrupar por categoría para totales por categoría
    const categorySummary = productValuations.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = {
          category: item.category,
          productCount: 0,
          totalStock: 0,
          costValue: 0,
          sellingValue: 0,
          potentialProfit: 0
        };
      }
      
      acc[item.category].productCount += 1;
      acc[item.category].totalStock += item.stock;
      acc[item.category].costValue += item.costValue;
      acc[item.category].sellingValue += item.sellingValue;
      acc[item.category].potentialProfit += item.potentialProfit;
      
      return acc;
    }, {});
    
    // Convertir a array y calcular porcentajes
    const categoryValuations = Object.values(categorySummary).map(cat => ({
      ...cat,
      profitMargin: cat.costValue > 0 ? (cat.potentialProfit / cat.costValue) * 100 : 0,
      percentageOfTotal: totalCostValue > 0 ? (cat.costValue / totalCostValue) * 100 : 0
    }));
    
    res.json({
      summary: {
        totalProducts: products.length,
        totalCostValue,
        totalSellingValue,
        totalPotentialProfit,
        overallProfitMargin
      },
      categoryValuations,
      productValuations
    });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene productos con stock bajo
 */
const getLowStockProducts = async (req, res) => {
  try {
    // Productos con stock <= minimumStock
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: {
          lte: prisma.product.fields.minimumStock
        }
      },
      include: {
        category: true
      },
      orderBy: [
        // Ordenar primero por los que tienen menor stock relativo al mínimo
        {
          stock: 'asc'
        }
      ]
    });
    
    // Agregar datos adicionales para ayudar en la toma de decisiones
    const productsWithAlertData = lowStockProducts.map(product => {
      const stockDifference = product.minimumStock - product.stock;
      const stockPercentage = product.minimumStock > 0 
        ? (product.stock / product.minimumStock) * 100 
        : 0;
      const alertLevel = stockPercentage <= 0 
        ? 'critical' 
        : stockPercentage < 50 
          ? 'high' 
          : 'moderate';
          
      return {
        ...product,
        stockDifference,
        stockPercentage,
        alertLevel
      };
    });
    
    res.json({
      count: productsWithAlertData.length,
      products: productsWithAlertData
    });
  } catch (error) {
    handleError(error, res);
  }
};

module.exports = {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  addStockMovement,
  getStockMovements,
  getInventoryValuation,
  getLowStockProducts
};
