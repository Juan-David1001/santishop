import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient';
// Importando iconos para mejorar la UI
import { RiAddLine, RiSearchLine, RiEditLine, RiDeleteBin6Line, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri';

function Inventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    lowStock: false
  });
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    description: '',
    costPrice: '',
    sellingPrice: '',
    stock: '',
    minimumStock: '5',
    categoryId: ''
  });
  const [valuation, setValuation] = useState({
    totalCostValue: 0,
    totalSellingValue: 0,
    potentialProfit: 0,
    potentialProfitMargin: 0
  });

  // Función para cargar productos
  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage);
      
      if (filters.search) {
        // La API espera un único parámetro 'search' que buscará en nombre y SKU
        params.append('search', filters.search);
      }
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.lowStock) params.append('lowStock', 'true');
      
      const response = await apiClient.get(`/products?${params.toString()}`);
      setProducts(response.data.products);
      setValuation(response.data.valuation);
      setTotalPages(response.data.pagination.totalPages);
      setError(null);
    } catch (err) {
      setError('Error al cargar productos: ' + err.message);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar categorías
  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
      toast.error('Error al cargar categorías');
    }
  };

  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadCategories();
  }, []);

  // Efecto para cargar productos cuando cambia la página
  useEffect(() => {
    loadProducts();
  }, [currentPage]);
  
  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadProducts();
  }, []);

  // Función para manejar el cambio de filtros
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Función para aplicar los filtros y buscar
  const applyFilters = (e) => {
    if (e) e.preventDefault();
    
    // Construir mensaje informativo basado en los filtros aplicados
    let appliedFilters = [];
    if (filters.search) appliedFilters.push(`"${filters.search}" (nombre/SKU)`);
    if (filters.categoryId) {
      const categoryName = categories.find(c => c.id === parseInt(filters.categoryId))?.name;
      if (categoryName) appliedFilters.push(`categoría "${categoryName}"`);
    }
    if (filters.lowStock) appliedFilters.push("productos con stock bajo");
    
    setCurrentPage(1); // Reset a la primera página al aplicar filtros
    loadProducts(); // Recargar productos con los filtros actuales
    
    if (appliedFilters.length > 0) {
      toast.success(`Buscando ${appliedFilters.join(', ')}`, {
        icon: '🔍',
        duration: 3000
      });
    } else {
      toast.success('Mostrando todos los productos', {
        icon: '📦',
        duration: 2000
      });
    }
  };
  
  // Función para reiniciar los filtros
  const resetFilters = () => {
    // Verificar si hay filtros activos antes de reiniciar
    const hasActiveFilters = filters.search || filters.categoryId || filters.lowStock;
    
    setFilters({
      search: '',
      categoryId: '',
      lowStock: false
    });
    
    setCurrentPage(1);
    
    // Solo mostrar toast si había filtros activos
    if (hasActiveFilters) {
      toast.success('Filtros reiniciados. Mostrando todos los productos', {
        icon: '🔄',
        duration: 2000
      });
      
      // Recargar productos después de un pequeño delay para que se vea la transición
      setTimeout(() => {
        loadProducts();
      }, 100);
    } else {
      loadProducts();
    }
  };

  // Función para manejar el cambio en el formulario de nuevo producto
  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para agregar un nuevo producto
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/products', newProduct);
      toast.success(`Producto ${response.data.name} creado exitosamente`);
      setNewProduct({
        sku: '',
        name: '',
        description: '',
        costPrice: '',
        sellingPrice: '',
        stock: '',
        minimumStock: '5',
        categoryId: ''
      });
      setShowAddProduct(false);
      loadProducts();
    } catch (err) {
      toast.error('Error al crear producto: ' + err.response?.data?.error || err.message);
    }
  };

  // Función para agregar o quitar stock
  const handleStockMovement = async (productId, type, quantity) => {
    try {
      await apiClient.post(`/products/${productId}/stock-movements`, {
        quantity,
        type,
        reference: `Ajuste manual`,
        notes: `Ajuste manual realizado desde la interfaz`
      });
      toast.success('Movimiento de stock registrado correctamente');
      loadProducts();
    } catch (err) {
      toast.error('Error al actualizar stock: ' + err.response?.data?.error || err.message);
    }
  };

  // Función para eliminar un producto
  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`¿Está seguro de eliminar el producto "${productName}"?`)) {
      try {
        await apiClient.delete(`/products/${productId}`);
        toast.success(`Producto "${productName}" eliminado correctamente`);
        loadProducts();
      } catch (err) {
        toast.error('Error al eliminar producto: ' + err.response?.data?.error || err.message);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-700 rounded-lg shadow-lg mr-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m8 4v10M4 7v10l8 4"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Inventario</h1>
            <p className="text-sm text-slate-500">Administre productos, stock y categorías</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddProduct(!showAddProduct)}
          className={`flex items-center gap-2 px-5 py-3.5 rounded-xl shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 ${showAddProduct ? 'bg-gradient-to-r from-slate-600 to-slate-700' : 'bg-gradient-to-r from-violet-600 to-fuchsia-700'} text-white font-medium`}
        >
          {showAddProduct ? (
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
                <RiAddLine className="text-white" size={14} />
              </span>
              <span className="font-semibold">Agregar Producto</span>
            </>
          )}
        </button>
      </div>

      {/* Formulario para agregar producto */}
      {showAddProduct && (
        <div className="bg-white p-8 mb-8 rounded-xl shadow-lg border border-slate-100">
          <div className="flex items-center mb-6 pb-3 border-b border-slate-100">
            <div className="p-2.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
              <RiAddLine className="text-fuchsia-600" size={20} />
            </div>
            <h2 className="text-2xl font-semibold text-slate-800">Agregar Nuevo Producto</h2>
          </div>
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                  </svg>
                </div>
                SKU
              </label>
              <input
                type="text"
                name="sku"
                value={newProduct.sku}
                onChange={handleProductFormChange}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 shadow-md"
                required
              />
            </div>
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
                value={newProduct.name}
                onChange={handleProductFormChange}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 shadow-md"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
                  </svg>
                </div>
                Descripción
              </label>
              <textarea
                name="description"
                value={newProduct.description}
                onChange={handleProductFormChange}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 shadow-md"
                rows="3"
              ></textarea>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-blue-600 rounded-lg mr-2 shadow-inner">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                Costo Unitario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-slate-500">$</span>
                </div>
                <input
                  type="number"
                  name="costPrice"
                  value={newProduct.costPrice}
                  onChange={handleProductFormChange}
                  className="w-full pl-8 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 shadow-md"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4m9-1.5a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                Precio de Venta
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-slate-500">$</span>
                </div>
                <input
                  type="number"
                  name="sellingPrice"
                  value={newProduct.sellingPrice}
                  onChange={handleProductFormChange}
                  className="w-full pl-8 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 shadow-md"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-emerald-600 rounded-lg mr-2 shadow-inner">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m8 4v10M4 7v10l8 4"></path>
                  </svg>
                </div>
                Stock Inicial
              </label>
              <input
                type="number"
                name="stock"
                value={newProduct.stock}
                onChange={handleProductFormChange}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 shadow-md"
                min="0"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-amber-600 rounded-lg mr-2 shadow-inner">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                </div>
                Stock Mínimo (Alerta)
              </label>
              <input
                type="number"
                name="minimumStock"
                value={newProduct.minimumStock}
                onChange={handleProductFormChange}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 shadow-md"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                  </svg>
                </div>
                Categoría
              </label>
              <div className="relative">
                <select
                  name="categoryId"
                  value={newProduct.categoryId}
                  onChange={handleProductFormChange}
                  className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 shadow-md appearance-none"
                  required
                >
                  <option value="">Seleccione una categoría</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white py-3 px-8 rounded-xl shadow-lg hover:shadow-xl hover:from-violet-600 hover:to-fuchsia-700 font-medium transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
              >
                <span className="bg-white/20 p-1.5 rounded-lg shadow-inner mr-1">
                  <RiAddLine className="text-white" size={14} />
                </span>
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-6 mb-8 rounded-xl shadow-lg border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="p-2.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
              <RiSearchLine className="text-fuchsia-600" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Filtros de Búsqueda</h2>
          </div>
          <button 
            onClick={resetFilters}
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 hover:text-slate-800 rounded-lg transition-all shadow hover:shadow-md border border-slate-200 transform hover:-translate-y-0.5"
          >
            <span className="bg-slate-300/50 p-1.5 rounded-lg shadow-inner">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </span>
            <span className="font-medium">Reiniciar filtros</span>
          </button>
        </div>
        <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Filtro por Nombre/SKU */}
          <div className="p-5 bg-gradient-to-br from-white to-violet-50/30 rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1">
            <label className="block mb-3 text-sm font-medium text-slate-700 flex items-center">
              <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                <RiSearchLine size={14} />
              </div>
              Nombre o SKU
            </label>
            <div className="relative">
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                className="w-full pl-10 border border-slate-200 rounded-xl p-3.5 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 shadow-md"
                placeholder="Buscar por nombre o SKU"
              />
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-400" size={18} />
            </div>
            {filters.search && (
              <div className="mt-2 flex">
                <span className="inline-flex items-center gap-1 text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-md">
                  Buscando: "{filters.search}"
                  <button 
                    type="button"
                    className="hover:text-violet-900" 
                    onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* Filtro por Categoría */}
          <div className="p-5 bg-gradient-to-br from-white to-fuchsia-50/30 rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1">
            <label className="block mb-3 text-sm font-medium text-slate-700 flex items-center">
              <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
              </div>
              Categoría
            </label>
            <div className="relative">
              <select
                name="categoryId"
                value={filters.categoryId}
                onChange={handleFilterChange}
                className="w-full border border-slate-200 rounded-xl p-3.5 pl-4 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 bg-white shadow-md appearance-none"
              >
                <option value="">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-fuchsia-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {filters.categoryId && (
              <div className="mt-2 flex">
                <span className="inline-flex items-center gap-1 text-xs bg-fuchsia-100 text-fuchsia-700 px-2 py-1 rounded-md">
                  Categoría: {categories.find(c => c.id === parseInt(filters.categoryId))?.name || filters.categoryId}
                  <button 
                    type="button"
                    className="hover:text-fuchsia-900" 
                    onClick={() => setFilters(prev => ({ ...prev, categoryId: '' }))}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* Filtro por Stock */}
          <div className="p-5 bg-gradient-to-br from-white to-amber-50/30 rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1">
            <label className="block mb-3 text-sm font-medium text-slate-700 flex items-center">
              <div className="p-1.5 bg-gradient-to-r from-amber-100 to-amber-200 text-amber-600 rounded-lg mr-2 shadow-inner">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              Filtrar por Stock
            </label>
            <div className={`flex items-center p-4 border border-slate-200 rounded-xl shadow-sm bg-white hover:shadow-md transition-all ${filters.lowStock ? 'bg-amber-50 border-amber-200' : ''}`}>
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  id="lowStock"
                  name="lowStock"
                  checked={filters.lowStock}
                  onChange={handleFilterChange}
                  className="w-5 h-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 focus:ring-offset-1 cursor-pointer"
                />
                <label htmlFor="lowStock" className="ml-2.5 text-slate-700 cursor-pointer select-none flex items-center">
                  <span className="font-medium">Mostrar solo productos con stock bajo</span>
                  {filters.lowStock && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>
                      Activo
                    </span>
                  )}
                </label>
              </div>
            </div>
          </div>
          <div className="md:col-span-3 mt-5 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-violet-600 hover:to-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transform hover:-translate-y-1 transition-all"
            >
              <span className="bg-white/20 p-1.5 rounded-lg shadow-inner mr-1.5">
                <RiSearchLine className="text-white" size={16} />
              </span>
              <span className="font-semibold">Aplicar Filtros</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tarjetas de valorización */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl mr-4 shadow-inner">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-sm text-slate-500 font-medium uppercase tracking-wide">Valor de Costo Total</h3>
              <p className="text-2xl font-bold text-blue-700 mt-1">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(valuation.totalCostValue)}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl mr-4 shadow-inner">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-sm text-slate-500 font-medium uppercase tracking-wide">Valor de Venta Total</h3>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(valuation.totalSellingValue)}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-violet-100 to-fuchsia-200 rounded-xl mr-4 shadow-inner">
              <svg className="w-5 h-5 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-sm text-slate-500 font-medium uppercase tracking-wide">Ganancia Potencial</h3>
              <p className="text-2xl font-bold text-violet-700 mt-1">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(valuation.potentialProfit)}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl mr-4 shadow-inner">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-sm text-slate-500 font-medium uppercase tracking-wide">Margen de Ganancia</h3>
              <p className="text-2xl font-bold text-slate-700 mt-1">{valuation.potentialProfitMargin.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de productos */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-md border border-gray-100">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 mb-4 rounded-full bg-indigo-200"></div>
            <p className="text-gray-600 font-medium">Cargando productos...</p>
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
        <>
          <div className="overflow-x-auto rounded-xl">
            <table className="min-w-full bg-white shadow-lg">
              <thead>
                <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Precio Costo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Precio Venta</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      No hay productos que coincidan con los filtros aplicados
                    </td>
                  </tr>
                ) : (
                  products.map(product => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.sku}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{product.name}</span>
                          {product.description && (
                            <span className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.category.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full font-medium shadow-sm ${
                            product.stock <= product.minimumStock
                              ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border border-red-200'
                              : product.stock <= product.minimumStock * 1.5
                              ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {product.stock}
                          </span>
                          {product.stock <= product.minimumStock && (
                            <span className="ml-2 text-red-600 text-xs font-medium flex items-center">
                              <svg className="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                              </svg>
                              Bajo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-block font-medium text-blue-700 bg-gradient-to-r from-blue-50 to-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.costPrice)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-block font-medium text-fuchsia-600 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-3 py-1.5 rounded-lg border border-fuchsia-100 shadow-sm">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.sellingPrice)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleStockMovement(product.id, 'entrada', 1)}
                            className="p-1.5 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg text-emerald-700 hover:shadow-md border border-emerald-200 transition-all transform hover:-translate-y-0.5"
                            title="Agregar 1 unidad"
                          >
                            <span className="font-medium">+1</span>
                          </button>
                          <button
                            onClick={() => handleStockMovement(product.id, 'salida', 1)}
                            className={`p-1.5 rounded-lg transition-all transform hover:-translate-y-0.5 ${product.stock < 1 ? 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 hover:shadow-md border border-red-200'}`}
                            title="Restar 1 unidad"
                            disabled={product.stock < 1}
                          >
                            <span className="font-medium">-1</span>
                          </button>
                          <Link
                            to={`/products/${product.id}`}
                            className="p-1.5 bg-gradient-to-r from-violet-50 to-violet-100 rounded-lg text-violet-700 hover:shadow-md border border-violet-200 transition-all transform hover:-translate-y-0.5 flex items-center"
                          >
                            <RiEditLine className="text-lg" />
                          </Link>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            className="p-1.5 bg-gradient-to-r from-fuchsia-50 to-pink-100 rounded-lg text-fuchsia-700 hover:shadow-md border border-fuchsia-200 transition-all transform hover:-translate-y-0.5 flex items-center"
                          >
                            <RiDeleteBin6Line className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex justify-between items-center mt-8">
            <p className="text-sm text-slate-600 font-medium bg-gradient-to-r from-violet-50 to-fuchsia-50 px-4 py-2 rounded-lg shadow-sm border border-slate-200">
              Mostrando página {currentPage} de {totalPages}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2.5 rounded-lg flex items-center gap-1 transition-all duration-200 shadow-md transform hover:-translate-y-0.5 ${
                  currentPage === 1 
                  ? 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white hover:from-violet-600 hover:to-fuchsia-700'
                }`}
              >
                <RiArrowLeftSLine className="text-lg" /> Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2.5 rounded-lg flex items-center gap-1 transition-all duration-200 shadow-md transform hover:-translate-y-0.5 ${
                  currentPage === totalPages 
                  ? 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white hover:from-violet-600 hover:to-fuchsia-700'
                }`}
              >
                Siguiente <RiArrowRightSLine className="text-lg" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Inventory;
