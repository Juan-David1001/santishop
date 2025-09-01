const prisma = require('../config/db');
const { handleError } = require('../utils/helpers');

/**
 * Obtiene todos los usuarios
 */
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' }
    });
    
    res.json(users);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Crea un nuevo usuario
 */
const createUser = async (req, res) => {
  try {
    const { name, username } = req.body;
    
    const user = await prisma.user.create({
      data: { name, username }
    });
    
    res.status(201).json(user);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Obtiene un usuario por ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Actualiza un usuario
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username } = req.body;
    
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { name, username }
    });
    
    res.json(user);
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * Elimina un usuario
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay dependencias
    const hasShifts = await prisma.shift.count({ 
      where: { userId: parseInt(id) } 
    });
    
    const hasSales = await prisma.sale.count({ 
      where: { userId: parseInt(id) } 
    });
    
    if (hasShifts > 0 || hasSales > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el usuario porque tiene turnos o ventas asociados' 
      });
    }
    
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
};

module.exports = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser
};
