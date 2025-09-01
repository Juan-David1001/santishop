import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { RiArrowUpLine, RiArrowDownLine, RiRefreshLine, RiCalendarLine, RiBarChartBoxLine, RiPieChartLine, RiLineChartLine } from 'react-icons/ri';

// Registrar los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('day'); // 'day', 'week', 'month'
  const [refreshing, setRefreshing] = useState(false);
  const [salesData, setSalesData] = useState({
    day: { total: 0, byMethod: {}, hourly: [] },
    week: { total: 0, byMethod: {}, daily: [] },
    month: { total: 0, byMethod: {}, daily: [] }
  });
  const [paymentsData, setPaymentsData] = useState({
    day: { total: 0, bySupplier: {}, hourly: [] },
    week: { total: 0, bySupplier: {}, daily: [] },
    month: { total: 0, bySupplier: {}, daily: [] }
  });
  const [recentTransactions, setRecentTransactions] = useState({
    sales: [],
    payments: []
  });

  // Obtener fecha de hoy, inicio de semana y mes en formato ISO
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getWeekStartDate = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 es domingo, 1 es lunes, etc.
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajuste si es domingo
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const getMonthStartDate = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  };

  // Función para procesar los datos de ventas por hora (para datos diarios)
  const processHourlySales = (sales) => {
    const hourlyData = Array(24).fill(0);
    
    sales.forEach(sale => {
      const hour = new Date(sale.createdAt).getHours();
      hourlyData[hour] += parseFloat(sale.amount);
    });
    
    return hourlyData;
  };

  // Función para procesar los datos de ventas por día (para datos semanales y mensuales)
  const processDailySales = (sales, startDate, days) => {
    const dailyData = Array(days).fill(0);
    const start = new Date(startDate);
    
    sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      const diffTime = Math.abs(date - start);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < days) {
        dailyData[diffDays] += parseFloat(sale.amount);
      }
    });
    
    return dailyData;
  };

  // Función para procesar los datos de pagos por proveedor
  const processPaymentsBySupplier = (payments) => {
    const suppliers = {};
    
    payments.forEach(payment => {
      const supplier = payment.supplier;
      if (!suppliers[supplier]) {
        suppliers[supplier] = 0;
      }
      suppliers[supplier] += parseFloat(payment.amount);
    });
    
    return suppliers;
  };

  // Cargar todos los datos necesarios
  const fetchAllData = useCallback(async () => {
    try {
      setRefreshing(true);
      setLoading(true);
      
      // Fechas para filtrado
      const todayDate = getTodayDate();
      const weekStartDate = getWeekStartDate();
      const monthStartDate = getMonthStartDate();
      
      // Cargar datos del día actual
      const dailySalesRes = await apiClient.get('/sales', { 
        params: { startDate: todayDate, endDate: todayDate, fullLoad: true }
      });
      const dailyPaymentsRes = await apiClient.get('/supplier-payments', {
        params: { startDate: todayDate, endDate: todayDate, fullLoad: true }
      });
      
      // Cargar datos de la semana
      const weeklySalesRes = await apiClient.get('/sales', {
        params: { startDate: weekStartDate, endDate: todayDate, fullLoad: true }
      });
      const weeklyPaymentsRes = await apiClient.get('/supplier-payments', {
        params: { startDate: weekStartDate, endDate: todayDate, fullLoad: true }
      });
      
      // Cargar datos del mes
      const monthlySalesRes = await apiClient.get('/sales', {
        params: { startDate: monthStartDate, endDate: todayDate, fullLoad: true }
      });
      const monthlyPaymentsRes = await apiClient.get('/supplier-payments', {
        params: { startDate: monthStartDate, endDate: todayDate, fullLoad: true }
      });
      
      // Procesar datos de ventas
      setSalesData({
        day: {
          total: dailySalesRes.data.totals.total,
          byMethod: dailySalesRes.data.totals.byPaymentMethod,
          hourly: processHourlySales(dailySalesRes.data.sales)
        },
        week: {
          total: weeklySalesRes.data.totals.total,
          byMethod: weeklySalesRes.data.totals.byPaymentMethod,
          daily: processDailySales(weeklySalesRes.data.sales, weekStartDate, 7)
        },
        month: {
          total: monthlySalesRes.data.totals.total,
          byMethod: monthlySalesRes.data.totals.byPaymentMethod,
          daily: processDailySales(monthlySalesRes.data.sales, monthStartDate, 31)
        }
      });
      
      // Procesar datos de pagos
      setPaymentsData({
        day: {
          total: dailyPaymentsRes.data.totals.total,
          bySupplier: processPaymentsBySupplier(dailyPaymentsRes.data.payments),
          hourly: processHourlySales(dailyPaymentsRes.data.payments)
        },
        week: {
          total: weeklyPaymentsRes.data.totals.total,
          bySupplier: processPaymentsBySupplier(weeklyPaymentsRes.data.payments),
          daily: processDailySales(weeklyPaymentsRes.data.payments, weekStartDate, 7)
        },
        month: {
          total: monthlyPaymentsRes.data.totals.total,
          bySupplier: processPaymentsBySupplier(monthlyPaymentsRes.data.payments),
          daily: processDailySales(monthlyPaymentsRes.data.payments, monthStartDate, 31)
        }
      });
      
      // Obtener las transacciones más recientes
      setRecentTransactions({
        sales: dailySalesRes.data.sales
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5),
        payments: dailyPaymentsRes.data.payments
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      });
      
      setError('');
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
      setError('Error al cargar los datos del dashboard');
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    
    // Actualizar datos cada 5 minutos
    const intervalId = setInterval(fetchAllData, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchAllData]);

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'COP' 
    }).format(amount);
  };

  // Función para formatear fechas
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Configuración de las gráficas
  const salesLineChartConfig = {
    day: {
      labels: [...Array(24).keys()].map(hour => `${hour}:00`),
      datasets: [
        {
          label: 'Ventas',
          data: salesData.day.hourly,
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(99, 102, 241)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(99, 102, 241)',
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2
        }
      ]
    },
    week: {
      labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      datasets: [
        {
          label: 'Ventas',
          data: salesData.week.daily,
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(99, 102, 241)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(99, 102, 241)',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2
        }
      ]
    },
    month: {
      labels: [...Array(31).keys()].map(day => `${day + 1}`),
      datasets: [
        {
          label: 'Ventas',
          data: salesData.month.daily,
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(99, 102, 241)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(99, 102, 241)',
          pointRadius: 2,
          pointHoverRadius: 4,
          borderWidth: 2
        }
      ]
    }
  };

  const paymentsLineChartConfig = {
    day: {
      labels: [...Array(24).keys()].map(hour => `${hour}:00`),
      datasets: [
        {
          label: 'Pagos',
          data: paymentsData.day.hourly,
          borderColor: 'rgb(244, 63, 94)',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(244, 63, 94)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(244, 63, 94)',
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2
        }
      ]
    },
    week: {
      labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
      datasets: [
        {
          label: 'Pagos',
          data: paymentsData.week.daily,
          borderColor: 'rgb(244, 63, 94)',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(244, 63, 94)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(244, 63, 94)',
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2
        }
      ]
    },
    month: {
      labels: [...Array(31).keys()].map(day => `${day + 1}`),
      datasets: [
        {
          label: 'Pagos',
          data: paymentsData.month.daily,
          borderColor: 'rgb(244, 63, 94)',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(244, 63, 94)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(244, 63, 94)',
          pointRadius: 2,
          pointHoverRadius: 4,
          borderWidth: 2
        }
      ]
    }
  };

  const salesByMethodChartConfig = {
    labels: Object.keys(salesData[activeTab].byMethod).map(method => 
      method === 'efectivo' ? 'Efectivo' : 
      method === 'transferencia' ? 'Transferencia' : 
      method === 'tarjeta' ? 'Tarjeta' : 
      method === 'credito' ? 'Crédito' :
      method === 'cheque' ? 'Cheque' :
      method === 'otro' ? 'Otro' : method
    ),
    datasets: [
      {
        label: 'Método de Pago',
        data: Object.values(salesData[activeTab].byMethod),
        backgroundColor: [
          'rgba(99, 102, 241, 0.85)',  // indigo-500
          'rgba(14, 165, 233, 0.85)',  // sky-500
          'rgba(168, 85, 247, 0.85)',  // purple-500
          'rgba(249, 115, 22, 0.85)',  // orange-500
          'rgba(236, 72, 153, 0.85)',  // pink-500
          'rgba(107, 114, 128, 0.85)'  // gray-500
        ],
        borderColor: [
          'rgb(79, 70, 229)',  // indigo-600
          'rgb(2, 132, 199)',  // sky-600
          'rgb(147, 51, 234)', // purple-600
          'rgb(234, 88, 12)',  // orange-600
          'rgb(219, 39, 119)', // pink-600
          'rgb(75, 85, 99)'    // gray-600
        ],
        borderWidth: 2,
        borderRadius: 4,
        hoverOffset: 15,
        hoverBorderWidth: 3,
        spacing: 4,
        weight: 1
      }
    ]
  };

  const paymentsBySupplierChartConfig = {
    labels: Object.keys(paymentsData[activeTab].bySupplier).slice(0, 5),
    datasets: [
      {
        label: 'Pagos por Proveedor',
        data: Object.values(paymentsData[activeTab].bySupplier).slice(0, 5),
        backgroundColor: [
          'rgba(244, 63, 94, 0.85)',   // rose-500
          'rgba(249, 115, 22, 0.85)',  // orange-500
          'rgba(168, 85, 247, 0.85)',  // purple-500
          'rgba(20, 184, 166, 0.85)',  // teal-500
          'rgba(75, 85, 99, 0.85)'     // gray-500
        ],
        borderColor: [
          'rgb(225, 29, 72)',    // rose-600
          'rgb(234, 88, 12)',    // orange-600
          'rgb(147, 51, 234)',   // purple-600
          'rgb(13, 148, 136)',   // teal-600
          'rgb(55, 65, 81)'      // gray-700
        ],
        borderWidth: 2,
        borderRadius: 8,
        hoverBorderWidth: 3,
        barThickness: 30,
        maxBarThickness: 40,
        borderSkipped: false,
        hoverBackgroundColor: [
          'rgba(244, 63, 94, 0.95)',  // rose-500
          'rgba(249, 115, 22, 0.95)', // orange-500
          'rgba(168, 85, 247, 0.95)', // purple-500
          'rgba(20, 184, 166, 0.95)', // teal-500
          'rgba(75, 85, 99, 0.95)'    // gray-500
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 12,
            family: 'Inter, system-ui, sans-serif'
          },
          padding: 15,
          usePointStyle: true,
          boxWidth: 8
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)', // slate-900
        titleColor: '#fff',
        bodyColor: '#fff',
        bodyFont: {
          family: 'Inter, system-ui, sans-serif'
        },
        titleFont: {
          family: 'Inter, system-ui, sans-serif',
          weight: 'bold'
        },
        padding: 12,
        boxPadding: 6,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += new Intl.NumberFormat('es-ES', { 
                style: 'currency', 
                currency: 'COP',
                minimumFractionDigits: 0
              }).format(context.parsed.y || context.parsed);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10,
            family: 'Inter, system-ui, sans-serif'
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(203, 213, 225, 0.15)' // slate-200
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, system-ui, sans-serif'
          },
          callback: function(value) {
            return new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'COP',
              notation: 'compact',
              minimumFractionDigits: 0,
              maximumFractionDigits: 1
            }).format(value);
          }
        }
      }
    },
    elements: {
      line: {
        borderWidth: 2,
      },
      point: {
        radius: 3,
        hoverRadius: 5
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  // Cambiar entre pestañas de día, semana y mes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  // Obtener el título según la pestaña activa
  const getTabTitle = () => {
    switch (activeTab) {
      case 'day': return 'Hoy';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mes';
      default: return 'Hoy';
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
                  <div className="h-8 bg-slate-200 rounded w-32"></div>
                </div>
                <div className="rounded-full bg-slate-200 h-12 w-12"></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="h-6 bg-slate-200 rounded w-48"></div>
              </div>
              <div className="p-6 animate-pulse" style={{ height: '300px' }}>
                <div className="flex items-center justify-center h-full">
                  <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getPercentageChange = (currentValue, previousValue) => {
    if (previousValue === 0) return 100;
    return ((currentValue - previousValue) / previousValue) * 100;
  };

  // Calcular algunos indicadores de cambio para mostrar
  const salesDayChange = getPercentageChange(
    salesData.day.total,
    salesData.day.total > 0 ? salesData.day.total * 0.8 : 0 // Simulado para ejemplo
  );

  const paymentsDayChange = getPercentageChange(
    paymentsData.day.total,
    paymentsData.day.total > 0 ? paymentsData.day.total * 1.1 : 0 // Simulado para ejemplo
  );

  const balanceChange = getPercentageChange(
    salesData.day.total - paymentsData.day.total,
    (salesData.day.total - paymentsData.day.total) * 0.9 // Simulado para ejemplo
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        
        <button 
          onClick={() => {
            toast.promise(
              fetchAllData(),
              {
                loading: 'Actualizando datos...',
                success: 'Datos actualizados correctamente',
                error: 'Error al actualizar los datos'
              }
            );
          }}
          disabled={refreshing}
          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-all duration-200"
        >
          <RiRefreshLine className={`text-lg ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualizando...' : 'Actualizar datos'}
        </button>
      </div>
      
      {/* Selector de periodos */}
      <div className="bg-white rounded-xl shadow-sm mb-8">
        <div className="flex items-center p-6 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-slate-800">
            <RiCalendarLine className="text-lg text-slate-500" />
            <span className="font-medium">Periodo:</span>
          </div>
          
          <div className="ml-auto flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => handleTabChange('day')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'day' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => handleTabChange('week')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'week' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Esta semana
            </button>
            <button
              onClick={() => handleTabChange('month')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === 'month' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Este mes
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex items-center">
            <span className="text-sm text-slate-500">
              {activeTab === 'day' && `${new Date().toLocaleDateString('es-ES', {day: 'numeric', month: 'long', year: 'numeric'})}`}
              {activeTab === 'week' && `${new Date(getWeekStartDate()).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})} - ${new Date().toLocaleDateString('es-ES', {day: 'numeric', month: 'long', year: 'numeric'})}`}
              {activeTab === 'month' && `${new Date(getMonthStartDate()).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})} - ${new Date().toLocaleDateString('es-ES', {day: 'numeric', month: 'long', year: 'numeric'})}`}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-lg mb-8 shadow-sm">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Ventas */}
        <div className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-slate-500">Total Ventas</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                salesDayChange >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {salesDayChange >= 0 ? <RiArrowUpLine /> : <RiArrowDownLine />}
                {Math.abs(salesDayChange).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-full p-2 bg-indigo-50">
              <RiBarChartBoxLine className="text-xl text-indigo-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800">{formatCurrency(salesData[activeTab].total)}</p>
              <p className="text-sm text-slate-500 mt-0.5">{getTabTitle()}</p>
            </div>
          </div>
        </div>

        {/* Total Pagos */}
        <div className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-slate-500">Total Pagos</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                paymentsDayChange <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {paymentsDayChange <= 0 ? <RiArrowUpLine /> : <RiArrowDownLine />}
                {Math.abs(paymentsDayChange).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-full p-2 bg-rose-50">
              <RiBarChartBoxLine className="text-xl text-rose-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-800">{formatCurrency(paymentsData[activeTab].total)}</p>
              <p className="text-sm text-slate-500 mt-0.5">{getTabTitle()}</p>
            </div>
          </div>
        </div>
        
        {/* Balance */}
        <div className="bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-slate-500">Balance</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                balanceChange >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {balanceChange >= 0 ? <RiArrowUpLine /> : <RiArrowDownLine />}
                {Math.abs(balanceChange).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`rounded-full p-2 ${salesData[activeTab].total - paymentsData[activeTab].total >= 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <RiBarChartBoxLine className={`text-xl ${salesData[activeTab].total - paymentsData[activeTab].total >= 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <p className={`text-3xl font-bold text-slate-800`}>
                {formatCurrency(salesData[activeTab].total - paymentsData[activeTab].total)}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">{getTabTitle()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfica de ventas */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <RiLineChartLine className="text-lg text-indigo-600" />
              <h3 className="text-lg font-medium text-slate-800">Ventas por {activeTab === 'day' ? 'Hora' : 'Día'}</h3>
            </div>
            <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {activeTab === 'day' ? 'Hoy' : activeTab === 'week' ? '7 días' : '30 días'}
            </span>
          </div>
          <div className="p-6" style={{ height: '300px' }}>
            <Line 
              data={salesLineChartConfig[activeTab]} 
              options={chartOptions} 
            />
          </div>
        </div>

        {/* Gráfica de pagos */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <RiLineChartLine className="text-lg text-rose-600" />
              <h3 className="text-lg font-medium text-slate-800">Pagos por {activeTab === 'day' ? 'Hora' : 'Día'}</h3>
            </div>
            <span className="bg-rose-50 text-rose-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {activeTab === 'day' ? 'Hoy' : activeTab === 'week' ? '7 días' : '30 días'}
            </span>
          </div>
          <div className="p-6" style={{ height: '300px' }}>
            <Line 
              data={paymentsLineChartConfig[activeTab]} 
              options={chartOptions} 
            />
          </div>
        </div>
      </div>

      {/* Gráficas circulares */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Ventas por método de pago */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <RiPieChartLine className="text-lg text-indigo-600" />
              <h3 className="text-lg font-medium text-slate-800">Ventas por Método de Pago</h3>
            </div>
            <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {getTabTitle()}
            </span>
          </div>
          <div className="p-6 flex justify-center" style={{ height: '300px' }}>
            {Object.keys(salesData[activeTab].byMethod).length > 0 ? (
              <Doughnut 
                data={salesByMethodChartConfig} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'bottom'
                    }
                  }
                }} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <p>No hay datos disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* Pagos por proveedor */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <RiBarChartBoxLine className="text-lg text-rose-600" />
              <h3 className="text-lg font-medium text-slate-800">Top 5 Pagos por Proveedor</h3>
            </div>
            <span className="bg-rose-50 text-rose-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {getTabTitle()}
            </span>
          </div>
          <div className="p-6 flex justify-center" style={{ height: '300px' }}>
            {Object.keys(paymentsData[activeTab].bySupplier).length > 0 ? (
              <Bar 
                data={paymentsBySupplierChartConfig} 
                options={{
                  ...chartOptions,
                  indexAxis: 'y',
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      display: false
                    }
                  }
                }} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>No hay datos disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transacciones recientes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Ventas recientes */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiLineChartLine className="text-lg text-indigo-600" />
                <h3 className="text-lg font-medium text-slate-800">Ventas Recientes</h3>
              </div>
              {recentTransactions.sales.length > 0 && (
                <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {recentTransactions.sales.length} {recentTransactions.sales.length === 1 ? 'transacción' : 'transacciones'}
                </span>
              )}
            </div>
          </div>
          <div className="p-6">
            {recentTransactions.sales.length === 0 ? (
              <div className="text-center py-10">
                <svg className="w-16 h-16 mx-auto text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-4 text-slate-500">No hay ventas recientes</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Método</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTransactions.sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-slate-600">{formatDate(sale.createdAt)}</td>
                        <td className="py-3 px-4 text-sm capitalize">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                            sale.paymentMethod === 'efectivo' ? 'bg-emerald-100 text-emerald-800' :
                            sale.paymentMethod === 'tarjeta' ? 'bg-indigo-100 text-indigo-800' :
                            sale.paymentMethod === 'transferencia' ? 'bg-sky-100 text-sky-800' :
                            sale.paymentMethod === 'credito' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-indigo-600">{formatCurrency(sale.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Pagos recientes */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiLineChartLine className="text-lg text-rose-600" />
                <h3 className="text-lg font-medium text-slate-800">Pagos Recientes a Proveedores</h3>
              </div>
              {recentTransactions.payments.length > 0 && (
                <span className="bg-rose-50 text-rose-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {recentTransactions.payments.length} {recentTransactions.payments.length === 1 ? 'transacción' : 'transacciones'}
                </span>
              )}
            </div>
          </div>
          <div className="p-6">
            {recentTransactions.payments.length === 0 ? (
              <div className="text-center py-10">
                <svg className="w-16 h-16 mx-auto text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-4 text-slate-500">No hay pagos recientes</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Proveedor</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTransactions.payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-slate-600">{formatDate(payment.createdAt)}</td>
                        <td className="py-3 px-4 text-sm text-slate-800 font-medium">{payment.supplier}</td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-rose-600">{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
