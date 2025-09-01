import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    costPrice: '',
    sellingPrice: '',
    minimumStock: '',
    categoryId: ''
  });

  const [newMovement, setNewMovement] = useState({
    quantity: '',
    type: 'entrada',
    reference: '',
    notes: ''
  });

  // Cargar datos del producto
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Cargar categorías
        const categoryResponse = await apiClient.get('/categories');
        setCategories(categoryResponse.data);
        
        // Cargar detalles del producto
        const productResponse = await apiClient.get(`/products/${id}`);
        setProduct(productResponse.data);
        
        // Inicializar formulario con datos del producto
        setFormData({
          sku: productResponse.data.sku,
          name: productResponse.data.name,
          description: productResponse.data.description || '',
          costPrice: productResponse.data.costPrice,
          sellingPrice: productResponse.data.sellingPrice,
          minimumStock: productResponse.data.minimumStock,
          categoryId: productResponse.data.categoryId
        });

        // Cargar movimientos de stock
        const movementsResponse = await apiClient.get(`/products/${id}/stock-movements`);
        setStockMovements(movementsResponse.data);
        
        setError(null);
      } catch (err) {
        setError('Error al cargar los datos: ' + err.message);
        toast.error('Error al cargar los datos del producto');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar envío del formulario de actualización
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/products/${id}`, formData);
      toast.success('Producto actualizado exitosamente');
      
      // Actualizar datos del producto
      const response = await apiClient.get(`/products/${id}`);
      setProduct(response.data);
    } catch (err) {
      toast.error('Error al actualizar producto: ' + err.response?.data?.error || err.message);
    }
  };

  // Manejar cambios en el formulario de movimiento de stock
  const handleMovementChange = (e) => {
    const { name, value } = e.target;
    setNewMovement(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar envío del formulario de movimiento de stock
  const handleMovementSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/products/${id}/stock-movements`, newMovement);
      toast.success('Movimiento de stock registrado exitosamente');
      
      // Actualizar movimientos y datos del producto
      const [productResponse, movementsResponse] = await Promise.all([
        apiClient.get(`/products/${id}`),
        apiClient.get(`/products/${id}/stock-movements`)
      ]);
      
      setProduct(productResponse.data);
      setStockMovements(movementsResponse.data);
      
      // Limpiar formulario
      setNewMovement({
        quantity: '',
        type: 'entrada',
        reference: '',
        notes: ''
      });
    } catch (err) {
      toast.error('Error al registrar movimiento: ' + err.response?.data?.error || err.message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-10">
          <p className="text-gray-600">Cargando información del producto...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          <p>{error}</p>
        </div>
        <button
          onClick={() => navigate('/inventory')}
          className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
        >
          Volver a Inventario
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 text-yellow-700 p-4 rounded mb-4">
          <p>No se encontró el producto solicitado.</p>
        </div>
        <button
          onClick={() => navigate('/inventory')}
          className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
        >
          Volver a Inventario
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {product.name} <span className="text-gray-500 text-lg">({product.sku})</span>
        </h1>
        <button
          onClick={() => navigate('/inventory')}
          className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
        >
          Volver a Inventario
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg shadow">
          <h3 className="text-sm text-blue-800 font-medium">Stock Actual</h3>
          <p className={`text-2xl font-bold ${
            product.stock <= product.minimumStock
              ? 'text-red-600'
              : product.stock <= product.minimumStock * 1.5
              ? 'text-yellow-600'
              : 'text-green-600'
          }`}>{product.stock}</p>
          {product.stock <= product.minimumStock && (
            <p className="text-red-600 text-xs mt-1">⚠️ Por debajo del mínimo ({product.minimumStock})</p>
          )}
        </div>
        <div className="bg-green-100 p-4 rounded-lg shadow">
          <h3 className="text-sm text-green-800 font-medium">Precio de Costo</h3>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.costPrice)}
          </p>
        </div>
        <div className="bg-amber-100 p-4 rounded-lg shadow">
          <h3 className="text-sm text-amber-800 font-medium">Precio de Venta</h3>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.sellingPrice)}
          </p>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg shadow">
          <h3 className="text-sm text-purple-800 font-medium">Margen de Ganancia</h3>
          <p className="text-2xl font-bold">
            {product.costPrice ? (((product.sellingPrice - product.costPrice) / product.costPrice) * 100).toFixed(2) : 0}%
          </p>
        </div>
      </div>

      {/* Pestañas */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Detalles del Producto
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'movements'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Movimientos de Stock
          </button>
        </nav>
      </div>

      {/* Contenido de pestañas */}
      {activeTab === 'details' ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Editar Información del Producto</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full border rounded p-2"
                required
              />
            </div>
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
            <div className="md:col-span-2">
              <label className="block mb-1">Descripción</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full border rounded p-2"
                rows="2"
              ></textarea>
            </div>
            <div>
              <label className="block mb-1">Costo Unitario</label>
              <input
                type="number"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleChange}
                className="w-full border rounded p-2"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Precio de Venta</label>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                className="w-full border rounded p-2"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Stock Mínimo (Alerta)</label>
              <input
                type="number"
                name="minimumStock"
                value={formData.minimumStock}
                onChange={handleChange}
                className="w-full border rounded p-2"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Categoría</label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full border rounded p-2"
                required
              >
                <option value="">Seleccione una categoría</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          {/* Formulario para agregar movimiento */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Registrar Movimiento de Stock</h2>
            <form onSubmit={handleMovementSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Tipo de Movimiento</label>
                <select
                  name="type"
                  value={newMovement.type}
                  onChange={handleMovementChange}
                  className="w-full border rounded p-2"
                  required
                >
                  <option value="entrada">Entrada (Agregar Stock)</option>
                  <option value="salida">Salida (Reducir Stock)</option>
                </select>
              </div>
              <div>
                <label className="block mb-1">Cantidad</label>
                <input
                  type="number"
                  name="quantity"
                  value={newMovement.quantity}
                  onChange={handleMovementChange}
                  className="w-full border rounded p-2"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block mb-1">Referencia</label>
                <input
                  type="text"
                  name="reference"
                  value={newMovement.reference}
                  onChange={handleMovementChange}
                  className="w-full border rounded p-2"
                  placeholder="Ej: Compra, Ajuste, Devolución"
                  required
                />
              </div>
              <div>
                <label className="block mb-1">Notas</label>
                <input
                  type="text"
                  name="notes"
                  value={newMovement.notes}
                  onChange={handleMovementChange}
                  className="w-full border rounded p-2"
                  placeholder="Detalles adicionales (opcional)"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded"
                >
                  Registrar Movimiento
                </button>
              </div>
            </form>
          </div>

          {/* Historial de movimientos */}
          <div className="bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold p-4 border-b">Historial de Movimientos</h2>
            {stockMovements.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No hay movimientos registrados para este producto
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockMovements.map(movement => (
                      <tr key={movement.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {new Date(movement.createdAt).toLocaleString('es-CO')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded ${
                            movement.type === 'entrada'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {movement.type === 'entrada' ? 'Entrada' : 'Salida'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {movement.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {movement.reference || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {movement.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetail;
