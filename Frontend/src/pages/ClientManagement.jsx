import React, { useState, useEffect } from 'react';
import { clientApi } from '../utils/apiClient';
import { formatCurrency, formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    address: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSales, setClientSales] = useState([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    loadClients();
  }, [pagination.page, pagination.limit, searchQuery]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        query: searchQuery || undefined
      };
      
      const response = await clientApi.getAll(params);
      setClients(response.data.clients || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.total || 0
      }));
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const openModal = (client = null) => {
    if (client) {
      setCurrentClient(client);
      setFormData({
        name: client.name || '',
        document: client.document || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || ''
      });
    } else {
      setCurrentClient(null);
      setFormData({
        name: '',
        document: '',
        phone: '',
        email: '',
        address: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentClient(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    
    try {
      if (currentClient) {
        // Actualizar cliente existente
        await clientApi.update(currentClient.id, formData);
        toast.success('Cliente actualizado correctamente');
      } else {
        // Crear nuevo cliente
        await clientApi.create(formData);
        toast.success('Cliente creado correctamente');
      }
      
      closeModal();
      loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error(error.response?.data?.error || 'Error al guardar el cliente');
    }
  };

  const handleDelete = async (client) => {
    if (window.confirm(`¿Estás seguro de eliminar al cliente ${client.name}?`)) {
      try {
        await clientApi.delete(client.id);
        toast.success('Cliente eliminado correctamente');
        loadClients();
      } catch (error) {
        console.error('Error deleting client:', error);
        toast.error('Error al eliminar el cliente');
      }
    }
  };

  const loadClientDetails = async (client) => {
    setSelectedClient(client);
    setIsLoading(true);
    
    try {
      const [pointsResponse, salesResponse] = await Promise.all([
        clientApi.getPoints(client.id),
        clientApi.getSales(client.id)
      ]);
      
      const clientWithPoints = {
        ...client,
        points: pointsResponse.data
      };
      
      setSelectedClient(clientWithPoints);
      setClientSales(salesResponse.data.sales || []);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error('Error loading client details:', error);
      toast.error('Error al cargar detalles del cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Clientes</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Cliente
        </button>
      </div>

      {/* Buscador y filtros */}
      <div className="mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, documento o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puntos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No se encontraron clientes
                  </td>
                </tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{client.name}</div>
                      {client.email && <div className="text-sm text-gray-500">{client.email}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.document || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {client.totalPoints ? (client.totalPoints - (client.usedPoints || 0)) : 0} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => loadClientDetails(client)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Detalles
                        </button>
                        <button
                          onClick={() => openModal(client)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(client)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-700">
          Mostrando <span className="font-medium">{clients.length}</span> de{' '}
          <span className="font-medium">{pagination.total}</span> resultados
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page <= 1}
            className={`px-3 py-1 rounded ${
              pagination.page <= 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Anterior
          </button>
          <div className="flex items-center space-x-1">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              // Mostrar páginas alrededor de la página actual
              let pageToShow;
              if (totalPages <= 5) {
                pageToShow = i + 1;
              } else if (pagination.page <= 3) {
                pageToShow = i + 1;
              } else if (pagination.page >= totalPages - 2) {
                pageToShow = totalPages - 4 + i;
              } else {
                pageToShow = pagination.page - 2 + i;
              }
              
              return (
                <button
                  key={i}
                  onClick={() => setPagination(prev => ({ ...prev, page: pageToShow }))}
                  className={`px-3 py-1 rounded ${
                    pagination.page === pageToShow
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {pageToShow}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
            disabled={pagination.page >= totalPages}
            className={`px-3 py-1 rounded ${
              pagination.page >= totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal para crear/editar cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold mb-4">
              {currentClient ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Nombre*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="document">
                  Documento
                </label>
                <input
                  type="text"
                  id="document"
                  name="document"
                  value={formData.document}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone">
                  Teléfono
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
                  Dirección
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="mr-2 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {currentClient ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de detalles del cliente */}
      {isDetailsModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDetailsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h2 className="text-xl font-bold mb-4">Detalles del Cliente</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Información del Cliente</h3>
                <div className="space-y-2">
                  <p><strong>Nombre:</strong> {selectedClient.name}</p>
                  {selectedClient.document && <p><strong>Documento:</strong> {selectedClient.document}</p>}
                  {selectedClient.phone && <p><strong>Teléfono:</strong> {selectedClient.phone}</p>}
                  {selectedClient.email && <p><strong>Email:</strong> {selectedClient.email}</p>}
                  {selectedClient.address && <p><strong>Dirección:</strong> {selectedClient.address}</p>}
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Programa de Puntos</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {selectedClient.totalPoints ? (selectedClient.totalPoints - (selectedClient.usedPoints || 0)) : 0}
                  </div>
                  <p className="text-sm text-gray-600">puntos disponibles</p>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white p-2 rounded">
                      <div className="font-medium">{selectedClient.totalPoints || 0}</div>
                      <p className="text-xs text-gray-500">puntos ganados</p>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <div className="font-medium">{selectedClient.usedPoints || 0}</div>
                      <p className="text-xs text-gray-500">puntos canjeados</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2">Historial de Compras</h3>
              {clientSales.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Este cliente no tiene compras registradas</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puntos</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clientSales.map(sale => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(sale.createdAt)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                            #{sale.id}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {formatCurrency(sale.amount)}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {sale.saleItems ? (
                              <span className="text-gray-600">
                                {sale.saleItems.length} {sale.saleItems.length === 1 ? 'producto' : 'productos'}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            <div className="flex flex-col">
                              {sale.pointsEarned > 0 && (
                                <span className="text-green-600">+{sale.pointsEarned}</span>
                              )}
                              {sale.pointsRedeemed > 0 && (
                                <span className="text-red-600">-{sale.pointsRedeemed}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
