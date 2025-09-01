import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
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

  // Cargar productos de una categoría
  const loadCategoryProducts = async (categoryId) => {
    setLoadingProducts(true);
    try {
      // Buscar productos por categoría
      const response = await apiClient.get(`/products?categoryId=${categoryId}`);
      setCategoryProducts(response.data.products);
      
      // Actualizar la categoría seleccionada
      const category = categories.find(cat => cat.id === categoryId);
      setSelectedCategory(category);
    } catch (err) {
      toast.error('Error al cargar productos de la categoría');
      setCategoryProducts([]);
    } finally {
      setLoadingProducts(false);
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
  
  // Cerrar detalles de la categoría
  const closeProductDetails = () => {
    setSelectedCategory(null);
    setCategoryProducts([]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-700 rounded-lg shadow-lg mr-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Categorías</h1>
            <p className="text-sm text-slate-500">Administre categorías y vea productos asociados</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(!showAddForm);
          }}
          className={`flex items-center gap-2 px-5 py-3.5 rounded-xl shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 ${showAddForm ? 'bg-gradient-to-r from-slate-600 to-slate-700' : 'bg-gradient-to-r from-violet-600 to-fuchsia-700'} text-white font-medium`}
        >
          {showAddForm ? (
            <>
              <span className="bg-white/20 p-1.5 rounded-lg shadow-inner mr-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </span>
              <span className="font-semibold">Cancelar</span>
            </>
          ) : (
            <>
              <span className="bg-white/20 p-1.5 rounded-lg shadow-inner mr-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </span>
              <span className="font-semibold">Agregar Categoría</span>
            </>
          )}
        </button>
      </div>

      {/* Formulario para agregar/editar categoría */}
      {showAddForm && (
        <div className="bg-white p-8 mb-8 rounded-xl shadow-lg border border-slate-100">
          <div className="flex items-center mb-6 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
              <svg className="w-5 h-5 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                {editingCategory ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                )}
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-slate-800">
              {editingCategory ? 'Editar Categoría' : 'Agregar Nueva Categoría'}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                Nombre
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 shadow-md"
                required
                placeholder="Nombre de la categoría"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
                  </svg>
                </div>
                Descripción (Opcional)
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 shadow-md"
                placeholder="Descripción breve de la categoría"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-4 mt-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl shadow transition-all duration-200 border border-slate-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  {editingCategory ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  )}
                </svg>
                {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de categorías */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-md border border-slate-100">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 mb-4 rounded-full bg-violet-200"></div>
            <p className="text-slate-600 font-medium">Cargando categorías...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-xl shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-red-500 text-2xl">⚠️</span>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl">
          <table className="min-w-full bg-white shadow-lg">
            <thead>
              <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Productos</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center">
                      <div className="bg-violet-50 p-3 rounded-full mb-3">
                        <svg className="w-6 h-6 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                        </svg>
                      </div>
                      <p className="text-slate-600 font-medium mb-1">No hay categorías registradas</p>
                      <p className="text-slate-400 text-sm">¡Crea la primera para comenzar a organizar tus productos!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                categories.map(category => (
                  <tr key={category.id} className="hover:bg-violet-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800 flex items-center">
                        <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                          </svg>
                        </div>
                        {category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {category.description ? 
                        <p className="text-slate-600">{category.description}</p> : 
                        <span className="text-slate-400 italic text-sm">Sin descripción</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <button
                          onClick={() => category.productsCount > 0 && loadCategoryProducts(category.id)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium shadow-sm ${
                            category.productsCount > 0 
                            ? 'bg-gradient-to-r from-violet-50 to-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 hover:shadow-md cursor-pointer transition-all' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200 cursor-default'
                          }`}
                          disabled={category.productsCount === 0}
                        >
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m8 4v10M4 7v10l8 4"></path>
                          </svg>
                          {category.productsCount || 0} producto{category.productsCount !== 1 ? 's' : ''}
                          {category.productsCount > 0 && (
                            <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => startEdit(category)}
                          className="p-1.5 bg-gradient-to-r from-violet-50 to-violet-100 rounded-lg text-violet-700 hover:shadow-md border border-violet-200 transition-all transform hover:-translate-y-0.5 flex items-center"
                          title="Editar categoría"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(category.id, category.name)}
                          className={`p-1.5 rounded-lg flex items-center transition-all transform hover:-translate-y-0.5 ${
                            category.productsCount > 0 
                            ? 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-red-50 to-red-100 text-red-600 hover:shadow-md border border-red-200'
                          }`}
                          disabled={category.productsCount > 0}
                          title={category.productsCount > 0 ? "No se puede eliminar una categoría con productos" : "Eliminar categoría"}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Sección para mostrar productos de la categoría seleccionada */}
      {selectedCategory && (
        <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-slate-100">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
            <div className="flex items-center">
              <div className="p-2.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
                <svg className="w-5 h-5 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m8 4v10M4 7v10l8 4"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-800">
                  Productos en categoría: {selectedCategory.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedCategory.productsCount || 0} productos encontrados
                </p>
              </div>
            </div>
            <button
              onClick={closeProductDetails}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all border border-slate-200 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Cerrar
            </button>
          </div>
          
          {loadingProducts ? (
            <div className="animate-pulse flex flex-col items-center py-10">
              <div className="h-8 w-8 mb-4 rounded-full bg-violet-200"></div>
              <p className="text-slate-600 font-medium">Cargando productos...</p>
            </div>
          ) : categoryProducts.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="bg-slate-100 p-3 rounded-full mb-3">
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
              <p className="text-slate-600 mb-1">No hay productos en esta categoría</p>
              <p className="text-slate-400 text-sm mb-4">La categoría existe pero no tiene productos asociados</p>
              <Link 
                to="/inventory" 
                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Ir al inventario
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Precio</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {categoryProducts.map(product => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{product.sku}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">{product.name}</span>
                          {product.description && (
                            <span className="text-xs text-slate-500 mt-1 line-clamp-1">{product.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${
                            product.stock <= product.minimumStock
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : product.stock <= product.minimumStock * 1.5
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {product.stock}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-block font-medium text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-200 shadow-sm">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.sellingPrice)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/products/${product.id}`}
                          className="p-1.5 bg-gradient-to-r from-violet-50 to-violet-100 rounded-lg text-violet-700 hover:shadow-md border border-violet-200 transition-all transform hover:-translate-y-0.5 inline-flex items-center"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                          <span className="ml-1 text-xs">Ver</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Categories;
