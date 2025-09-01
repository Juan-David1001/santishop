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
      let response;
      
      if (searchQuery && searchQuery.length >= 2) {
        // Si hay una consulta de búsqueda, usar endpoint de búsqueda
        response = await clientApi.search(searchQuery);
        setClients(response.data.clients || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.clients?.length || 0
        }));
      } else {
        // Sin búsqueda o muy corta, cargar todos con paginación
        const params = {
          page: pagination.page,
          limit: pagination.limit
        };
        
        response = await clientApi.getAll(params);
        setClients(response.data.clients || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.totalItems || 0
        }));
      }
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
      const salesResponse = await clientApi.getSales(client.id);
      
      // Actualizar cliente con datos de puntos desde la respuesta de ventas
      const pointsData = salesResponse.data.stats || {};
      const clientWithPoints = {
        ...client,
        totalPoints: pointsData.pointsEarned || 0,
        usedPoints: pointsData.pointsRedeemed || 0,
        availablePoints: pointsData.availablePoints || 0
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-700 rounded-lg shadow-lg mr-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Clientes</h1>
            <p className="text-sm text-slate-500">Administra la información y compras de tus clientes</p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Cliente
        </button>
      </div>

      {/* Buscador y filtros */}
      <div className="bg-white p-6 mb-8 rounded-xl shadow-lg border border-slate-100">
        <div className="flex items-center mb-4 pb-2 border-b border-slate-100">
          <div className="p-2.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
            <svg className="w-5 h-5 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Filtros de Búsqueda</h2>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, documento o teléfono..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                // Resetear la paginación cuando cambia la búsqueda
                if (value.length === 0) {
                  setPagination(prev => ({ ...prev, page: 1 }));
                  setTimeout(loadClients, 0);
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  loadClients();
                }
              }}
              className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setPagination(prev => ({ ...prev, page: 1 }));
                  // Cargar clientes inmediatamente al limpiar
                  setTimeout(loadClients, 0);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </div>
          
          <button
            onClick={loadClients}
            className="px-4 py-3.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            Buscar
          </button>
          
          <button
            onClick={() => {
              setSearchQuery('');
              setPagination(prev => ({ ...prev, page: 1 }));
              // Cargar clientes inmediatamente al limpiar filtros
              setTimeout(loadClients, 0);
            }}
            className="px-4 py-3.5 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 font-medium rounded-xl border border-slate-200 hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Puntos</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-violet-300 border-t-violet-600 mb-3"></div>
                      <p className="text-slate-500 font-medium">Cargando clientes...</p>
                    </div>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="p-3 bg-slate-100 rounded-full mb-3">
                        <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-slate-700 mb-1">No se encontraron clientes</h3>
                      <p className="text-slate-500 max-w-md">No hay clientes que coincidan con tu búsqueda. Intenta con otros filtros o crea un nuevo cliente.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id} className="hover:bg-violet-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-violet-100 to-fuchsia-100 rounded-full flex items-center justify-center text-violet-700 font-medium border border-violet-200">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-slate-800">{client.name}</div>
                          {client.email && <div className="text-xs text-slate-500">{client.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.document ? (
                        <span className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-sm border border-violet-200">
                          {client.document}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">No registrado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {client.phone ? (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-slate-400 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                          </svg>
                          <span className="text-slate-700">{client.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">No registrado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-amber-50 to-yellow-100 text-amber-800 border border-amber-200">
                          {client.totalPoints ? (client.totalPoints - (client.usedPoints || 0)) : 0} pts
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => loadClientDetails(client)}
                          className="p-1.5 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg text-indigo-700 hover:shadow-md border border-indigo-200 transition-all transform hover:-translate-y-0.5 inline-flex items-center"
                          title="Ver detalles"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => openModal(client)}
                          className="p-1.5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg text-blue-700 hover:shadow-md border border-blue-200 transition-all transform hover:-translate-y-0.5 inline-flex items-center"
                          title="Editar cliente"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(client)}
                          className="p-1.5 bg-gradient-to-r from-red-50 to-red-100 rounded-lg text-red-700 hover:shadow-md border border-red-200 transition-all transform hover:-translate-y-0.5 inline-flex items-center"
                          title="Eliminar cliente"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
      </div>

      {/* Paginación */}
      <div className="mt-8 flex flex-col md:flex-row justify-between items-center">
        <div className="text-sm text-slate-600 mb-4 md:mb-0 text-center md:text-left">
          Mostrando <span className="font-medium text-slate-800">{Math.min(pagination.total, (pagination.page - 1) * pagination.limit + 1)}</span> a{' '}
          <span className="font-medium text-slate-800">{Math.min(pagination.total, pagination.page * pagination.limit)}</span> de{' '}
          <span className="font-medium text-slate-800">{pagination.total}</span> clientes
        </div>
        
        <div className="flex gap-2 flex-wrap justify-center">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page <= 1}
            className={`inline-flex items-center px-3 py-2 border rounded-md shadow-sm text-sm font-medium ${
              pagination.page <= 1
                ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' 
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 hover:shadow-md transform hover:-translate-y-0.5 transition-all'
            }`}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            <span className="hidden sm:inline">Anterior</span>
          </button>
          
          {/* Números de página */}
          <div className="hidden md:flex gap-1">
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
                  className={`px-3.5 py-2 rounded-md text-sm font-medium ${
                    pagination.page === pageToShow
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:shadow-sm'
                  }`}
                >
                  {pageToShow}
                </button>
              );
            })}
          </div>
          
          {/* Selector de página móvil */}
          <div className="md:hidden flex items-center bg-white border border-slate-200 rounded-md px-2">
            <span className="text-sm text-slate-600 mr-2">Página</span>
            <select 
              value={pagination.page}
              onChange={(e) => setPagination(prev => ({ ...prev, page: Number(e.target.value) }))}
              className="bg-transparent text-slate-800 py-2 px-1 outline-none"
            >
              {[...Array(totalPages)].map((_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1} de {totalPages}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
            disabled={pagination.page >= totalPages}
            className={`inline-flex items-center px-3 py-2 border rounded-md shadow-sm text-sm font-medium ${
              pagination.page >= totalPages
                ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' 
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 hover:shadow-md transform hover:-translate-y-0.5 transition-all'
            }`}
          >
            <span className="hidden sm:inline">Siguiente</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Modal para crear/editar cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 py-4 px-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {currentClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-white hover:text-slate-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1">
                <label className="block text-slate-700 text-sm font-medium" htmlFor="name">
                  Nombre*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    placeholder="Nombre completo"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="block text-slate-700 text-sm font-medium" htmlFor="document">
                  Documento
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="document"
                    name="document"
                    value={formData.document}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    placeholder="DNI, RUT, etc."
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="block text-slate-700 text-sm font-medium" htmlFor="phone">
                  Teléfono
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    placeholder="Número de contacto"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="block text-slate-700 text-sm font-medium" htmlFor="email">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="block text-slate-700 text-sm font-medium" htmlFor="address">
                  Dirección
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    placeholder="Dirección de residencia"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
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
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 py-4 px-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  Detalles del Cliente
                </h2>
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="text-white hover:text-slate-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-64px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Información del cliente */}
                <div className="bg-gradient-to-br from-violet-50 to-violet-100 p-5 rounded-xl border border-violet-200 shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className="p-2.5 bg-violet-200/70 rounded-lg shadow-inner mr-3">
                      <svg className="w-5 h-5 text-violet-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg text-slate-800">Información del Cliente</h3>
                  </div>

                  <div className="space-y-3 pl-2">
                    <div className="flex">
                      <div className="w-28 text-sm font-medium text-slate-500">Nombre:</div>
                      <div className="flex-1 text-slate-900 font-medium">{selectedClient.name}</div>
                    </div>
                    
                    {selectedClient.document && (
                      <div className="flex">
                        <div className="w-28 text-sm font-medium text-slate-500">Documento:</div>
                        <div className="flex-1">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-sm border border-slate-200 font-medium">
                            {selectedClient.document}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {selectedClient.phone && (
                      <div className="flex">
                        <div className="w-28 text-sm font-medium text-slate-500">Teléfono:</div>
                        <div className="flex-1 flex items-center">
                          <svg className="w-4 h-4 text-slate-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{selectedClient.phone}</span>
                        </div>
                      </div>
                    )}
                    
                    {selectedClient.email && (
                      <div className="flex">
                        <div className="w-28 text-sm font-medium text-slate-500">Email:</div>
                        <div className="flex-1 flex items-center">
                          <svg className="w-4 h-4 text-slate-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-blue-600">{selectedClient.email}</span>
                        </div>
                      </div>
                    )}
                    
                    {selectedClient.address && (
                      <div className="flex">
                        <div className="w-28 text-sm font-medium text-slate-500">Dirección:</div>
                        <div className="flex-1 flex items-center">
                          <svg className="w-4 h-4 text-slate-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{selectedClient.address}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Programa de puntos */}
                <div className="bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 p-5 rounded-xl border border-fuchsia-200 shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className="p-2.5 bg-fuchsia-200/70 rounded-lg shadow-inner mr-3">
                      <svg className="w-5 h-5 text-fuchsia-700" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg text-slate-800">Programa de Puntos</h3>
                  </div>

                  <div className="flex flex-col items-center justify-center mb-4">
                    <div className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                      {selectedClient.totalPoints ? (selectedClient.totalPoints - (selectedClient.usedPoints || 0)) : 0}
                    </div>
                    <p className="text-slate-500 font-medium mt-1">puntos disponibles</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm mt-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-fuchsia-100 text-center">
                      <div className="flex justify-center mb-1">
                        <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-lg font-semibold text-slate-800">{selectedClient.totalPoints || 0}</div>
                      <p className="text-xs text-slate-500">puntos ganados</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-fuchsia-100 text-center">
                      <div className="flex justify-center mb-1">
                        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M8 5a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V6a1 1 0 00-1-1H8zm3 4.5a.5.5 0 111 0V12a.5.5 0 11-1 0V9.5zm3 0a.5.5 0 111 0V12a.5.5 0 11-1 0V9.5z" clipRule="evenodd" />
                          <path d="M2 5a2 2 0 012-2h8a2 2 0 012 2v2H4v10a2 2 0 01-2-2V5z" />
                        </svg>
                      </div>
                      <div className="text-lg font-semibold text-slate-800">{selectedClient.usedPoints || 0}</div>
                      <p className="text-xs text-slate-500">puntos canjeados</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Historial de compras */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
                <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-slate-200 px-6 py-3">
                  <div className="flex items-center">
                    <div className="p-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
                      <svg className="w-5 h-5 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg text-slate-800">Historial de Compras</h3>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  {clientSales.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="flex justify-center">
                        <div className="p-4 bg-slate-100 rounded-full mb-3">
                          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-slate-700 mb-1">No hay compras registradas</h3>
                      <p className="text-slate-500 max-w-md mx-auto">Este cliente aún no ha realizado ninguna compra en el sistema.</p>
                    </div>
                  ) : (
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Ticket</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Monto</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Productos</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Puntos</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {clientSales.map(sale => (
                          <tr key={sale.id} className="hover:bg-violet-50/30 transition-colors">
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600">
                              {formatDate(sale.createdAt)}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <span className="px-2.5 py-1 bg-slate-50 text-slate-700 rounded-lg text-sm border border-slate-200 font-medium">
                                #{sale.id}
                              </span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-slate-800">
                              {formatCurrency(sale.amount)}
                            </td>
                            <td className="px-6 py-3 text-sm">
                              {sale.saleItems ? (
                                <span className="inline-flex items-center">
                                  <svg className="w-4 h-4 text-slate-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                  <span className="text-slate-600">
                                    {sale.saleItems.length} {sale.saleItems.length === 1 ? 'producto' : 'productos'}
                                  </span>
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                {sale.pointsEarned > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                                    </svg>
                                    +{sale.pointsEarned}
                                  </span>
                                )}
                                {sale.pointsRedeemed > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                                    </svg>
                                    -{sale.pointsRedeemed}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-5 py-2.5 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 font-medium rounded-lg shadow hover:shadow-md border border-slate-200 transition-all transform hover:-translate-y-0.5"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientManagement;
