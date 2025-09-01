import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import toast from 'react-hot-toast';
import '../styles/ShiftClosures.css';

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
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-20 h-20">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-fuchsia-200 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-full h-full border-t-4 border-fuchsia-600 rounded-full animate-spin" style={{animationDuration: "1s"}}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <svg className="w-8 h-8 text-fuchsia-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-lg font-medium text-slate-800">Cargando cierres de caja</p>
              <div className="flex mt-2 space-x-1">
                <div className="w-2 h-2 bg-fuchsia-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: "100ms" }}></div>
                <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-700 rounded-lg shadow-lg mr-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Cierres de Caja</h1>
            <p className="text-sm text-slate-500">Historial de cierres y balance de cajas</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="animate-fadeIn bg-white border-l-4 border-gradient-to-r from-red-500 to-fuchsia-500 text-red-700 px-6 py-4 rounded-lg mb-8 shadow-lg">
          <div className="flex items-center">
            <div className="mr-4 bg-red-100 rounded-full p-2">
              <svg className="w-6 h-6 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-red-800 mb-1">Error al cargar datos</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 neomorphic-card">
        <div className="flex items-center mb-5">
          <div className="p-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3 icon-pop">
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Filtros</h3>
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-auto flex-grow">
            <label htmlFor="userId" className="block text-sm font-medium text-slate-700 mb-2">
              Filtrar por Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <select
                id="userId"
                value={selectedUserId}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all duration-200 appearance-none bg-white"
              >
                <option value="">Todos los usuarios</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div>
            <button
              onClick={() => handleFilterChange('')}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center btn-hover-effect"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de cierres */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden neomorphic-card">
        <div className="px-6 py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 gradient-shift">
          <div className="flex items-center">
            <div className="p-2 bg-white/20 rounded-lg mr-3 icon-pop">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Historial de Cierres de Caja</h3>
            <span className="ml-3 bg-white/20 text-white text-sm font-medium py-1 px-2 rounded-lg">
              {closures.length} registros
            </span>
          </div>
        </div>
        <div className="p-6">
          {closures.length === 0 ? (
            <div className="text-center py-12 my-8 bg-white rounded-xl shadow-neomorphic flex flex-col items-center animate-fadeIn">
              <div className="mb-6 p-6 bg-slate-50 rounded-full shadow-inner">
                <svg className="w-20 h-20 text-fuchsia-400 mx-auto animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium text-slate-800 mb-2">Sin cierres de caja</h3>
              <p className="text-gray-500 max-w-md mb-6">No hay cierres de caja registrados en el sistema para el período seleccionado.</p>
              <div className="w-full max-w-xs h-1 bg-gradient-to-r from-violet-300 to-fuchsia-300 rounded-full"></div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200">
              <table className="min-w-full bg-white rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
                    <th className="text-left py-4 px-4 font-medium border-b border-white/10 rounded-tl-xl">ID</th>
                    <th className="text-left py-4 px-4 font-medium border-b border-white/10">Usuario</th>
                    <th className="text-left py-4 px-4 font-medium border-b border-white/10">Fecha</th>
                    <th className="text-right py-4 px-4 font-medium border-b border-white/10">Monto Esperado</th>
                    <th className="text-right py-4 px-4 font-medium border-b border-white/10">Monto Real</th>
                    <th className="text-right py-4 px-4 font-medium border-b border-white/10">Diferencia</th>
                    <th className="text-left py-4 px-4 font-medium border-b border-white/10 rounded-tr-xl">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {closures.map((closure, index) => (
                    <tr key={closure.id} 
                        className="hover:bg-slate-50 transition-all duration-200 animate-slideIn" 
                        style={{ animationDelay: `${index * 50}ms` }}>
                      <td className="py-4 px-4 text-slate-700 font-medium">{closure.id}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-full mr-2 shadow-sm">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <span className="text-slate-700 font-medium">{closure.shift?.user?.name || 'Desconocido'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        <div className="flex items-center">
                          <div className="p-1 bg-fuchsia-50 rounded-md mr-2">
                            <svg className="w-3.5 h-3.5 text-fuchsia-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          {formatDateTime(closure.createdAt)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-slate-700">
                        {formatCurrency(closure.expectedAmount)}
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-slate-700">
                        {formatCurrency(closure.actualAmount)}
                      </td>
                      <td className={`py-4 px-4 text-right font-medium ${getDifferenceClass(closure.difference)}`}>
                        <span className={`px-3 py-1.5 rounded-lg inline-flex items-center ${
                          closure.difference > 0 
                            ? 'bg-green-50 border border-green-200 text-green-700' 
                            : closure.difference < 0 
                              ? 'bg-red-50 border border-red-200 text-red-700'
                              : 'bg-slate-50 border border-slate-200 text-slate-700'
                        }`}>
                          {closure.difference > 0 && <span className="mr-1">+</span>}
                          {formatCurrency(closure.difference)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          className="flex items-center justify-center px-4 py-2 text-white bg-gradient-to-r from-violet-500 to-fuchsia-600 rounded-lg hover:from-violet-600 hover:to-fuchsia-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:translate-y-[-1px] btn-glow"
                          onClick={() => {
                            // Calcular los valores de efectivo y transferencias esperados
                            // Asumiendo que la diferencia es la suma de ambos tipos
                            const expectedCash = closure.cashInRegister - parseFloat(closure.notes?.split('Diferencia efectivo: ')[1]?.split(',')[0] || 0);
                            const expectedTransfer = closure.transferAmount - parseFloat(closure.notes?.split('Diferencia transferencias: ')[1] || 0);
                            
                            toast.success(
                              <div className="space-y-4 p-1 animate-fadeIn">
                                <div className="flex items-center justify-between border-b pb-2 mb-1">
                                  <div className="flex items-center">
                                    <div className="p-2 bg-gradient-to-r from-violet-200 to-fuchsia-200 rounded-full mr-2 shadow-sm">
                                      <svg className="w-4 h-4 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                      </svg>
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-fuchsia-700">Desglose del Cierre #{closure.id}</h3>
                                      <p className="text-xs text-slate-500">Usuario: {closure.shift?.user?.name || 'Desconocido'}</p>
                                    </div>
                                  </div>
                                  <span className="text-xs bg-fuchsia-100 text-fuchsia-600 px-2 py-1 rounded-full shadow-sm">
                                    {formatDateTime(closure.createdAt).split(',')[0]}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm bg-gradient-to-r from-violet-50 to-fuchsia-50 p-4 rounded-lg shadow-inner">
                                  <div className="col-span-2 mb-2">
                                    <div className="h-1 w-full bg-gradient-to-r from-violet-300 to-fuchsia-300 rounded-full"></div>
                                  </div>
                                  
                                  <span className="font-medium text-slate-700 flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"></path>
                                    </svg>
                                    Efectivo Esperado:
                                  </span>
                                  <span className="text-right font-mono bg-white py-1 px-2 rounded shadow-sm">{formatCurrency(expectedCash)}</span>
                                  
                                  <span className="font-medium text-slate-700 flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1.5 text-fuchsia-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"></path>
                                    </svg>
                                    Efectivo Real:
                                  </span>
                                  <span className="text-right font-mono bg-white py-1 px-2 rounded shadow-sm">{formatCurrency(closure.cashInRegister)}</span>
                                  
                                  <span className="font-medium text-slate-700 flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                    </svg>
                                    Diferencia Efectivo:
                                  </span>
                                  <span className={`text-right font-medium font-mono py-1 px-2 rounded-md shadow-sm ${
                                    (closure.cashInRegister - expectedCash) > 0 
                                    ? 'bg-green-50 text-green-700'
                                    : (closure.cashInRegister - expectedCash) < 0 
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-white text-slate-700'
                                  }`}>
                                    {(closure.cashInRegister - expectedCash) > 0 && '+'}{formatCurrency(closure.cashInRegister - expectedCash)}
                                  </span>
                                  
                                  <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                                    <div className="h-1 w-full bg-gradient-to-r from-fuchsia-300 to-violet-300 rounded-full mb-2"></div>
                                  </div>
                                  
                                  <span className="font-medium text-slate-700 flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                                    </svg>
                                    Transferencias Esperadas:
                                  </span>
                                  <span className="text-right pt-2 font-mono bg-white py-1 px-2 rounded shadow-sm">{formatCurrency(expectedTransfer)}</span>
                                  
                                  <span className="font-medium text-slate-700 flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1.5 text-fuchsia-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                                    </svg>
                                    Transferencias Reportadas:
                                  </span>
                                  <span className="text-right font-mono bg-white py-1 px-2 rounded shadow-sm">{formatCurrency(closure.transferAmount)}</span>
                                  
                                  <span className="font-medium text-slate-700 flex items-center">
                                    <svg className="w-3.5 h-3.5 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                                    </svg>
                                    Diferencia Transferencias:
                                  </span>
                                  <span className={`text-right font-medium font-mono py-1 px-2 rounded-md shadow-sm ${
                                    (closure.transferAmount - expectedTransfer) > 0 
                                    ? 'bg-green-50 text-green-700'
                                    : (closure.transferAmount - expectedTransfer) < 0 
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-white text-slate-700'
                                  }`}>
                                    {(closure.transferAmount - expectedTransfer) > 0 && '+'}{formatCurrency(closure.transferAmount - expectedTransfer)}
                                  </span>
                                  
                                  <div className="col-span-2 mt-3 pt-3 border-t-2 border-dashed border-slate-200">
                                    <div className="flex justify-between items-center">
                                      <span className="font-bold text-slate-800 flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4M20 12a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v4a2 2 0 002 2M20 12a2 2 0 01-2 2H6a2 2 0 01-2-2" />
                                        </svg>
                                        Diferencia Total:
                                      </span>
                                      <span className={`text-right font-bold px-3 py-1 rounded-md shadow ${getDifferenceClass(closure.difference)} text-lg font-mono ${
                                        closure.difference > 0 
                                        ? 'bg-green-50 text-green-700'
                                        : closure.difference < 0 
                                        ? 'bg-red-50 text-red-700'
                                        : 'bg-slate-50 text-slate-700'
                                      }`}>
                                        {closure.difference > 0 && '+'}{formatCurrency(closure.difference)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>, 
                              {
                                duration: 10000,
                                style: {
                                  border: '1px solid #e879f9',
                                  padding: '16px',
                                  color: '#334155',
                                  background: 'white',
                                  borderRadius: '10px',
                                  boxShadow: '0 10px 25px -5px rgba(186, 104, 200, 0.1), 0 8px 10px -6px rgba(186, 104, 200, 0.1)'
                                },
                                iconTheme: {
                                  primary: '#d946ef',
                                  secondary: '#ffffff',
                                }
                              }
                            );
                          }}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
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
        <div className="mt-8 bg-white rounded-xl shadow-lg overflow-hidden neomorphic-card animate-fadeIn">
          <div className="px-6 py-5 bg-gradient-to-r from-violet-500 to-fuchsia-600 gradient-shift">
            <div className="flex items-center">
              <div className="p-2 bg-white/20 rounded-lg mr-3 icon-pop">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Resumen de Discrepancias</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="summary-card bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-green-800">Cierres Sin Discrepancias</h4>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-600 count-animate">
                  {closures.filter(c => c.difference === 0).length}
                </p>
                <div className="mt-2 h-2 bg-green-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ 
                      width: `${Math.round((closures.filter(c => c.difference === 0).length / closures.length) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="summary-card bg-gradient-to-br from-red-50 to-white p-5 rounded-xl border border-red-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-red-800">Cierres con Faltante</h4>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-600 count-animate">
                  {closures.filter(c => c.difference < 0).length}
                </p>
                <div className="mt-2 h-2 bg-red-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full" 
                    style={{ 
                      width: `${Math.round((closures.filter(c => c.difference < 0).length / closures.length) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              <div className="summary-card bg-gradient-to-br from-fuchsia-50 to-white p-5 rounded-xl border border-fuchsia-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-fuchsia-800">Cierres con Sobrante</h4>
                  <div className="p-2 bg-fuchsia-100 rounded-lg">
                    <svg className="w-5 h-5 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-fuchsia-600 count-animate">
                  {closures.filter(c => c.difference > 0).length}
                </p>
                <div className="mt-2 h-2 bg-fuchsia-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-fuchsia-500 rounded-full" 
                    style={{ 
                      width: `${Math.round((closures.filter(c => c.difference > 0).length / closures.length) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-5 bg-gradient-to-r from-slate-50 to-violet-50 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-1">Discrepancia Total</h4>
                  <p className={`text-3xl font-bold ${getDifferenceClass(closures.reduce((sum, c) => sum + c.difference, 0))} count-animate`}>
                    {formatCurrency(closures.reduce((sum, c) => sum + c.difference, 0))}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${
                  closures.reduce((sum, c) => sum + c.difference, 0) > 0 
                    ? 'bg-green-100 text-green-600' 
                    : closures.reduce((sum, c) => sum + c.difference, 0) < 0 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-slate-100 text-slate-600'
                }`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    {closures.reduce((sum, c) => sum + c.difference, 0) > 0 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : closures.reduce((sum, c) => sum + c.difference, 0) < 0 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShiftClosures;
