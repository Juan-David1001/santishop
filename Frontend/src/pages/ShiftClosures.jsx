import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import toast from 'react-hot-toast';

function ShiftClosures() {
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
    loadClosures();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadClosures = async (userId = null) => {
    try {
      setLoading(true);
      const params = {};
      if (userId) {
        params.userId = userId;
      }

      const response = await apiClient.get('/shift-closures', { params });
      setClosures(response.data);
      setError('');
    } catch (err) {
      setError('Error al cargar los cierres de caja');
      toast.error('Error al cargar los cierres de caja');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (userId) => {
    setSelectedUserId(userId);
    loadClosures(userId || null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'COP' 
    }).format(amount);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getDifferenceClass = (difference) => {
    if (difference > 0) {
      return 'text-green-600';
    } else if (difference < 0) {
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-lg">Cargando cierres de caja...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Cierres de Caja</h2>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-6 shadow-sm">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-auto flex-grow">
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Usuario
            </label>
            <select
              id="userId"
              value={selectedUserId}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los usuarios</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={() => handleFilterChange('')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de cierres */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
          <h3 className="text-lg font-medium text-white">Historial de Cierres de Caja</h3>
        </div>
        <div className="p-6">
          {closures.length === 0 ? (
            <div className="text-center py-6">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-gray-500">No hay cierres de caja registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Usuario</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Monto Esperado</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Monto Real</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Diferencia</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {closures.map((closure) => (
                    <tr key={closure.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">{closure.id}</td>
                      <td className="py-3 px-4">{closure.shift?.user?.name || 'Desconocido'}</td>
                      <td className="py-3 px-4">{formatDateTime(closure.createdAt)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(closure.expectedAmount)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(closure.actualAmount)}</td>
                      <td className={`py-3 px-4 text-right font-medium ${getDifferenceClass(closure.difference)}`}>
                        {formatCurrency(closure.difference)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          className="text-blue-600 hover:text-blue-800 underline text-sm"
                          onClick={() => {
                            // Calcular los valores de efectivo y transferencias esperados
                            // Asumiendo que la diferencia es la suma de ambos tipos
                            const expectedCash = closure.cashInRegister - parseFloat(closure.notes?.split('Diferencia efectivo: ')[1]?.split(',')[0] || 0);
                            const expectedTransfer = closure.transferAmount - parseFloat(closure.notes?.split('Diferencia transferencias: ')[1] || 0);
                            
                            toast.success(
                              <div className="space-y-2">
                                <div className="font-bold border-b pb-1">Desglose del Cierre #{closure.id}</div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <span className="font-medium">Efectivo Esperado:</span>
                                  <span>{formatCurrency(expectedCash)}</span>
                                  <span className="font-medium">Efectivo Real:</span>
                                  <span>{formatCurrency(closure.cashInRegister)}</span>
                                  <span className="font-medium">Diferencia Efectivo:</span>
                                  <span className={getDifferenceClass(closure.cashInRegister - expectedCash)}>
                                    {formatCurrency(closure.cashInRegister - expectedCash)}
                                  </span>
                                  <span className="font-medium">Transferencias Esperadas:</span>
                                  <span>{formatCurrency(expectedTransfer)}</span>
                                  <span className="font-medium">Transferencias Reportadas:</span>
                                  <span>{formatCurrency(closure.transferAmount)}</span>
                                </div>
                              </div>, 
                              {
                                duration: 8000
                              }
                            );
                          }}
                        >
                          Ver desglose
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Resumen de discrepancias */}
      {closures.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-yellow-600 to-yellow-700">
            <h3 className="text-lg font-medium text-white">Resumen de Discrepancias</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="text-sm font-medium text-green-800 mb-2">Cierres Sin Discrepancias</h4>
                <p className="text-2xl font-bold text-green-600">
                  {closures.filter(c => c.difference === 0).length}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="text-sm font-medium text-red-800 mb-2">Cierres con Faltante</h4>
                <p className="text-2xl font-bold text-red-600">
                  {closures.filter(c => c.difference < 0).length}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Cierres con Sobrante</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {closures.filter(c => c.difference > 0).length}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Discrepancia Total</h4>
              <p className={`text-2xl font-bold ${getDifferenceClass(closures.reduce((sum, c) => sum + c.difference, 0))}`}>
                {formatCurrency(closures.reduce((sum, c) => sum + c.difference, 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShiftClosures;
