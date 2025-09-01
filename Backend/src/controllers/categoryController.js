const prisma = require('../config/db');
const { handleError } = require('../utils/helpers');
const { sendLowStockAlert } = require('../services/emailService');

/**
 * Obtiene la lista de categorías
 */
const getCategories = async (req, res) => {
  try {
    // Primero obtener las categorías
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });
    
    // Transformar el resultado para incluir productsCount de manera explícita
    const categoriesWithCounts = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      productsCount: category._count.products
    }));
    
    res.json(categoriesWithCounts);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Crea una nueva categoría
 */
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const category = await prisma.category.create({
      data: { name, description }
    });
    
    res.status(201).json(category);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Actualiza una categoría existente
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { name, description }
    });
    
    res.json(category);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Elimina una categoría
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay productos asociados a esta categoría
    const productsCount = await prisma.product.count({
      where: { categoryId: parseInt(id) }
    });
    
    if (productsCount > 0) {
      return res.status(400).json({
        error: `No se puede eliminar la categoría porque tiene ${productsCount} productos asociados`
      });
    }
    
    await prisma.category.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene una categoría por su ID
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      include: {
        products: true
      }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    res.json(category);
  } catch (error) {
    handleError(error, res);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById
};
