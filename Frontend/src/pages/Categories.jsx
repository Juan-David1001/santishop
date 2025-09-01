import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Cargar categorías
  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
      setError(null);
    } catch (err) {
      setError('Error al cargar categorías: ' + err.message);
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  // Cargar categorías al iniciar
  useEffect(() => {
    loadCategories();
  }, []);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar el envío del formulario para crear/editar
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        // Actualizar categoría existente
        await apiClient.put(`/categories/${editingCategory.id}`, formData);
        toast.success('Categoría actualizada exitosamente');
      } else {
        // Crear nueva categoría
        await apiClient.post('/categories', formData);
        toast.success('Categoría creada exitosamente');
      }
      
      // Limpiar formulario y recargar datos
      resetForm();
      loadCategories();
    } catch (err) {
      toast.error('Error: ' + err.response?.data?.error || err.message);
    }
  };

  // Iniciar edición de categoría
  const startEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setShowAddForm(true);
  };

  // Eliminar categoría
  const handleDelete = async (categoryId, categoryName) => {
    if (window.confirm(`¿Está seguro de eliminar la categoría "${categoryName}"? Esta acción no se puede deshacer.`)) {
      try {
        await apiClient.delete(`/categories/${categoryId}`);
        toast.success(`Categoría "${categoryName}" eliminada correctamente`);
        loadCategories();
      } catch (err) {
        toast.error('Error al eliminar: ' + err.response?.data?.error || err.message);
      }
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
    setEditingCategory(null);
    setShowAddForm(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Categorías</h1>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(!showAddForm);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          {showAddForm ? 'Cancelar' : 'Agregar Categoría'}
        </button>
      </div>

      {/* Formulario para agregar/editar categoría */}
      {showAddForm && (
        <div className="bg-white p-6 mb-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            {editingCategory ? 'Editar Categoría' : 'Agregar Nueva Categoría'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Nombre</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded p-2"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Descripción (Opcional)</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full border rounded p-2"
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              >
                {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de categorías */}
      {loading ? (
        <div className="text-center py-10">
          <p className="text-gray-600">Cargando categorías...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No hay categorías registradas. ¡Crea la primera!
                  </td>
                </tr>
              ) : (
                categories.map(category => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{category.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      {category.description || <span className="text-gray-400 italic">Sin descripción</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                        {category.productsCount || 0} productos
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => startEdit(category)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(category.id, category.name)}
                        className="text-red-600 hover:text-red-900"
                        disabled={category.productsCount > 0}
                        title={category.productsCount > 0 ? "No se puede eliminar una categoría con productos" : ""}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Categories;
