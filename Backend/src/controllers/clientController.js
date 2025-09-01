const prisma = require('../config/db');
const { handleError } = require('../utils/helpers');

/**
 * Obtiene la lista de clientes con filtros opcionales
 */
const getClients = async (req, res) => {
  try {
    const { 
      name,
      document,
      email,
      phone,
      sortBy = 'name',
      sortOrder = 'asc',
      page = '1',
      limit = '10'
    } = req.query;
    
    // Convertir parámetros de paginación a números
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Construir condiciones de filtro
    const where = {};
    
    if (name) {
      where.name = { contains: name };
    }
    
    if (document) {
      where.document = { contains: document };
    }
    
    if (email) {
      where.email = { contains: email };
    }
    
    if (phone) {
      where.phone = { contains: phone };
    }
    
    // Contar total de clientes que cumplen con los filtros
    const totalCount = await prisma.client.count({ where });
    
    // Consultar clientes con paginación
    const clients = await prisma.client.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take: limitNum,
      include: {
        _count: {
          select: {
            sales: true
          }
        }
      }
    });
    
    res.json({
      clients,
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
 * Busca clientes para selección rápida en punto de venta
 */
const searchClients = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ clients: [] });
    }
    
    // Convertir a minúsculas para búsqueda insensible a mayúsculas/minúsculas
    const searchLower = query.toLowerCase();
    
    // Buscar por nombre, documento o teléfono
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { document: { contains: query } },
          { phone: { contains: query } },
          { email: { contains: query } }
        ]
      },
      take: 10,
      orderBy: { name: 'asc' }
    });
    
    // Filtrado adicional para búsquedas insensibles a mayúsculas/minúsculas
    const filteredClients = clients.filter(client => 
      client.name.toLowerCase().includes(searchLower) ||
      (client.document && client.document.includes(query)) ||
      (client.phone && client.phone.includes(query)) ||
      (client.email && client.email.toLowerCase().includes(searchLower))
    );
    
    res.json({ clients: filteredClients });
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Crea un nuevo cliente
 */
const createClient = async (req, res) => {
  try {
    const { name, email, phone, document, address } = req.body;
    
    // Verificar si ya existe un cliente con el mismo documento
    if (document) {
      const existingClient = await prisma.client.findFirst({
        where: { document }
      });
      
      if (existingClient) {
        return res.status(400).json({ error: 'Ya existe un cliente con este documento' });
      }
    }
    
    // Crear nuevo cliente
    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        document,
        address
      }
    });
    
    res.status(201).json(client);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene un cliente por su ID
 */
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: {
        sales: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            saleItems: {
              include: {
                product: true
              }
            },
            payments: true
          }
        },
        _count: {
          select: {
            sales: true
          }
        }
      }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    res.json(client);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Actualiza un cliente existente
 */
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, document, address } = req.body;
    
    // Verificar si ya existe otro cliente con el mismo documento
    if (document) {
      const existingClient = await prisma.client.findFirst({
        where: {
          document,
          NOT: {
            id: parseInt(id)
          }
        }
      });
      
      if (existingClient) {
        return res.status(400).json({ error: 'Ya existe otro cliente con este documento' });
      }
    }
    
    // Actualizar cliente
    const client = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        phone,
        document,
        address
      }
    });
    
    res.json(client);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Elimina un cliente
 */
const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si tiene ventas asociadas
    const salesCount = await prisma.sale.count({
      where: { clientId: parseInt(id) }
    });
    
    if (salesCount > 0) {
      return res.status(400).json({
        error: `No se puede eliminar el cliente porque tiene ${salesCount} ventas asociadas`
      });
    }
    
    // Eliminar cliente
    await prisma.client.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene el historial de ventas de un cliente
 */
const getClientSalesHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '10' } = req.query;
    
    // Convertir parámetros de paginación a números
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      select: { name: true }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    // Contar total de ventas del cliente
    const totalCount = await prisma.sale.count({
      where: { clientId: parseInt(id) }
    });
    
    // Obtener ventas con paginación
    const sales = await prisma.sale.findMany({
      where: { clientId: parseInt(id) },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        saleItems: {
          include: {
            product: true
          }
        },
        payments: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });
    
    // Calcular estadísticas adicionales
    const totalSpent = await prisma.sale.aggregate({
      where: { 
        clientId: parseInt(id),
        status: 'completed'
      },
      _sum: {
        amount: true
      }
    });
    
    const pointsStats = await prisma.sale.aggregate({
      where: { clientId: parseInt(id) },
      _sum: {
        pointsEarned: true,
        pointsRedeemed: true
      }
    });
    
    res.json({
      client: {
        id: parseInt(id),
        name: client.name
      },
      sales,
      stats: {
        totalSales: totalCount,
        totalSpent: totalSpent._sum.amount || 0,
        pointsEarned: pointsStats._sum.pointsEarned || 0,
        pointsRedeemed: pointsStats._sum.pointsRedeemed || 0,
        availablePoints: (pointsStats._sum.pointsEarned || 0) - (pointsStats._sum.pointsRedeemed || 0)
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
 * Actualiza los puntos de un cliente manualmente
 */
const updateClientPoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { points, reason } = req.body;
    
    if (!points || isNaN(parseInt(points))) {
      return res.status(400).json({ error: 'Se debe especificar una cantidad válida de puntos' });
    }
    
    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    const pointsToAdd = parseInt(points);
    
    // Actualizar puntos del cliente
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        totalPoints: client.totalPoints + pointsToAdd
      }
    });
    
    res.json({
      client: updatedClient,
      message: `Se han ${pointsToAdd >= 0 ? 'añadido' : 'restado'} ${Math.abs(pointsToAdd)} puntos al cliente`
    });
  } catch (error) {
    handleError(error, res);
  }
};

module.exports = {
  getClients,
  searchClients,
  createClient,
  getClientById,
  updateClient,
  deleteClient,
  getClientSalesHistory,
  updateClientPoints
};
