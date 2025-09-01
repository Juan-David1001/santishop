import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';

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
  Legend,
  Filler
);

function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('sales'); // sales, products, stock, payments, balance
  const [period, setPeriod] = useState('week'); // day, week, month
  
  // Estados para reportes
  const [salesReport, setSalesReport] = useState({
    data: [],
    summary: { totalSales: 0, totalProfit: 0 }
  });
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState({ 
    outOfStock: [], critical: [], warning: [] 
  });
  const [paymentStatus, setPaymentStatus] = useState({
    pending: [], partiallyPaid: [], paid: []
  });
  const [generalBalance, setGeneralBalance] = useState({
    inventory: { value: 0 },
    sales: { totalSales: 0 },
    profit: { grossProfit: 0 },
    debt: { total: 0 }
  });

  useEffect(() => {
    if (activeTab === 'sales') {
      fetchSalesReport(period);
    } else if (activeTab === 'products') {
      fetchTopProducts();
    } else if (activeTab === 'stock') {
      fetchLowStockAlerts();
    } else if (activeTab === 'payments') {
      fetchPaymentStatus();
    } else if (activeTab === 'balance') {
      fetchGeneralBalance();
    }
  }, [activeTab, period]);

  // Función para obtener reportes de ventas
  const fetchSalesReport = async (selectedPeriod) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/sales', {
        params: { period: selectedPeriod }
      });
      setSalesReport(response.data);
      setError('');
    } catch (err) {
      console.error('Error cargando reporte de ventas:', err);
      setError('Error al cargar el reporte de ventas');
      toast.error('Error al cargar el reporte de ventas');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener productos más vendidos
  const fetchTopProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/top-products', {
        params: { limit: 10 }
      });
      setTopProducts(response.data.topProducts || []);
      setError('');
    } catch (err) {
      console.error('Error cargando productos top:', err);
      setError('Error al cargar los productos más vendidos');
      toast.error('Error al cargar los productos más vendidos');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener alertas de stock bajo
  const fetchLowStockAlerts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/low-stock');
      setLowStockAlerts(response.data.alerts || { outOfStock: [], critical: [], warning: [] });
      setError('');
    } catch (err) {
      console.error('Error cargando alertas de stock:', err);
      setError('Error al cargar las alertas de stock');
      toast.error('Error al cargar las alertas de stock');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener estado de pagos
  const fetchPaymentStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/payment-status');
      setPaymentStatus(response.data.purchases || { pending: [], partiallyPaid: [], paid: [] });
      setError('');
    } catch (err) {
      console.error('Error cargando estado de pagos:', err);
      setError('Error al cargar el estado de pagos');
      toast.error('Error al cargar el estado de pagos');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener balance general
  const fetchGeneralBalance = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/reports/general-balance');
      setGeneralBalance(response.data);
      setError('');
    } catch (err) {
      console.error('Error cargando balance general:', err);
      setError('Error al cargar el balance general');
      toast.error('Error al cargar el balance general');
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Función para formatear porcentajes
  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`;
  };

  // Configuración para el gráfico de ventas
  const salesChartConfig = {
    labels: salesReport.data.map(item => item.period),
    datasets: [
      {
        label: 'Ventas',
        data: salesReport.data.map(item => item.total),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 2,
        tension: 0.4,
        fill: false
      },
      {
        label: 'Ganancias',
        data: salesReport.data.map(item => item.profit),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderWidth: 2,
        tension: 0.4,
        fill: false
      }
    ]
  };

  // Configuración para el gráfico de productos top
  const topProductsChartConfig = {
    labels: topProducts.map(product => product.name),
    datasets: [
      {
        label: 'Cantidad Vendida',
        data: topProducts.map(product => product.quantitySold),
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(199, 199, 199, 0.7)',
          'rgba(83, 102, 255, 0.7)',
          'rgba(40, 159, 64, 0.7)',
          'rgba(210, 199, 199, 0.7)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Configuración para el gráfico de alertas de stock
  const stockAlertsChartConfig = {
    labels: ['Sin Stock', 'Crítico', 'Alerta'],
    datasets: [
      {
        data: [
          lowStockAlerts.outOfStock.length,
          lowStockAlerts.critical.length,
          lowStockAlerts.warning.length
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(255, 205, 86, 0.8)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(255, 159, 64)',
          'rgb(255, 205, 86)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Configuración para el gráfico de estado de pagos
  const paymentStatusChartConfig = {
    labels: ['Pendiente', 'Parcial', 'Pagado'],
    datasets: [
      {
        data: [
          paymentStatus.pending.length,
          paymentStatus.partiallyPaid.length,
          paymentStatus.paid.length
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)'
        ],
        borderWidth: 1,
        hoverOffset: 4
      }
    ]
  };

  // Configuración para el gráfico del balance general
  const balanceChartConfig = {
    labels: ['Ventas', 'Valor Inventario', 'Deuda'],
    datasets: [
      {
        data: [
          generalBalance.sales?.totalSales || 0,
          generalBalance.inventory?.value || 0,
          generalBalance.debt?.total || 0
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)'
        ],
        borderColor: [
          'rgb(75, 192, 192)',
          'rgb(54, 162, 235)',
          'rgb(255, 99, 132)'
        ],
        borderWidth: 1
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
            size: 12
          },
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        bodyFont: {
          size: 13
        },
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== undefined) {
              // Para gráficos de ventas y balance que usan moneda
              if (activeTab === 'sales' || activeTab === 'balance') {
                label += formatCurrency(context.parsed.y || context.parsed);
              } else {
                label += context.parsed.y || context.parsed;
              }
            }
            return label;
          }
        }
      }
    },
    scales: activeTab === 'sales' ? {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    } : undefined
  };

  const periodOptions = [
    { value: 'day', label: 'Día' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-700 rounded-lg shadow-lg mr-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Reportes</h1>
            <p className="text-sm text-slate-500">Análisis estadístico y métricas de negocio</p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            if (activeTab === 'sales') {
              fetchSalesReport(period);
            } else if (activeTab === 'products') {
              fetchTopProducts();
            } else if (activeTab === 'stock') {
              fetchLowStockAlerts();
            } else if (activeTab === 'payments') {
              fetchPaymentStatus();
            } else if (activeTab === 'balance') {
              fetchGeneralBalance();
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar datos
        </button>
      </div>

      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Pestañas de navegación */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="flex flex-wrap text-sm font-medium text-center">
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center justify-center py-4 px-6 transition-all ${activeTab === 'sales' 
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ventas
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center justify-center py-4 px-6 transition-all ${activeTab === 'products' 
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Productos
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center justify-center py-4 px-6 transition-all ${activeTab === 'stock' 
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Stock
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center justify-center py-4 px-6 transition-all ${activeTab === 'payments' 
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Pagos
            </button>
            <button
              onClick={() => setActiveTab('balance')}
              className={`flex items-center justify-center py-4 px-6 transition-all ${activeTab === 'balance' 
                ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Balance
            </button>
          </div>
        </div>
      </div>

      {/* Contenido según la pestaña activa */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-80 bg-white rounded-xl shadow-md">
          <div className="relative w-20 h-20">
            <div className="absolute top-0 mt-1 w-20 h-20 border-4 border-fuchsia-200 rounded-full"></div>
            <div className="absolute top-0 mt-1 w-20 h-20 border-4 border-transparent rounded-full animate-spin border-t-fuchsia-600 border-l-fuchsia-600"></div>
          </div>
          <p className="mt-4 text-fuchsia-800 font-medium">Cargando datos...</p>
          <p className="text-sm text-slate-500 mt-2">Estamos procesando la información solicitada</p>
        </div>
      ) : (
        <>
          {/* Pestaña de Ventas */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {/* Selector de período */}
              <div className="bg-white p-6 rounded-xl shadow-md flex flex-wrap items-center gap-4">
                <div className="flex items-center">
                  <div className="p-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
                    <svg className="w-5 h-5 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <label className="text-slate-700 font-medium">Seleccionar Período:</label>
                </div>
                <div className="inline-flex rounded-xl shadow-sm">
                  {periodOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setPeriod(option.value)}
                      className={`px-5 py-3 text-sm font-medium transition-all transform ${
                        period === option.value 
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md hover:shadow-lg -translate-y-0.5'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                      } ${
                        option.value === 'day'
                          ? 'rounded-l-xl'
                          : option.value === 'month'
                            ? 'rounded-r-xl'
                            : ''
                      } border border-slate-200`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tarjetas de resumen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start mb-4">
                    <div className="p-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
                      <svg className="w-6 h-6 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-800">Total Ventas</h3>
                      <p className="text-sm text-slate-500">{salesReport.data.length} ventas en el período</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">{formatCurrency(salesReport.summary.totalSales)}</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start mb-4">
                    <div className="p-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
                      <svg className="w-6 h-6 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-800">Total Ganancias</h3>
                      <p className="text-sm text-slate-500">Margen: {formatPercent(salesReport.summary.profitMargin)}</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">{formatCurrency(salesReport.summary.totalProfit)}</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start mb-4">
                    <div className="p-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
                      <svg className="w-6 h-6 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-800">Promedio por {period === 'day' ? 'Día' : period === 'week' ? 'Semana' : 'Mes'}</h3>
                      <p className="text-sm text-slate-500">{salesReport.data.length} períodos analizados</p>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">{formatCurrency(salesReport.summary.averageSalesPerPeriod)}</p>
                </div>
              </div>

              {/* Gráfico de ventas */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4m0 10v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2h-3" />
                      </svg>
                      Ventas y Ganancias por {period === 'day' ? 'Día' : period === 'week' ? 'Semana' : 'Mes'}
                    </h3>
                    <div className="text-sm text-white opacity-80">
                      {salesReport.data.length} registros
                    </div>
                  </div>
                </div>
                <div className="p-6" style={{ height: '400px' }}>
                  {salesReport.data.length > 0 ? (
                    <Line 
                      data={{
                        labels: salesReport.data.map(item => item.period),
                        datasets: [
                          {
                            label: 'Ventas',
                            data: salesReport.data.map(item => item.total),
                            borderColor: 'rgb(139, 92, 246)', // violet-500
                            backgroundColor: 'rgba(139, 92, 246, 0.2)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: 'rgb(139, 92, 246)',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: 'rgb(139, 92, 246)',
                            pointRadius: 4,
                            pointHoverRadius: 6,
                          },
                          {
                            label: 'Ganancias',
                            data: salesReport.data.map(item => item.profit),
                            borderColor: 'rgb(192, 38, 211)', // fuchsia-600
                            backgroundColor: 'rgba(192, 38, 211, 0.2)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: 'rgb(192, 38, 211)',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: 'rgb(192, 38, 211)',
                            pointRadius: 4,
                            pointHoverRadius: 6,
                          }
                        ]
                      }} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              font: {
                                size: 13,
                                family: "'Inter', sans-serif"
                              },
                              usePointStyle: true,
                              boxWidth: 8,
                              padding: 15
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                            titleFont: {
                              size: 14,
                              weight: 'bold',
                              family: "'Inter', sans-serif"
                            },
                            bodyFont: {
                              size: 13,
                              family: "'Inter', sans-serif"
                            },
                            padding: 12,
                            cornerRadius: 8,
                            displayColors: true,
                            usePointStyle: true,
                            callbacks: {
                              label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                  label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                  label += formatCurrency(context.parsed.y);
                                }
                                return label;
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            grid: {
                              display: false,
                              drawBorder: false,
                            },
                            ticks: {
                              font: {
                                size: 12,
                                family: "'Inter', sans-serif"
                              },
                              maxRotation: 45,
                              minRotation: 45,
                              color: '#6B7280'
                            }
                          },
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(243, 244, 246, 1)',
                              drawBorder: false
                            },
                            ticks: {
                              font: {
                                size: 12,
                                family: "'Inter', sans-serif"
                              },
                              color: '#6B7280',
                              callback: function(value) {
                                return formatCurrency(value);
                              }
                            }
                          }
                        }
                      }} 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="p-6 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-full mb-4">
                        <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-slate-600">No hay datos de ventas disponibles</p>
                      <p className="mt-2 text-sm text-slate-500">Selecciona otro período o verifica la información</p>
                      <button className="mt-4 px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-lg shadow hover:shadow-lg transform transition-all duration-200">
                        Cargar datos
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pestaña de Productos */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Productos Más Vendidos
                    </h3>
                    <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs text-white">
                      Top {topProducts.length}
                    </span>
                  </div>
                </div>
                <div className="p-6" style={{ height: '400px' }}>
                  {topProducts.length > 0 ? (
                    <Bar 
                      data={{
                        labels: topProducts.map(product => product.name),
                        datasets: [
                          {
                            label: 'Cantidad Vendida',
                            data: topProducts.map(product => product.quantitySold),
                            backgroundColor: [
                              'rgba(139, 92, 246, 0.8)',  // violet
                              'rgba(192, 38, 211, 0.8)',  // fuchsia
                              'rgba(219, 39, 119, 0.8)',  // pink
                              'rgba(236, 72, 153, 0.8)',  // pink-500
                              'rgba(244, 114, 182, 0.8)', // pink-400
                              'rgba(167, 139, 250, 0.8)', // violet-400
                              'rgba(139, 92, 246, 0.7)',  // violet lighter
                              'rgba(192, 38, 211, 0.7)',  // fuchsia lighter
                              'rgba(219, 39, 119, 0.7)',  // pink lighter
                              'rgba(236, 72, 153, 0.7)',  // pink-500 lighter
                            ],
                            borderWidth: 0,
                            borderRadius: 6,
                            hoverOffset: 4,
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                          legend: {
                            display: false
                          },
                          tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                            titleFont: {
                              size: 14,
                              weight: 'bold',
                              family: "'Inter', sans-serif"
                            },
                            bodyFont: {
                              size: 13,
                              family: "'Inter', sans-serif"
                            },
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                              label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                  label += ': ';
                                }
                                if (context.parsed.x !== null) {
                                  label += context.parsed.x + ' unidades';
                                }
                                return label;
                              },
                              afterLabel: function(context) {
                                const index = context.dataIndex;
                                const product = topProducts[index];
                                return [
                                  `Ventas: ${formatCurrency(product.totalSales || 0)}`,
                                  `Ganancia: ${formatCurrency(product.profit || 0)}`
                                ];
                              }
                            }
                          }
                        },
                        scales: {
                          x: {
                            grid: {
                              display: false,
                              drawBorder: false,
                            },
                            ticks: {
                              font: {
                                size: 12,
                                family: "'Inter', sans-serif"
                              },
                              color: '#6B7280'
                            }
                          },
                          y: {
                            grid: {
                              display: false,
                              drawBorder: false
                            },
                            ticks: {
                              font: {
                                size: 12,
                                family: "'Inter', sans-serif"
                              },
                              color: '#6B7280'
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="p-6 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-full mb-4">
                        <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-slate-600">No hay datos de productos disponibles</p>
                      <p className="mt-2 text-sm text-slate-500">No se encontraron registros de ventas por producto</p>
                      <button className="mt-4 px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-lg shadow hover:shadow-lg transform transition-all duration-200">
                        Cargar datos
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista detallada de productos top */}
              {topProducts.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-600">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-white flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Detalle de Productos Más Vendidos
                      </h3>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center bg-white bg-opacity-20 rounded-full px-3 py-1">
                          <svg className="w-4 h-4 text-white mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-white">Estadísticas detalladas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead>
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-tl-lg">Producto</th>
                          <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Cantidad</th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Ventas</th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Ganancia</th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-tr-lg">Stock Actual</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {topProducts.map((product, index) => (
                          <tr key={index} className="hover:bg-slate-50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
                                  <span className="font-semibold text-xs text-fuchsia-700">#{index + 1}</span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-slate-900">{product.name}</div>
                                  <div className="text-xs text-slate-500">{product.category}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm font-semibold text-slate-900">{product.quantitySold}</div>
                              <div className="text-xs text-slate-500">unidades</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-semibold text-slate-900">{formatCurrency(product.totalSales)}</div>
                              <div className="text-xs text-slate-500">{Math.round(product.quantitySold * 100 / topProducts.reduce((sum, p) => sum + p.quantitySold, 0))}% del total</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-sm font-medium text-emerald-600">{formatCurrency(product.profit)}</div>
                              <div className="text-xs text-slate-500">{formatPercent(product.profitMargin)} margen</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className={`px-3 py-1.5 inline-flex text-xs font-medium rounded-full ${
                                product.currentStock === 0 
                                  ? 'bg-red-100 text-red-800' 
                                  : product.currentStock <= 5
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {product.currentStock} en stock
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pestaña de Stock */}
          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start mb-4">
                    <div className="p-2 bg-red-100 rounded-lg shadow-inner mr-3">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-800">Sin Stock</h3>
                      <p className="text-sm text-slate-500">Productos agotados</p>
                    </div>
                  </div>
                  <div className="flex items-baseline mt-2">
                    <p className="text-3xl font-bold text-red-600">{lowStockAlerts.outOfStock.length}</p>
                    <p className="ml-2 text-sm text-slate-500">productos</p>
                  </div>
                  {lowStockAlerts.outOfStock.length > 0 && (
                    <div className="mt-3 flex justify-end">
                      <button className="text-xs text-red-600 font-medium hover:text-red-800 flex items-center">
                        Ver detalles
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start mb-4">
                    <div className="p-2 bg-amber-100 rounded-lg shadow-inner mr-3">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-800">Stock Crítico</h3>
                      <p className="text-sm text-slate-500">Requiere atención urgente</p>
                    </div>
                  </div>
                  <div className="flex items-baseline mt-2">
                    <p className="text-3xl font-bold text-amber-600">{lowStockAlerts.critical.length}</p>
                    <p className="ml-2 text-sm text-slate-500">productos</p>
                  </div>
                  {lowStockAlerts.critical.length > 0 && (
                    <div className="mt-3 flex justify-end">
                      <button className="text-xs text-amber-600 font-medium hover:text-amber-800 flex items-center">
                        Ver detalles
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-start mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg shadow-inner mr-3">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-800">Alerta de Stock</h3>
                      <p className="text-sm text-slate-500">Stock bajo mínimo</p>
                    </div>
                  </div>
                  <div className="flex items-baseline mt-2">
                    <p className="text-3xl font-bold text-orange-600">{lowStockAlerts.warning.length}</p>
                    <p className="ml-2 text-sm text-slate-500">productos</p>
                  </div>
                  {lowStockAlerts.warning.length > 0 && (
                    <div className="mt-3 flex justify-end">
                      <button className="text-xs text-orange-600 font-medium hover:text-orange-800 flex items-center">
                        Ver detalles
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Gráfico de estado del stock */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-600">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-white flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                        Distribución de Alertas
                      </h3>
                    </div>
                  </div>
                  <div className="p-6" style={{ height: '300px' }}>
                    <Pie 
                      data={{
                        labels: ['Sin Stock', 'Crítico', 'Alerta'],
                        datasets: [
                          {
                            data: [
                              lowStockAlerts.outOfStock.length,
                              lowStockAlerts.critical.length,
                              lowStockAlerts.warning.length
                            ],
                            backgroundColor: [
                              'rgba(239, 68, 68, 0.8)', // red-500
                              'rgba(245, 158, 11, 0.8)', // amber-500
                              'rgba(249, 115, 22, 0.8)', // orange-500
                            ],
                            borderColor: [
                              'rgb(255, 255, 255)',
                              'rgb(255, 255, 255)',
                              'rgb(255, 255, 255)'
                            ],
                            borderWidth: 2,
                            hoverOffset: 8
                          }
                        ]
                      }} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '35%',
                        plugins: {
                          legend: {
                            position: 'right',
                            labels: {
                              font: {
                                size: 13,
                                family: "'Inter', sans-serif"
                              },
                              usePointStyle: true,
                              padding: 15,
                              boxWidth: 8
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                            titleFont: {
                              size: 14,
                              weight: 'bold',
                              family: "'Inter', sans-serif"
                            },
                            bodyFont: {
                              size: 13,
                              family: "'Inter', sans-serif"
                            },
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                              label: function(context) {
                                const label = context.label || '';
                                const value = context.raw;
                                const total = context.dataset.data.reduce((acc, data) => acc + data, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} productos (${percentage}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-600">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-white flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Productos Sin Stock
                      </h3>
                      <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs text-white">
                        {lowStockAlerts.outOfStock.length} productos
                      </span>
                    </div>
                  </div>
                  <div className="p-6 overflow-y-auto" style={{ maxHeight: '300px' }}>
                    {lowStockAlerts.outOfStock.length > 0 ? (
                      <ul className="space-y-3">
                        {lowStockAlerts.outOfStock.map((product, index) => (
                          <li key={index} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div className="flex justify-between items-start">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
                                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{product.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{product.category} - SKU: {product.sku}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-1 rounded-full">
                                  Agotado
                                </span>
                                {product.recentSales > 0 && (
                                  <div className="flex items-center mt-2 text-xs text-slate-500">
                                    <svg className="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    {product.recentSales} vendidos (30d)
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="p-6 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-full mb-4">
                          <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-slate-700">¡Inventario en buen estado!</p>
                        <p className="mt-2 text-sm text-slate-500">No hay productos sin stock actualmente</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de productos con stock crítico */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Productos con Stock Crítico
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-white bg-opacity-20 rounded-full px-3 py-1">
                        <svg className="w-4 h-4 text-white mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-white">Requieren atención</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 overflow-x-auto">
                  {lowStockAlerts.critical.length > 0 ? (
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead>
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-tl-lg">Producto</th>
                          <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Stock</th>
                          <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Mínimo</th>
                          <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50">Ventas Recientes</th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-tr-lg">Días Restantes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {lowStockAlerts.critical.map((product, index) => (
                          <tr key={index} className="hover:bg-slate-50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                  <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-slate-900">{product.name}</div>
                                  <div className="text-xs text-slate-500">{product.category}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex flex-col items-center">
                                <span className="px-3 py-1.5 inline-flex text-xs font-medium rounded-full bg-red-100 text-red-800">
                                  {product.currentStock}
                                </span>
                                <span className="text-xs text-slate-500 mt-1">unidades</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm font-medium text-slate-700">{product.minimumStock}</div>
                              <div className="text-xs text-slate-500">nivel mínimo</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-sm font-medium text-slate-700">{product.recentSales}</span>
                                <span className="text-xs text-slate-500">últimos 30 días</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {product.daysRemaining !== null ? (
                                <div className="flex flex-col items-end">
                                  <span className={`px-3 py-1 inline-flex text-xs font-medium rounded-full ${
                                    product.daysRemaining <= 3 
                                      ? 'bg-red-100 text-red-800' 
                                      : product.daysRemaining <= 7
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-800'
                                  }`}>
                                    {product.daysRemaining} días
                                  </span>
                                  <span className="text-xs text-slate-500 mt-1">hasta agotarse</span>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-500">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <div className="p-6 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-full mb-4">
                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-slate-700">¡Inventario en buen estado!</p>
                      <p className="mt-2 text-sm text-slate-500">No hay productos con stock crítico actualmente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pestaña de Pagos */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                    <h3 className="text-lg font-medium text-white">Estado de Pagos a Proveedores</h3>
                  </div>
                  <div className="p-6" style={{ height: '300px' }}>
                    <Doughnut data={paymentStatusChartConfig} options={{
                      ...chartOptions,
                      cutout: '60%',
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                    <h3 className="text-lg font-medium text-white">Resumen de Pagos</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Facturas Pendientes</h4>
                        <p className="text-2xl font-bold text-red-600">
                          {paymentStatus.pending.length}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {formatCurrency(paymentStatus.pending.reduce((sum, p) => sum + p.dueAmount, 0))}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Pagos Parciales</h4>
                        <p className="text-2xl font-bold text-yellow-600">
                          {paymentStatus.partiallyPaid.length}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {formatCurrency(paymentStatus.partiallyPaid.reduce((sum, p) => sum + p.dueAmount, 0))}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Facturas Pagadas</h4>
                        <p className="text-2xl font-bold text-green-600">
                          {paymentStatus.paid.length}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {formatCurrency(paymentStatus.paid.reduce((sum, p) => sum + p.totalAmount, 0))}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Total Adeudado</h4>
                        <p className="text-2xl font-bold text-indigo-600">
                          {formatCurrency([
                            ...paymentStatus.pending,
                            ...paymentStatus.partiallyPaid
                          ].reduce((sum, p) => sum + p.dueAmount, 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pagos pendientes */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-red-600 to-red-800">
                  <h3 className="text-lg font-medium text-white">Pagos Pendientes</h3>
                </div>
                <div className="p-6 overflow-x-auto">
                  {paymentStatus.pending.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Compra</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Vencimiento</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pendiente</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paymentStatus.pending.map((payment, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{payment.supplier}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{payment.invoiceNumber || `#${payment.id}`}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                              {new Date(payment.purchaseDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {payment.dueDate ? (
                                <span className={`text-sm ${
                                  new Date(payment.dueDate) < new Date() 
                                    ? 'text-red-600 font-medium' 
                                    : 'text-gray-500'
                                }`}>
                                  {new Date(payment.dueDate).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                              {formatCurrency(payment.totalAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 font-medium">
                              {formatCurrency(payment.dueAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-center py-10 text-gray-500">No hay pagos pendientes</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pestaña de Balance */}
          {activeTab === 'balance' && (
            <div className="space-y-6">
              {/* Tarjetas de balance */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Ventas Acumuladas</h3>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(generalBalance.sales?.totalSales || 0)}</p>
                  <p className="text-sm text-gray-500 mt-2">Total histórico de ventas</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Valor Inventario</h3>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(generalBalance.inventory?.value || 0)}</p>
                  <p className="text-sm text-gray-500 mt-2">Valor actual en stock</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Ganancia Acumulada</h3>
                  <p className="text-3xl font-bold text-indigo-600">{formatCurrency(generalBalance.profit?.grossProfit || 0)}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Margen: {formatPercent(generalBalance.profit?.profitMargin || 0)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Deuda a Proveedores</h3>
                  <p className="text-3xl font-bold text-red-600">{formatCurrency(generalBalance.debt?.total || 0)}</p>
                  <p className="text-sm text-gray-500 mt-2">Total pendiente por pagar</p>
                </div>
              </div>

              {/* Gráficos de balance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                    <h3 className="text-lg font-medium text-white">Balance General</h3>
                  </div>
                  <div className="p-6" style={{ height: '300px' }}>
                    <Pie data={balanceChartConfig} options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        legend: {
                          position: 'right'
                        }
                      }
                    }} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                    <h3 className="text-lg font-medium text-white">Resumen Financiero</h3>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <h4 className="text-base font-medium text-gray-700 mb-2">Patrimonio Neto</h4>
                      <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div 
                          className="bg-green-500 h-6" 
                          style={{ 
                            width: `${Math.min(
                              ((generalBalance.sales?.totalSales || 0) + (generalBalance.inventory?.value || 0)) / 
                              ((generalBalance.sales?.totalSales || 0) + (generalBalance.inventory?.value || 0) + (generalBalance.debt?.total || 0)) * 100, 
                              100
                            )}%` 
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-gray-600">Activos: {formatCurrency((generalBalance.sales?.totalSales || 0) + (generalBalance.inventory?.value || 0))}</span>
                        <span className="text-sm text-gray-600">Pasivos: {formatCurrency(generalBalance.debt?.total || 0)}</span>
                      </div>
                    </div>
                    
                    <dl className="mt-6 space-y-4">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Valor de inventario al costo</dt>
                        <dd className="text-sm font-medium text-gray-900">{formatCurrency(generalBalance.inventory?.value || 0)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Valor de inventario al precio de venta</dt>
                        <dd className="text-sm font-medium text-gray-900">{formatCurrency(generalBalance.inventory?.retailValue || 0)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Ganancia potencial en inventario</dt>
                        <dd className="text-sm font-medium text-green-600">{formatCurrency(generalBalance.inventory?.potentialProfit || 0)}</dd>
                      </div>
                      <div className="pt-4 mt-4 border-t border-gray-200">
                        <div className="flex justify-between">
                          <dt className="text-base font-medium text-gray-900">Balance Neto</dt>
                          <dd className="text-base font-medium text-blue-600">
                            {formatCurrency((generalBalance.summary?.netWorth || 0))}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Botón de actualización */}
      <div className="mt-8 flex justify-end">
        <button 
          onClick={() => {
            if (activeTab === 'sales') {
              fetchSalesReport(period);
            } else if (activeTab === 'products') {
              fetchTopProducts();
            } else if (activeTab === 'stock') {
              fetchLowStockAlerts();
            } else if (activeTab === 'payments') {
              fetchPaymentStatus();
            } else if (activeTab === 'balance') {
              fetchGeneralBalance();
            }
            toast.success(`Datos de ${
              activeTab === 'sales' ? 'ventas' : 
              activeTab === 'products' ? 'productos' : 
              activeTab === 'stock' ? 'inventario' : 
              activeTab === 'payments' ? 'pagos' : 
              'balance'
            } actualizados correctamente`);
          }}
          className="group px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar datos
        </button>
      </div>
    </div>
  );
}

export default Reports;
