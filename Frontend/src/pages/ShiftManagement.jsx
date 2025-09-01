import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import toast from 'react-hot-toast';
import '../styles/ShiftManagement.css';

function ShiftManagement() {
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [activeShifts, setActiveShifts] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [closureData, setClosureData] = useState({
    shiftId: null,
    actualAmount: '',
    cashInRegister: '',
    transferAmount: '',
    notes: ''
  });
  const [showClosureForm, setShowClosureForm] = useState(false);

  useEffect(() => {
    loadUsers();
    loadShifts();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
    } catch (err) {
      toast.error('Error al cargar los usuarios');
      console.error(err);
    }
  };

  const loadShifts = async () => {
    try {
      setLoading(true);
      // Primero cargamos todos los turnos
      const allShiftsRes = await apiClient.get('/shifts');
      setShifts(allShiftsRes.data);
      
      // Intentamos cargar los turnos activos
      try {
        // Intentar primero con el endpoint específico /shifts/active
        const activeShiftsRes = await apiClient.get('/shifts/active');
        setActiveShifts(activeShiftsRes.data);
        console.log('Turnos activos cargados (endpoint específico):', activeShiftsRes.data);
      } catch (activeErr) {
        // Si falla, intentar con el parámetro active=true
        try {
          const fallbackActiveRes = await apiClient.get('/shifts', { params: { active: true } });
          setActiveShifts(fallbackActiveRes.data);
          console.log('Turnos activos cargados (con parámetro):', fallbackActiveRes.data);
        } catch (fallbackErr) {
          console.error('Error en ambos métodos para cargar turnos activos:', fallbackErr);
          // Filtrar los turnos activos manualmente del array de todos los turnos
          const activeShifts = allShiftsRes.data.filter(shift => shift.isActive === true);
          setActiveShifts(activeShifts);
          console.log('Turnos activos filtrados manualmente:', activeShifts);
        }
      }
    } catch (err) {
      toast.error('Error al cargar los turnos');
      console.error('Error al cargar turnos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartShift = async () => {
    if (!selectedUser) {
      toast.error('Debes seleccionar un usuario');
      return;
    }

    try {
      await apiClient.post('/shifts/start', { userId: selectedUser });
      toast.success('Turno iniciado correctamente');
      loadShifts();
      setSelectedUser('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar turno');
      console.error(err);
    }
  };

  const handleEndShift = async (shiftId) => {
    try {
      await apiClient.post(`/shifts/${shiftId}/end`);
      toast.success('Turno finalizado correctamente');
      loadShifts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al finalizar turno');
      console.error(err);
    }
  };

  const handleClosureChange = (e) => {
    const { name, value } = e.target;
    setClosureData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const prepareForClosure = async (shiftId) => {
    try {
      // Obtener el total de ventas para este turno
      const response = await apiClient.get(`/shifts/${shiftId}/totals`);
      
      // Si la API devuelve los totales
      if (response.data && typeof response.data.total !== 'undefined') {
        setClosureData({
          shiftId,
          actualAmount: response.data.total.toString(), // Total esperado basado en las ventas
          cashInRegister: '',
          transferAmount: response.data.transferTotal ? response.data.transferTotal.toString() : '0',
          notes: ''
        });
      } else {
        // Si la API no devuelve totales, inicializar con valores vacíos
        setClosureData({
          shiftId,
          actualAmount: '',
          cashInRegister: '',
          transferAmount: '',
          notes: ''
        });
      }
    } catch (err) {
      console.error('Error al obtener totales del turno:', err);
      
      // Método alternativo: obtener ventas filtradas por el turno y calcular manualmente
      try {
        // Intentar obtener todas las ventas y filtrar manualmente por el turno para mayor seguridad
        console.log('Intentando obtener ventas para el turno ID:', shiftId);
        
        const salesResponse = await apiClient.get('/sales', { 
          params: { 
            fullLoad: true, // Cargar todas las ventas
            shiftId: shiftId // Filtrar por el ID del turno
          } 
        });
        
        // Depurar la estructura de la respuesta
        console.log('Respuesta de ventas:', salesResponse.data);
        
        let total = 0;
        let transferTotal = 0;
        let salesProcessed = 0;
        
        const processSale = (sale) => {
          // Log para ver cada venta que se está procesando
          console.log('Procesando venta:', sale);
          
          // Convertir ambos a string para comparación segura
          const saleShiftId = String(sale.shiftId || '');
          const currentShiftId = String(shiftId || '');
          
          // Verificar si la venta pertenece al turno actual
          // SOLUCIÓN TEMPORAL: considerar ventas sin turno asignado (shiftId null o vacío) como pertenecientes al turno actual
          const belongsToShift = saleShiftId === currentShiftId || !sale.shiftId;
          console.log(`Venta ${sale.id || 'N/A'} - ShiftId: ${saleShiftId}, Turno actual: ${currentShiftId}, ¿Pertenece?: ${belongsToShift}`);
          
          if (belongsToShift) {
            const amount = parseFloat(sale.amount || 0);
            total += amount;
            if (sale.paymentMethod === 'transferencia') {
              transferTotal += amount;
            }
            salesProcessed++;
            console.log(`Venta ${sale.id} agregada al total. Monto: ${amount}, Método: ${sale.paymentMethod}`);
          }
        };
        
        // Procesar las ventas para obtener totales
        if (salesResponse.data && salesResponse.data.sales) {
          // Nuevo formato de respuesta
          console.log('Procesando nuevo formato de respuesta con salesResponse.data.sales');
          salesResponse.data.sales.forEach(processSale);
        } else if (salesResponse.data && Array.isArray(salesResponse.data)) {
          // Formato antiguo por compatibilidad
          console.log('Procesando formato antiguo de respuesta con array');
          salesResponse.data.forEach(processSale);
        } else {
          // Si la estructura no coincide con lo esperado
          console.log('Formato de respuesta no reconocido:', salesResponse.data);
        }
        
        console.log(`Procesadas ${salesProcessed} ventas para el turno ${shiftId}`);
        
        // Usar los totales calculados
        console.log('Totales calculados en primer intento:', { total, transferTotal });
        
        if (salesProcessed > 0) {
          setClosureData({
            shiftId,
            actualAmount: total ? total.toString() : '0',
            cashInRegister: '',
            transferAmount: transferTotal ? transferTotal.toString() : '0',
            notes: ''
          });
          
          toast.success('Totales calculados a partir de las ventas del turno');
          
          // Advertir al usuario que se están incluyendo ventas sin turno asignado
          toast.success('ATENCIÓN: Se incluyeron ventas sin turno asignado', {
            duration: 6000,
            icon: '⚠️'
          });
        } else {
          console.log('No se encontraron ventas para el turno en el primer intento');
          // En lugar de lanzar un error, continuamos con el flujo para probar el segundo método
          setClosureData({
            shiftId,
            actualAmount: '0',
            cashInRegister: '',
            transferAmount: '0',
            notes: ''
          });
        }
      } catch (fallbackErr) {
        console.error('Error en el primer método alternativo para calcular totales:', fallbackErr);
        
        // Segundo intento: obtener todas las ventas sin filtro y filtrar manualmente
        try {
          console.log('Segundo intento: obteniendo todas las ventas sin filtro');
          const allSalesResponse = await apiClient.get('/sales', { params: { fullLoad: true } });
          
          console.log('Todas las ventas obtenidas:', allSalesResponse.data);
          
          let total = 0;
          let transferTotal = 0;
          let salesProcessed = 0;
          
          const processSale = (sale) => {
            // Log para ver cada venta que se está procesando en el segundo intento
            console.log('Segundo intento - Procesando venta:', sale);
            
            // Convertir ambos a string para comparación segura
            const saleShiftId = String(sale.shiftId || '');
            const currentShiftId = String(shiftId || '');
            
            // Verificar si la venta pertenece al turno actual
            // SOLUCIÓN TEMPORAL: considerar ventas sin turno asignado (shiftId null o vacío) como pertenecientes al turno actual
            const belongsToShift = saleShiftId === currentShiftId || !sale.shiftId;
            console.log(`Segundo intento - Venta ${sale.id || 'N/A'} - ShiftId: ${saleShiftId}, Turno actual: ${currentShiftId}, ¿Pertenece?: ${belongsToShift}`);
            
            if (belongsToShift) {
              const amount = parseFloat(sale.amount || 0);
              total += amount;
              if (sale.paymentMethod === 'transferencia') {
                transferTotal += amount;
              }
              salesProcessed++;
              console.log(`Segundo intento - Venta ${sale.id} agregada al total. Monto: ${amount}, Método: ${sale.paymentMethod}`);
            }
          };
          
          // Procesar todas las ventas
          if (allSalesResponse.data && allSalesResponse.data.sales) {
            allSalesResponse.data.sales.forEach(processSale);
          } else if (allSalesResponse.data && Array.isArray(allSalesResponse.data)) {
            allSalesResponse.data.forEach(processSale);
          }
          
          console.log(`Segundo intento: procesadas ${salesProcessed} ventas para el turno ${shiftId}`);
          
          if (salesProcessed > 0) {
            // Usar los totales calculados
            console.log('Totales calculados en segundo intento:', { total, transferTotal });
            
            setClosureData({
              shiftId,
              actualAmount: total ? total.toString() : '0',
              cashInRegister: '',
              transferAmount: transferTotal ? transferTotal.toString() : '0',
              notes: 'NOTA: Se incluyeron ventas sin turno asignado. Por favor verifica los totales.'
            });
            
            toast.success('Totales calculados correctamente');
            
            // Advertir al usuario que se están incluyendo ventas sin turno asignado
            toast.success('ATENCIÓN: Se incluyeron ventas sin asignación específica de turno', {
              duration: 6000,
              icon: '⚠️'
            });
            return; // Salir de la función si se han calculado correctamente los totales
          } else {
            console.log('No se encontraron ventas para el turno en el segundo intento');
          }
        } catch (secondFallbackErr) {
          console.error('Error en el segundo método alternativo:', secondFallbackErr);
          
          // Tercer intento: intentar con un endpoint específico para el turno y sus ventas
          try {
            console.log('Tercer intento: obteniendo ventas directamente del turno');
            const shiftResponse = await apiClient.get(`/shifts/${shiftId}`);
            
            console.log('Datos del turno obtenidos:', shiftResponse.data);
            
            // Verificar si el turno tiene ventas asociadas directamente
            if (shiftResponse.data && shiftResponse.data.sales && Array.isArray(shiftResponse.data.sales)) {
              console.log(`Tercer intento: el turno tiene ${shiftResponse.data.sales.length} ventas asociadas`);
              
              let total = 0;
              let transferTotal = 0;
              
              shiftResponse.data.sales.forEach(sale => {
                const amount = parseFloat(sale.amount || 0);
                total += amount;
                if (sale.paymentMethod === 'transferencia') {
                  transferTotal += amount;
                }
              });
              
              console.log('Totales calculados en tercer intento:', { total, transferTotal });
              
              setClosureData({
                shiftId,
                actualAmount: total ? total.toString() : '0',
                cashInRegister: '',
                transferAmount: transferTotal ? transferTotal.toString() : '0',
                notes: ''
              });
              
              toast.success('Totales calculados a partir de las ventas del turno');
              return; // Salir de la función si se han calculado correctamente los totales
            } else {
              console.log('El turno no tiene ventas asociadas directamente');
            }
          } catch (thirdFallbackErr) {
            console.error('Error en el tercer método alternativo:', thirdFallbackErr);
            
            // Cuarto intento: intento más agresivo para encontrar ventas
            try {
              console.log('Cuarto intento: depuración completa de todas las ventas');
              
              // Obtener absolutamente todas las ventas sin filtros
              const allSalesResponse = await apiClient.get('/sales');
              
              console.log('Todas las ventas sin filtro:', allSalesResponse.data);
              
              // Imprimir información detallada de cada venta para depuración
              if (allSalesResponse.data) {
                const salesArray = Array.isArray(allSalesResponse.data) 
                  ? allSalesResponse.data 
                  : (allSalesResponse.data.sales || []);
                
                console.log(`Total de ventas en el sistema: ${salesArray.length}`);
                
                console.log('Lista de todas las ventas:');
                salesArray.forEach((sale, index) => {
                  console.log(`Venta #${index + 1}:`);
                  console.log('  ID:', sale.id);
                  console.log('  Monto:', sale.amount);
                  console.log('  Método de pago:', sale.paymentMethod);
                  console.log('  ShiftId:', sale.shiftId);
                  console.log('  Fecha de creación:', sale.createdAt);
                });
                
                // Contar ventas por turno
                const salesByShift = {};
                salesArray.forEach(sale => {
                  const shiftIdKey = String(sale.shiftId || 'sin_turno');
                  salesByShift[shiftIdKey] = (salesByShift[shiftIdKey] || 0) + 1;
                });
                
                console.log('Distribución de ventas por turno:', salesByShift);
              }
            } catch (finalError) {
              console.error('Error en el intento final de depuración:', finalError);
            }
          }
        }
        
        // Si todos los métodos fallan, inicializar con valores predeterminados
        setClosureData({
          shiftId,
          actualAmount: '0', // Usar 0 en lugar de vacío para mejor experiencia de usuario
          cashInRegister: '',
          transferAmount: '0',
          notes: 'No se encontraron ventas asociadas a este turno.'
        });
        toast.error('No se encontraron ventas para este turno', {
          duration: 4000
        });
      }
    }
    
    // Asegurándonos de que el formulario de cierre se muestre incluso si hubo errores
    setShowClosureForm(true);
    console.log('Modal de cierre de turno activada');
  };

  const handleCreateClosure = async (e) => {
    e.preventDefault();

    if (!closureData.shiftId || !closureData.actualAmount || !closureData.cashInRegister) {
      toast.error('Los montos son obligatorios');
      return;
    }

    try {
      toast.loading('Procesando cierre de caja y enviando reporte por correo...', { id: 'cierre-toast' });
      
      await apiClient.post(`/shifts/${closureData.shiftId}/closure`, {
        actualAmount: parseFloat(closureData.actualAmount),
        cashInRegister: parseFloat(closureData.cashInRegister),
        transferAmount: parseFloat(closureData.transferAmount || 0),
        notes: closureData.notes
      });

      toast.success('Cierre de caja registrado correctamente. Se ha enviado un reporte por correo electrónico.', {
        id: 'cierre-toast',
        duration: 5000
      });
      setShowClosureForm(false);
      loadShifts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear cierre de caja');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 bg-white rounded-xl shadow-md p-8 m-4 neomorphic-card animate-fadeIn">
        <div className="relative w-20 h-20">
          <div className="absolute top-0 mt-1 w-20 h-20 border-4 border-fuchsia-200 rounded-full glow-effect"></div>
          <div className="absolute top-0 mt-1 w-20 h-20 border-4 border-transparent rounded-full animate-spin border-t-fuchsia-600 border-l-fuchsia-600"></div>
        </div>
        <p className="mt-6 text-fuchsia-800 font-medium text-lg">Cargando datos de turnos...</p>
        <p className="text-sm text-slate-500 mt-2">Por favor espera mientras obtenemos la información</p>
      </div>
    );
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-700 rounded-lg shadow-lg mr-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Turnos</h1>
            <p className="text-sm text-slate-500">Control de turnos de trabajo y cierre de caja</p>
          </div>
        </div>
        
        <button 
          onClick={loadShifts}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 btn-hover-effect spin-on-hover"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Iniciar Turno */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 neomorphic-card animate-fadeIn">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3 icon-pop">
            <svg className="w-6 h-6 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-800">Iniciar Nuevo Turno</h3>
        </div>
        
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-auto flex-grow">
            <label htmlFor="user" className="block text-sm font-medium text-slate-700 mb-2">
              Seleccionar Usuario para el Turno
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <select
                id="user"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all duration-200 appearance-none bg-white"
              >
                <option value="">Selecciona un usuario</option>
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
            <p className="mt-1 text-xs text-slate-500">El usuario seleccionado será responsable de este turno</p>
          </div>
          <div>
            <button
              onClick={handleStartShift}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center btn-hover-effect"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Iniciar Turno
            </button>
          </div>
        </div>
      </div>

      {/* Turnos Activos */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 neomorphic-card">
        <div className="px-6 py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 gradient-shift">
          <div className="flex items-center">
            <div className="p-2 bg-white/20 rounded-lg mr-3 icon-pop">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Turnos Activos</h3>
            <span className="ml-3 bg-white/20 text-white text-sm font-medium py-1 px-2 rounded-lg">
              {activeShifts.length} activos
            </span>
          </div>
        </div>
        <div className="p-6">
          {activeShifts.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-r from-slate-50 to-violet-50 rounded-xl animate-fadeIn">
              <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner neomorphic-card">
                <svg className="w-12 h-12 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-slate-700 font-medium text-lg">No hay turnos activos</h3>
              <p className="mt-2 text-slate-500 max-w-sm mx-auto">Utiliza la sección superior para iniciar un nuevo turno</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50">
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">ID</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Usuario</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Inicio</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Duración</th>
                    <th className="text-right py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeShifts.map((shift) => {
                    const startTime = new Date(shift.startTime);
                    const now = new Date();
                    const diffMs = now - startTime;
                    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    const duration = `${diffHrs}h ${diffMins}m`;
                    
                    return (
                      <tr key={shift.id} className="hover:bg-slate-50 transition-colors duration-150">
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{shift.id}</td>
                        <td className="py-3.5 px-4 text-slate-700">
                          <div className="flex items-center">
                            <div className="p-1.5 bg-violet-100 text-violet-600 rounded-full mr-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            {shift.user?.name || 'Desconocido'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-sm">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-slate-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatDateTime(shift.startTime)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-3 py-1.5 bg-gradient-to-r from-violet-50 to-fuchsia-100 text-violet-800 rounded-full text-xs font-medium shadow-sm border border-violet-200">
                            <svg className="w-3 h-3 inline-block mr-1 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {duration}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleEndShift(shift.id)}
                              className="flex items-center justify-center px-3 py-1.5 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors hover:shadow-md btn-hover-effect"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Finalizar
                            </button>
                            <button
                              onClick={() => prepareForClosure(shift.id)}
                              className="flex items-center justify-center px-3 py-1.5 text-fuchsia-600 bg-fuchsia-50 rounded-lg hover:bg-fuchsia-100 transition-colors hover:shadow-md btn-hover-effect"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                              Cierre de Caja
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cierre de Caja */}
      {showClosureForm && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-fadeIn">
            <div className="px-6 py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600">
              <div className="flex items-center">
                <div className="p-2 bg-white/20 rounded-lg mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white">Registrar Cierre de Caja</h3>
              </div>
            </div>
            
            <form onSubmit={handleCreateClosure} className="p-6">
              <div className="mb-5">
                <label htmlFor="actualAmount" className="block text-sm font-medium text-slate-700 mb-2">
                  Monto Total Esperado (COP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="actualAmount"
                    name="actualAmount"
                    value={closureData.actualAmount}
                    onChange={handleClosureChange}
                    className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 bg-violet-50"
                    placeholder="0.00"
                    step="0.01"
                    required
                    readOnly
                  />
                  <div className="mt-1.5 flex items-center">
                    <svg className="h-4 w-4 text-violet-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-violet-600">Este es el total calculado de las ventas del turno</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-5">
                <label htmlFor="cashInRegister" className="block text-sm font-medium text-slate-700 mb-2">
                  Efectivo Real en Caja (COP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="cashInRegister"
                    name="cashInRegister"
                    value={closureData.cashInRegister}
                    onChange={handleClosureChange}
                    className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <div className="mt-1.5 flex items-center">
                  <svg className="h-4 w-4 text-amber-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-xs text-amber-600">
                    Este es el monto REAL contado en caja. La diferencia se calculará automáticamente.
                  </span>
                </div>
              </div>
              
              <div className="mb-5">
                <label htmlFor="transferAmount" className="block text-sm font-medium text-slate-700 mb-2">
                  Transferencias Reportadas (COP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-fuchsia-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="transferAmount"
                    name="transferAmount"
                    value={closureData.transferAmount}
                    onChange={handleClosureChange}
                    className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 bg-fuchsia-50"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
                <div className="mt-1.5 flex items-center">
                  <svg className="h-4 w-4 text-fuchsia-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-fuchsia-600">
                    Monto total de transferencias recibidas durante este turno
                  </span>
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
                  Notas Adicionales
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <textarea
                    id="notes"
                    name="notes"
                    value={closureData.notes}
                    onChange={handleClosureChange}
                    rows="3"
                    className="w-full pl-10 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all duration-200"
                    placeholder="Observaciones adicionales sobre el cierre..."
                  ></textarea>
                </div>
              </div>
              
              {/* Cálculo de diferencia */}
              {closureData.cashInRegister && (
                <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-slate-50 to-violet-50 border border-slate-200 neomorphic-card">
                  <h4 className="font-medium text-slate-800 mb-2 flex items-center">
                    <svg className="w-4 h-4 text-violet-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Resumen de Cierre
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-600 flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-violet-400 mr-2"></span>
                      Esperado:
                    </div>
                    <div className="font-medium text-right">${parseFloat(closureData.actualAmount || 0).toLocaleString('es-CO')}</div>
                    
                    <div className="text-slate-600 flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-fuchsia-400 mr-2"></span>
                      En Caja:
                    </div>
                    <div className="font-medium text-right">${parseFloat(closureData.cashInRegister || 0).toLocaleString('es-CO')}</div>
                    
                    <div className="text-slate-600 flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 mr-2"></span>
                      Transferencias:
                    </div>
                    <div className="font-medium text-right">${parseFloat(closureData.transferAmount || 0).toLocaleString('es-CO')}</div>
                    
                    <div className="text-slate-700 font-medium pt-2 border-t flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                      Diferencia:
                    </div>
                    <div className={`font-bold text-right pt-2 border-t ${
                      parseFloat(closureData.cashInRegister) + parseFloat(closureData.transferAmount || 0) - parseFloat(closureData.actualAmount || 0) < 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      ${(parseFloat(closureData.cashInRegister) + parseFloat(closureData.transferAmount || 0) - parseFloat(closureData.actualAmount || 0)).toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowClosureForm(false)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all duration-200 btn-hover-effect"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center btn-hover-effect"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Registrar Cierre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historial de Turnos */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden neomorphic-card">
        <div className="px-6 py-5 bg-gradient-to-r from-violet-500 to-fuchsia-500 gradient-shift">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-white/20 rounded-lg mr-3 icon-pop">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Historial de Turnos</h3>
            </div>
            <span className="bg-white/20 text-white text-sm font-medium py-1 px-3 rounded-lg">
              {shifts.length} registros
            </span>
          </div>
        </div>
        <div className="p-6">
          {shifts.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-r from-slate-50 to-fuchsia-50 rounded-xl animate-fadeIn">
              <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner neomorphic-card">
                <svg className="w-12 h-12 text-fuchsia-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="mt-4 text-slate-700 font-medium text-lg">No hay turnos registrados</h3>
              <p className="mt-2 text-slate-500 max-w-sm mx-auto">Una vez que inicies turnos, podrás ver su historial aquí</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50">
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">ID</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Usuario</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Inicio</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Fin</th>
                    <th className="text-center py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Estado</th>
                    <th className="text-center py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Cierre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{shift.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center">
                          <div className="p-1 bg-violet-100 text-violet-600 rounded-full mr-2">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <span className="text-slate-700">{shift.user?.name || 'Desconocido'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-sm">
                        <div className="flex items-center">
                          <svg className="w-3.5 h-3.5 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDateTime(shift.startTime)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-sm">
                        {shift.endTime ? (
                          <div className="flex items-center">
                            <svg className="w-3.5 h-3.5 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDateTime(shift.endTime)}
                          </div>
                        ) : (
                          <span className="text-slate-400">En progreso</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {shift.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 shadow-sm border border-green-200 glow-effect">
                            <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 shadow-sm border border-slate-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Finalizado
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {shift.shiftClosure ? (
                          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-fuchsia-100 text-fuchsia-800 shadow-sm border border-fuchsia-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Cerrado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 shadow-sm border border-amber-200">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShiftManagement;
