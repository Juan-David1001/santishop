import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../utils/apiClient';
import { Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function InventoryReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [reportType, setReportType] = useState('inventory-valuation');
  const [timeRange, setTimeRange] = useState('month'); // month, quarter, year
  const [reportData, setReportData] = useState({});
  const [lowStockProducts, setLowStockProducts] = useState([]);
  
  // Estados para paginación y búsqueda
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(5); // Número de productos por página
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const categoriesResponse = await apiClient.get('/categories');
        setCategories(categoriesResponse.data);
        
        // Cargar el reporte inicial
        loadReport(reportType, timeRange);
      } catch (err) {
        setError('Error al cargar datos iniciales: ' + err.message);
        toast.error('Error al cargar datos iniciales');
      }
    };
    
    loadInitialData();
  }, []);
  
  // Efecto para recargar el reporte cuando cambien los filtros
  useEffect(() => {
    if (categories.length > 0) {
      loadReport(reportType, timeRange);
    }
  }, [reportType, timeRange]);
  
  // Efecto para filtrar productos cuando cambie searchTerm o lowStockProducts
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(lowStockProducts);
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase();
      setFilteredProducts(lowStockProducts.filter(product => 
        product.name.toLowerCase().includes(lowerSearchTerm) || 
        product.sku.toLowerCase().includes(lowerSearchTerm) || 
        product.category?.name.toLowerCase().includes(lowerSearchTerm)
      ));
    }
    // Resetear a la primera página cuando cambia la búsqueda
    setCurrentPage(1);
  }, [searchTerm, lowStockProducts]);
  
  // Cargar reporte según tipo y rango de tiempo
  const loadReport = async (type, range) => {
    setLoading(true);
    try {
      let response;
      
      switch (type) {
        case 'inventory-valuation':
          response = await apiClient.get(`/reports/inventory-valuation?timeRange=${range}`);
          setReportData(response.data);
          break;
        
        case 'stock-movements':
          response = await apiClient.get(`/reports/stock-movements?timeRange=${range}`);
          setReportData(response.data);
          break;
        
        case 'low-stock':
          response = await apiClient.get('/products?lowStock=true');
          setLowStockProducts(response.data.products || []);
          break;
        
        case 'category-distribution':
          response = await apiClient.get(`/reports/category-distribution?timeRange=${range}`);
          setReportData(response.data);
          break;
          
        default:
          setError('Tipo de reporte desconocido');
          break;
      }
      
      setError(null);
    } catch (err) {
      setError('Error al cargar reporte: ' + err.message);
      toast.error('Error al cargar datos del reporte');
    } finally {
      setLoading(false);
    }
  };

  // Configuración de gráficos según tipo de reporte
  const getChartConfig = () => {
    if (!reportData || !reportData.data) return null;
    
    switch (reportType) {
      case 'inventory-valuation':
        return {
          labels: reportData.labels || [],
          datasets: [
            {
              label: 'Valor de Costo',
              data: reportData.data.costValues || [],
              backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
            {
              label: 'Valor de Venta',
              data: reportData.data.sellingValues || [],
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
            },
            {
              label: 'Ganancia Potencial',
              data: reportData.data.potentialProfits || [],
              backgroundColor: 'rgba(153, 102, 255, 0.5)',
            }
          ]
        };
      
      case 'stock-movements':
        return {
          labels: reportData.labels || [],
          datasets: [
            {
              label: 'Entradas',
              data: reportData.data.inflows || [],
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
            },
            {
              label: 'Salidas',
              data: reportData.data.outflows || [],
              backgroundColor: 'rgba(255, 99, 132, 0.5)',
            }
          ]
        };
      
      case 'category-distribution':
        return {
          labels: reportData.labels || [],
          datasets: [
            {
              label: 'Cantidad de Productos',
              data: reportData.data.productCounts || [],
              backgroundColor: 'rgba(255, 159, 64, 0.5)',
            },
            {
              label: 'Valor Total (Costo)',
              data: reportData.data.costValues || [],
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
            }
          ]
        };
      
      default:
        return null;
    }
  };
  
  // Opciones para los gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          font: {
            family: "'Inter', sans-serif",
            size: 12
          },
          padding: 20
        }
      },
      title: {
        display: true,
        text: getReportTitle(),
        font: {
          size: 16,
          family: "'Inter', sans-serif",
          weight: 'bold'
        },
        color: '#1e293b', // slate-800
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#334155', // slate-700
        bodyColor: '#475569', // slate-600
        titleFont: {
          family: "'Inter', sans-serif",
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 13
        },
        borderColor: 'rgba(203, 213, 225, 0.5)', // slate-200 with opacity
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
        usePointStyle: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(203, 213, 225, 0.3)', // slate-200 with opacity
          drawBorder: false
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif"
          },
          color: '#64748b' // slate-500
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif"
          },
          color: '#64748b' // slate-500
        }
      }
    },
    layout: {
      padding: 10
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };
  
  // Obtener título según tipo de reporte
  function getReportTitle() {
    switch (reportType) {
      case 'inventory-valuation':
        return 'Valorización de Inventario';
      case 'stock-movements':
        return 'Movimientos de Stock';
      case 'low-stock':
        return 'Productos con Stock Bajo';
      case 'category-distribution':
        return 'Distribución por Categorías';
      default:
        return 'Reporte de Inventario';
    }
  }
  
  // Función para exportar a Excel
  const exportToExcel = () => {
    try {
      let fileName = `Reporte_${getReportTitle().replace(/\s+/g, '_')}_${new Date().toLocaleDateString('es-CO')}.xlsx`;
      let dataToExport = [];
      
      // Preparar los datos según el tipo de reporte
      if (reportType === 'low-stock') {
        // Exportar productos con stock bajo
        if (filteredProducts.length === 0) {
          toast.error('No hay datos para exportar');
          return;
        }
        
        // Cabeceras
        dataToExport.push([
          'SKU', 
          'Nombre', 
          'Descripción', 
          'Categoría', 
          'Stock Actual', 
          'Stock Mínimo', 
          'Estado'
        ]);
        
        // Datos
        filteredProducts.forEach(product => {
          dataToExport.push([
            product.sku,
            product.name,
            product.description || '',
            product.category?.name || '',
            product.stock,
            product.minimumStock,
            product.stock === 0 ? 'Sin Stock' : 'Stock Bajo'
          ]);
        });
      } else {
        // Exportar datos del reporte
        if (!reportData || !reportData.labels || !reportData.data) {
          toast.error('No hay datos para exportar');
          return;
        }
        
        // Cabeceras - primera columna es siempre la etiqueta (fecha o categoría)
        const headers = ['Período/Categoría'];
        
        switch (reportType) {
          case 'inventory-valuation':
            headers.push('Valor de Costo', 'Valor de Venta', 'Ganancia Potencial');
            break;
          case 'stock-movements':
            headers.push('Entradas', 'Salidas', 'Neto');
            break;
          case 'category-distribution':
            headers.push('Cantidad de Productos', 'Valor Total (Costo)');
            break;
          default:
            break;
        }
        
        dataToExport.push(headers);
        
        // Añadir filas de datos
        reportData.labels.forEach((label, index) => {
          const row = [label];
          
          switch (reportType) {
            case 'inventory-valuation':
              row.push(
                reportData.data.costValues?.[index] || 0,
                reportData.data.sellingValues?.[index] || 0,
                reportData.data.potentialProfits?.[index] || 0
              );
              break;
            case 'stock-movements':
              const inflow = reportData.data.inflows?.[index] || 0;
              const outflow = reportData.data.outflows?.[index] || 0;
              row.push(
                inflow,
                outflow,
                inflow - outflow
              );
              break;
            case 'category-distribution':
              row.push(
                reportData.data.productCounts?.[index] || 0,
                reportData.data.costValues?.[index] || 0
              );
              break;
            default:
              break;
          }
          
          dataToExport.push(row);
        });
        
        // Si hay resumen, agregar al final
        if (reportType === 'inventory-valuation' && reportData.summary) {
          dataToExport.push([]);
          dataToExport.push(['Resumen']);
          dataToExport.push(['Total Valor de Costo', reportData.summary.totalCostValue]);
          dataToExport.push(['Total Valor de Venta', reportData.summary.totalSellingValue]);
          dataToExport.push(['Ganancia Potencial', reportData.summary.totalSellingValue - reportData.summary.totalCostValue]);
          dataToExport.push(['Margen de Ganancia', `${reportData.summary.profitMargin.toFixed(2)}%`]);
        }
      }
      
      // Crear libro de trabajo y hoja
      const ws = XLSX.utils.aoa_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, getReportTitle());
      
      // Aplicar estilos de ancho de columna
      const maxWidth = dataToExport.reduce((w, r) => Math.max(w, r.length), 0);
      const colWidth = Array(maxWidth).fill({ wch: 15 }); // Ancho por defecto
      ws['!cols'] = colWidth;
      
      // Guardar archivo
      XLSX.writeFile(wb, fileName);
      
      toast.success(`Reporte exportado como ${fileName}`);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      toast.error('Error al exportar el reporte');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-700 rounded-lg shadow-lg mr-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Reportes de Inventario</h1>
            <p className="text-sm text-slate-500">Visualiza y analiza la información de tu inventario</p>
          </div>
        </div>
        
        <div>
          <button 
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            onClick={() => exportToExcel()}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Exportar a Excel
          </button>
        </div>
      </div>
      
      {/* Filtros de reporte */}
      <div className="bg-white p-6 mb-8 rounded-xl shadow-lg border border-slate-100">
        <div className="flex items-center mb-5 pb-2 border-b border-slate-100">
          <div className="p-2.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
            <svg className="w-5 h-5 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Filtros de Reporte</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-gradient-to-br from-white to-violet-50/30 rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-all">
            <label className="block mb-3 text-sm font-medium text-slate-700 flex items-center">
              <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              Tipo de Reporte
            </label>
            <div className="relative">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3.5 pl-4 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 bg-white shadow-md appearance-none"
              >
                <option value="inventory-valuation">Valorización de Inventario</option>
                <option value="stock-movements">Movimientos de Stock</option>
                <option value="low-stock">Productos con Stock Bajo</option>
                <option value="category-distribution">Distribución por Categorías</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-fuchsia-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {reportType !== 'low-stock' && (
            <div className="p-5 bg-gradient-to-br from-white to-fuchsia-50/30 rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-all">
              <label className="block mb-3 text-sm font-medium text-slate-700 flex items-center">
                <div className="p-1.5 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-fuchsia-600 rounded-lg mr-2 shadow-inner">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                Período
              </label>
              <div className="relative">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3.5 pl-4 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200 bg-white shadow-md appearance-none"
                >
                  <option value="month">Último Mes</option>
                  <option value="quarter">Último Trimestre</option>
                  <option value="year">Último Año</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-fuchsia-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Contenido del reporte */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-md border border-slate-100">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-10 w-10 mb-4 rounded-full bg-violet-200"></div>
            <p className="text-slate-600 font-medium mb-2">Cargando datos del reporte...</p>
            <div className="h-2 w-40 bg-slate-200 rounded"></div>
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
        <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
          {reportType === 'low-stock' ? (
            <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center">
                  <div className="p-2.5 bg-gradient-to-r from-amber-100 to-red-100 rounded-lg shadow-inner mr-3">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800">Productos con Stock Bajo</h2>
                    <p className="text-sm text-slate-500">Productos que requieren reposición</p>
                  </div>
                </div>
                
                {/* Campo de búsqueda */}
                {lowStockProducts.length > 0 && (
                  <div className="relative w-full md:w-64 lg:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all shadow-sm"
                      placeholder="Buscar por nombre, SKU o categoría..."
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-green-50 rounded-full mb-3">
                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-slate-700 mb-1">¡Inventario en buen estado!</h3>
                    <p className="text-slate-500 max-w-md">No hay productos con stock bajo actualmente. Todos los productos tienen niveles de inventario adecuados.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl">
                    <table className="min-w-full bg-white shadow-lg">
                      <thead>
                        <tr className="bg-gradient-to-r from-amber-50 to-red-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">SKU</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Nombre</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Categoría</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Stock Actual</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Stock Mínimo</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Estado</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {filteredProducts
                          .slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)
                          .map(product => (
                            <tr key={product.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">{product.sku}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-800">{product.name}</span>
                                  {product.description && (
                                    <span className="text-xs text-slate-500 mt-1 line-clamp-1">{product.description}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 bg-violet-50 text-violet-700 rounded-lg text-sm border border-violet-200">
                                  {product.category.name}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${
                                  product.stock === 0
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {product.stock}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                                {product.minimumStock}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                  product.stock === 0
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {product.stock === 0 ? (
                                    <>
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                      </svg>
                                      Sin Stock
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                      </svg>
                                      Stock Bajo
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  className="p-1.5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg text-blue-700 hover:shadow-md border border-blue-200 transition-all transform hover:-translate-y-0.5 inline-flex items-center"
                                  onClick={() => window.location.href = `/products/${product.id}`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                  </svg>
                                </button>
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Paginación */}
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-8 mt-4 bg-white rounded-xl border border-slate-200">
                      <div className="flex flex-col items-center">
                        <div className="p-3 bg-slate-50 rounded-full mb-3">
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-slate-700 mb-1">No se encontraron resultados</h3>
                        <p className="text-slate-500 max-w-md">No hay productos que coincidan con tu búsqueda. Intenta con otros términos.</p>
                        <button 
                          onClick={() => setSearchTerm('')}
                          className="mt-4 px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
                        >
                          Limpiar búsqueda
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-slate-600 w-full md:w-auto text-center md:text-left">
                        Mostrando <span className="font-medium">{Math.min(filteredProducts.length, (currentPage - 1) * productsPerPage + 1)}</span> a <span className="font-medium">{Math.min(filteredProducts.length, currentPage * productsPerPage)}</span> de <span className="font-medium">{filteredProducts.length}</span> {filteredProducts.length === 1 ? 'producto' : 'productos'}
                        {searchTerm && lowStockProducts.length !== filteredProducts.length && (
                          <span className="ml-1">
                            (filtrado de <span className="font-medium">{lowStockProducts.length}</span> total)
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-2 w-full md:w-auto justify-center md:justify-end">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`inline-flex items-center px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium ${
                            currentPage === 1 
                              ? 'bg-slate-50 text-slate-400 cursor-not-allowed' 
                              : 'bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                          </svg>
                          <span className="hidden sm:inline">Anterior</span>
                        </button>
                        
                        {/* Números de página */}
                        <div className="hidden md:flex gap-1">
                          {[...Array(Math.ceil(filteredProducts.length / productsPerPage))].map((_, index) => (
                            <button
                              key={index + 1}
                              onClick={() => setCurrentPage(index + 1)}
                              className={`px-3.5 py-2 rounded-md text-sm font-medium ${
                                currentPage === index + 1
                                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md'
                                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                              }`}
                            >
                              {index + 1}
                            </button>
                          ))}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredProducts.length / productsPerPage)))}
                          disabled={currentPage >= Math.ceil(filteredProducts.length / productsPerPage)}
                          className={`inline-flex items-center px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium ${
                            currentPage >= Math.ceil(filteredProducts.length / productsPerPage)
                              ? 'bg-slate-50 text-slate-400 cursor-not-allowed' 
                              : 'bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="hidden sm:inline">Siguiente</span>
                          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Resumen numérico */}
              {reportType === 'inventory-valuation' && reportData.summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-lg transition-all transform hover:-translate-y-1">
                    <div className="flex items-center">
                      <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl mr-4 shadow-inner">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm text-slate-500 font-medium uppercase tracking-wide">Total Valor de Costo</h3>
                        <p className="text-2xl font-bold text-blue-700 mt-1">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(reportData.summary.totalCostValue)}</p>
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
                        <h3 className="text-sm text-slate-500 font-medium uppercase tracking-wide">Total Valor de Venta</h3>
                        <p className="text-2xl font-bold text-emerald-700 mt-1">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(reportData.summary.totalSellingValue)}</p>
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
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-2xl font-bold text-violet-700">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(reportData.summary.totalSellingValue - reportData.summary.totalCostValue)}</p>
                          <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                            {reportData.summary.profitMargin.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Gráfico */}
              <div className="mb-6">
                <div className="flex items-center mb-4 pb-2 border-b border-slate-100">
                  <div className="p-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
                    <svg className="w-4.5 h-4.5 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-slate-800">{getReportTitle()}</h2>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-inner" style={{ height: '450px' }}>
                  {getChartConfig() && <Bar data={getChartConfig()} options={chartOptions} />}
                </div>
              </div>
            </>
          )}
          
          {/* Detalles adicionales según el reporte */}
          {reportData.notes && (
            <div className="mt-6 p-5 bg-gradient-to-br from-white to-amber-50/30 rounded-xl border border-amber-100 shadow-md">
              <div className="flex items-center mb-3">
                <div className="p-1.5 bg-gradient-to-r from-amber-100 to-amber-200 text-amber-600 rounded-lg mr-2 shadow-inner">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="font-medium text-amber-800">Notas importantes:</h3>
              </div>
              <p className="text-slate-700 pl-8">{reportData.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InventoryReports;
