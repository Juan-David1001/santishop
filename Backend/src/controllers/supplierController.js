const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtener todos los proveedores
 */
exports.getAllSuppliers = async (req, res) => {
  try {
    const { 
      query = '', 
      page = 1, 
      limit = 10, 
      status,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const skip = (page - 1) * parseInt(limit);
    
    // Construir filtros
    const filters = {};
    if (status) filters.status = status;

    // Construir búsqueda
    const searchCondition = query 
      ? {
          OR: [
            { name: { contains: query } },
            { contactName: { contains: query } },
            { phone: { contains: query } },
            { email: { contains: query } },
            { taxId: { contains: query } }
          ]
        }
      : {};

    // Combinar filtros y búsqueda
    const whereCondition = {
      ...filters,
      ...searchCondition
    };

    // Obtener proveedores con paginación
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where: whereCondition,
        skip,
        take: parseInt(limit),
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.supplier.count({
        where: whereCondition
      })
    ]);

    return res.status(200).json({
      suppliers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      }
    });
  } catch (error) {
    console.error('Error getting suppliers:', error);
    return res.status(500).json({ 
      error: 'Error al obtener los proveedores' 
    });
  }
};

/**
 * Obtener un proveedor por su ID
 */
exports.getSupplierById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) }
    });

    if (!supplier) {
      return res.status(404).json({ 
        error: 'Proveedor no encontrado' 
      });
    }

    return res.status(200).json(supplier);
  } catch (error) {
    console.error('Error getting supplier:', error);
    return res.status(500).json({ 
      error: 'Error al obtener el proveedor' 
    });
  }
};

/**
 * Crear un nuevo proveedor
 */
exports.createSupplier = async (req, res) => {
  const { 
    name, 
    contactName, 
    phone, 
    email, 
    address, 
    taxId, 
    notes 
  } = req.body;

  // Validar campos requeridos
  if (!name) {
    return res.status(400).json({ 
      error: 'El nombre del proveedor es obligatorio' 
    });
  }

  try {
    // Verificar si ya existe un proveedor con el mismo taxId (si se proporcionó)
    if (taxId) {
      const existingSupplier = await prisma.supplier.findFirst({
        where: { taxId }
      });
      
      if (existingSupplier) {
        return res.status(400).json({ 
          error: 'Ya existe un proveedor con este ID fiscal/RFC' 
        });
      }
    }

    // Crear el proveedor
    const newSupplier = await prisma.supplier.create({
      data: {
        name,
        contactName,
        phone,
        email,
        address,
        taxId,
        notes,
        balance: 0, // Saldo inicial en 0
        status: 'active'
      }
    });

    return res.status(201).json(newSupplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    return res.status(500).json({ 
      error: 'Error al crear el proveedor' 
    });
  }
};

/**
 * Actualizar un proveedor existente
 */
exports.updateSupplier = async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    contactName, 
    phone, 
    email, 
    address, 
    taxId, 
    notes, 
    status 
  } = req.body;

  // Validar campos requeridos
  if (!name) {
    return res.status(400).json({ 
      error: 'El nombre del proveedor es obligatorio' 
    });
  }

  try {
    // Verificar que el proveedor existe
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingSupplier) {
      return res.status(404).json({ 
        error: 'Proveedor no encontrado' 
      });
    }

    // Verificar si ya existe otro proveedor con el mismo taxId (si se proporcionó)
    if (taxId && taxId !== existingSupplier.taxId) {
      const duplicateTaxId = await prisma.supplier.findFirst({
        where: { 
          taxId,
          NOT: {
            id: parseInt(id)
          }
        }
      });
      
      if (duplicateTaxId) {
        return res.status(400).json({ 
          error: 'Ya existe otro proveedor con este ID fiscal/RFC' 
        });
      }
    }

    // Actualizar el proveedor
    const updatedSupplier = await prisma.supplier.update({
      where: { id: parseInt(id) },
      data: {
        name,
        contactName,
        phone,
        email,
        address,
        taxId,
        notes,
        status: status || existingSupplier.status // Mantener el status actual si no se proporciona uno nuevo
      }
    });

    return res.status(200).json(updatedSupplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({ 
      error: 'Error al actualizar el proveedor' 
    });
  }
};

/**
 * Eliminar un proveedor
 */
exports.deleteSupplier = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar que el proveedor existe
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) },
      include: {
        purchases: true
      }
    });

    if (!supplier) {
      return res.status(404).json({ 
        error: 'Proveedor no encontrado' 
      });
    }

    // Verificar si tiene compras asociadas
    if (supplier.purchases && supplier.purchases.length > 0) {
      // En lugar de eliminar, marcar como inactivo
      await prisma.supplier.update({
        where: { id: parseInt(id) },
        data: { status: 'inactive' }
      });

      return res.status(200).json({
        message: 'Proveedor marcado como inactivo ya que tiene compras asociadas'
      });
    } else {
      // Si no tiene compras, se puede eliminar completamente
      await prisma.supplier.delete({
        where: { id: parseInt(id) }
      });

      return res.status(200).json({
        message: 'Proveedor eliminado correctamente'
      });
    }
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return res.status(500).json({ 
      error: 'Error al eliminar el proveedor' 
    });
  }
};

/**
 * Buscar proveedores
 */
exports.searchSuppliers = async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ 
      error: 'La consulta de búsqueda es obligatoria' 
    });
  }

  try {
    // Convertir a minúsculas para búsqueda insensible
    const searchLower = query.toLowerCase();

    // Buscar proveedores
    const suppliers = await prisma.supplier.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { contactName: { contains: query } },
          { phone: { contains: query } },
          { email: { contains: query } },
          { taxId: { contains: query } }
        ],
        status: 'active' // Solo buscar proveedores activos
      },
      take: 10 // Limitar resultados
    });
    
    // Filtrado adicional para búsquedas insensibles a mayúsculas/minúsculas
    const filteredSuppliers = suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(searchLower) ||
      (supplier.contactName && supplier.contactName.toLowerCase().includes(searchLower)) ||
      (supplier.phone && supplier.phone.includes(query)) ||
      (supplier.email && supplier.email.toLowerCase().includes(searchLower)) ||
      (supplier.taxId && supplier.taxId.toLowerCase().includes(searchLower))
    );

    return res.status(200).json({ suppliers: filteredSuppliers });
  } catch (error) {
    console.error('Error searching suppliers:', error);
    return res.status(500).json({ 
      error: 'Error al buscar proveedores' 
    });
  }
};

/**
 * Obtener la cuenta corriente (historial de compras y pagos) de un proveedor
 */
exports.getSupplierAccount = async (req, res) => {
  const { id } = req.params;

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) }
    });

    if (!supplier) {
      return res.status(404).json({ 
        error: 'Proveedor no encontrado' 
      });
    }

    // Obtener todas las compras del proveedor
    const purchases = await prisma.purchase.findMany({
      where: {
        supplierId: parseInt(id)
      },
      include: {
        payments: true,
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

    // Obtener todos los pagos realizados al proveedor
    const payments = await prisma.supplierPayment.findMany({
      where: {
        supplierId: parseInt(id)
      },
      include: {
        user: true,
        purchase: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calcular saldo pendiente
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const pendingBalance = totalPurchases - totalPayments;

    // Actualizar el saldo en la base de datos si ha cambiado
    if (pendingBalance !== supplier.balance) {
      await prisma.supplier.update({
        where: { id: parseInt(id) },
        data: { balance: pendingBalance }
      });
    }

    return res.status(200).json({
      supplier: {
        ...supplier,
        balance: pendingBalance
      },
      purchases,
      payments,
      summary: {
        totalPurchases,
        totalPayments,
        pendingBalance
      }
    });
  } catch (error) {
    console.error('Error getting supplier account:', error);
    return res.status(500).json({ 
      error: 'Error al obtener la cuenta del proveedor' 
    });
  }
};
