import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';
import apiClient from '../utils/apiClient';
import { 
  FaSearch, FaShoppingCart, FaUser, FaPlus, FaTimes, 
  FaTrash, FaMoneyBillWave, FaCreditCard, FaExchangeAlt, 
  FaPrint, FaBarcode, FaTag, FaEdit, FaArrowRight,
  FaExclamationTriangle, FaRegClock, FaRegLightbulb
} from 'react-icons/fa';
import { MdPointOfSale, MdDiscount, MdPayment, MdOutlineInventory2, MdReceiptLong, MdLocalOffer } from 'react-icons/md';

const POS = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', document: '', email: '' });
  const [paymentInfo, setPaymentInfo] = useState({
    methods: [{ type: 'efectivo', amount: 0, reference: '' }],
    usePoints: false,
    pointsToRedeem: 0
  });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState('percent');
  const [notes, setNotes] = useState('');
  const [sale, setSale] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const searchInputRef = useRef(null);
  const customerSearchRef = useRef(null);

  useEffect(() => {
    // Cargar usuarios y turnos activos al iniciar
    fetchUsers();
    
    // Focus en el campo de búsqueda al cargar
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    // Verificar turno activo cuando cambia el usuario seleccionado
    if (selectedUser) {
      fetchActiveShift(selectedUser.id);
    }
  }, [selectedUser]);

  useEffect(() => {
    // Buscar productos cuando cambia la query de búsqueda
    if (searchQuery.length >= 2) {
      searchProducts(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    // Buscar clientes cuando cambia la query de búsqueda de clientes
    if (customerSearch.length >= 2) {
      searchCustomers(customerSearch);
    } else {
      setCustomerResults([]);
    }
  }, [customerSearch]);

  useEffect(() => {
    // Actualizar monto del método de pago efectivo cuando cambia el total
    if (cart.length > 0 && paymentInfo.methods.length > 0) {
      const total = calculateTotal();
      const updatedMethods = [...paymentInfo.methods];
      updatedMethods[0].amount = total;
      setPaymentInfo({ ...paymentInfo, methods: updatedMethods });
    }
  }, [cart, taxRate, discountAmount, discountPercent, discountType]);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
      
      // Seleccionar el primer usuario por defecto
      if (response.data.length > 0) {
        setSelectedUser(response.data[0]);
      }
    } catch (error) {
      toast.error('Error al cargar usuarios');
      console.error('Error loading users:', error);
    }
  };

  const fetchActiveShift = async (userId) => {
    try {
      const response = await apiClient.get(`/shifts?userId=${userId}&active=true`);
      if (response.data && response.data.length > 0) {
        setActiveShift(response.data[0]);
      } else {
        setActiveShift(null);
        toast.error('El usuario seleccionado no tiene un turno activo');
      }
    } catch (error) {
      toast.error('Error al verificar turno activo');
      console.error('Error checking active shift:', error);
    }
  };

  const searchProducts = async (query) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/sales/search-products?query=${encodeURIComponent(query)}`);
      setSearchResults(response.data.products || []);
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Error al buscar productos');
    } finally {
      setIsLoading(false);
    }
  };

  const searchCustomers = async (query) => {
    try {
      const response = await apiClient.get(`/clients/search?query=${encodeURIComponent(query)}`);
      setCustomerResults(response.data.clients || []);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const addToCart = (product) => {
    // Verificar si el producto ya está en el carrito
    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Incrementar cantidad si ya existe
      const updatedCart = cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice } 
          : item
      );
      setCart(updatedCart);
    } else {
      // Agregar nuevo item al carrito
      const newItem = {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: product.sellingPrice,
        quantity: 1,
        totalPrice: product.sellingPrice,
        stock: product.stock
      };
      setCart([...cart, newItem]);
    }
    
    // Limpiar búsqueda y volver a enfocar
    setSearchQuery('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const updateCartItem = (index, field, value) => {
    const updatedCart = [...cart];
    const item = { ...updatedCart[index] };
    
    if (field === 'quantity') {
      const newQuantity = parseInt(value);
      
      // Validar que la cantidad no exceda el stock disponible
      if (newQuantity > item.stock) {
        toast.error(`Solo hay ${item.stock} unidades disponibles`);
        return;
      }
      
      item.quantity = newQuantity;
      item.totalPrice = newQuantity * item.unitPrice;
    } else if (field === 'unitPrice') {
      const newPrice = parseFloat(value);
      item.unitPrice = newPrice;
      item.totalPrice = item.quantity * newPrice;
    }
    
    updatedCart[index] = item;
    setCart(updatedCart);
  };

  const removeFromCart = (index) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
  };

  const clearCart = () => {
    if (window.confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
      setCart([]);
      setCustomer(null);
      setPaymentInfo({
        methods: [{ type: 'efectivo', amount: 0, reference: '' }],
        usePoints: false,
        pointsToRedeem: 0
      });
      setDiscountAmount(0);
      setDiscountPercent(0);
      setNotes('');
    }
  };

  const selectCustomer = (client) => {
    setCustomer(client);
    setCustomerResults([]);
    setCustomerSearch('');
  };

  const clearCustomer = () => {
    setCustomer(null);
  };

  const handleCustomerInputChange = (e) => {
    setNewCustomer({ ...newCustomer, [e.target.name]: e.target.value });
  };

  const createCustomer = async (e) => {
    e.preventDefault();
    
    if (!newCustomer.name) {
      toast.error('El nombre del cliente es obligatorio');
      return;
    }
    
    try {
      const response = await apiClient.post('/clients', newCustomer);
      setCustomer(response.data);
      setShowCustomerForm(false);
      setNewCustomer({ name: '', phone: '', document: '' });
      toast.success('Cliente creado correctamente');
    } catch (error) {
      toast.error('Error al crear el cliente');
      console.error('Error creating customer:', error);
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    
    if (discountType === 'percent') {
      return (subtotal * (discountPercent / 100));
    } else {
      return discountAmount;
    }
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    return (subtotal - discount) * (taxRate / 100);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const tax = calculateTax();
    
    let total = subtotal - discount + tax;
    
    // Restar puntos si se están usando
    if (customer && paymentInfo.usePoints && paymentInfo.pointsToRedeem > 0) {
      const pointsValue = paymentInfo.pointsToRedeem * 0.1; // Valor de cada punto (ajustar según configuración)
      total -= Math.min(pointsValue, total); // No permitir que el total sea negativo
    }
    
    return Math.max(total, 0);
  };

  const calculatePointsToEarn = () => {
    const total = calculateTotal();
    // Configuración: 1 punto por cada 10 unidades monetarias gastadas
    return Math.floor(total / 10);
  };

  const addPaymentMethod = () => {
    const newMethod = { type: 'tarjeta', amount: 0, reference: '' };
    setPaymentInfo({
      ...paymentInfo,
      methods: [...paymentInfo.methods, newMethod]
    });
  };

  const removePaymentMethod = (index) => {
    if (paymentInfo.methods.length === 1) {
      toast.error('Debe haber al menos un método de pago');
      return;
    }
    
    const updatedMethods = [...paymentInfo.methods];
    updatedMethods.splice(index, 1);
    
    setPaymentInfo({
      ...paymentInfo,
      methods: updatedMethods
    });
  };

  const updatePaymentMethod = (index, field, value) => {
    const updatedMethods = [...paymentInfo.methods];
    updatedMethods[index] = { 
      ...updatedMethods[index], 
      [field]: field === 'amount' ? parseFloat(value) : value 
    };
    
    setPaymentInfo({
      ...paymentInfo,
      methods: updatedMethods
    });
  };

  const totalPaymentAmount = () => {
    return paymentInfo.methods.reduce((sum, method) => sum + (parseFloat(method.amount) || 0), 0);
  };

  const handleProceedToPayment = () => {
    if (!selectedUser || !activeShift) {
      toast.error('Debes seleccionar un usuario con turno activo');
      return;
    }
    
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }
    
    // Inicializar montos de pago
    const total = calculateTotal();
    const updatedMethods = [...paymentInfo.methods];
    updatedMethods[0].amount = total;
    
    setPaymentInfo({
      ...paymentInfo,
      methods: updatedMethods
    });
    
    setShowPaymentModal(true);
  };

  const handleCheckout = async () => {
    const total = calculateTotal();
    const paymentTotal = totalPaymentAmount();
    
    if (Math.abs(total - paymentTotal) > 0.01) {
      toast.error(`El monto total de los pagos (${formatCurrency(paymentTotal)}) no coincide con el total de la venta (${formatCurrency(total)})`);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        payments: paymentInfo.methods.map(method => ({
          type: method.type,
          amount: method.amount,
          reference: method.reference
        })),
        userId: selectedUser.id,
        shiftId: activeShift.id,
        clientId: customer ? customer.id : null,
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        discount: calculateDiscount(),
        amount: total,
        pointsEarned: customer ? calculatePointsToEarn() : 0,
        pointsRedeemed: customer && paymentInfo.usePoints ? paymentInfo.pointsToRedeem : 0,
        notes: notes
      };
      
      const response = await apiClient.post('/sales', saleData);
      
      // Mostrar ticket
      setSale(response.data);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      
      // Limpiar carrito y resetear estado
      setCart([]);
      setCustomer(null);
      setPaymentInfo({
        methods: [{ type: 'efectivo', amount: 0, reference: '' }],
        usePoints: false,
        pointsToRedeem: 0
      });
      setDiscountAmount(0);
      setDiscountPercent(0);
      setNotes('');
      
      toast.success('Venta registrada correctamente');
    } catch (error) {
      console.error('Error processing checkout:', error);
      toast.error(error.response?.data?.error || 'Error al procesar la venta');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    // Abrir ventana de impresión
    const printWindow = window.open('', '', 'height=600,width=400');
    
    // Contenido de la impresión
    printWindow.document.write(`
      <html>
        <head>
          <title>Comprobante de Venta</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 80mm;
              margin: 0;
              padding: 10px;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
            }
            .header h1 {
              font-size: 18px;
              margin: 0;
            }
            .header p {
              margin: 3px 0;
            }
            .details {
              margin: 10px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              text-align: left;
              padding: 3px;
            }
            .right {
              text-align: right;
            }
            .totals {
              margin-top: 10px;
              border-top: 1px dashed #000;
              padding-top: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Tienda BR165</h1>
            <p>Calle Principal #123</p>
            <p>Tel: (123) 456-7890</p>
            <p>${new Date(sale.createdAt).toLocaleString()}</p>
            <p>Ticket #${sale.id}</p>
            <p>Le atendió: ${sale.user?.name || 'Vendedor'}</p>
          </div>
          
          ${sale.client ? `
            <div class="customer">
              <p><strong>Cliente:</strong> ${sale.client.name}</p>
              ${sale.client.document ? `<p><strong>Documento:</strong> ${sale.client.document}</p>` : ''}
              ${sale.client.phone ? `<p><strong>Teléfono:</strong> ${sale.client.phone}</p>` : ''}
            </div>
          ` : ''}
          
          <div class="details">
            <table>
              <tr>
                <th>Producto</th>
                <th>Cant</th>
                <th>Precio</th>
                <th class="right">Total</th>
              </tr>
              ${sale.saleItems.map(item => `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td class="right">${formatCurrency(item.totalPrice)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
          
          <div class="totals">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td class="right">${formatCurrency(sale.subtotal)}</td>
              </tr>
              ${sale.discount > 0 ? `
                <tr>
                  <td>Descuento:</td>
                  <td class="right">-${formatCurrency(sale.discount)}</td>
                </tr>
              ` : ''}
              ${sale.tax > 0 ? `
                <tr>
                  <td>Impuesto:</td>
                  <td class="right">${formatCurrency(sale.tax)}</td>
                </tr>
              ` : ''}
              <tr>
                <td><strong>TOTAL:</strong></td>
                <td class="right"><strong>${formatCurrency(sale.amount)}</strong></td>
              </tr>
            </table>
            
            ${sale.payments.length > 0 ? `
              <table style="margin-top: 10px;">
                <tr>
                  <th colspan="2">Forma de pago:</th>
                </tr>
                ${sale.payments.map(payment => `
                  <tr>
                    <td>${payment.type === 'efectivo' ? 'Efectivo' : 
                        payment.type === 'tarjeta' ? 'Tarjeta' : 
                        payment.type === 'transferencia' ? 'Transferencia' : 
                        payment.type === 'puntos' ? 'Puntos' : payment.type}</td>
                    <td class="right">${formatCurrency(payment.amount)}</td>
                  </tr>
                `).join('')}
              </table>
            ` : ''}
            
            ${sale.client && sale.pointsEarned > 0 ? `
              <p>Puntos ganados en esta compra: ${sale.pointsEarned}</p>
            ` : ''}
            ${sale.client && sale.pointsRedeemed > 0 ? `
              <p>Puntos canjeados: ${sale.pointsRedeemed}</p>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>¡Gracias por su compra!</p>
            <p>Regrese pronto</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Imprimir después de un breve retraso para asegurarse de que el contenido esté completamente cargado
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="h-full flex bg-slate-50">
      {/* Panel izquierdo - Búsqueda y carrito */}
      <div className="w-2/3 p-4 overflow-y-auto animate-fadeIn">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4 bg-white p-3 rounded-lg shadow-sm border-l-4 border-blue-500">
            <MdPointOfSale size={32} className="text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Punto de Venta</h2>
              <p className="text-sm text-slate-500">Gestiona ventas y pagos de manera eficiente</p>
            </div>
          </div>
          
          {/* Selector de usuario y estado de turno */}
          <div className="flex items-center mb-6 space-x-6 p-5 bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-300 pos-item-hover">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center">
                <FaUser className="mr-2 text-blue-500" size={14} />
                Usuario:
              </label>
              <select 
                className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md shadow-sm focus-ring transition-all"
                value={selectedUser?.id || ""}
                onChange={(e) => {
                  const userId = parseInt(e.target.value);
                  const user = users.find(u => u.id === userId);
                  setSelectedUser(user);
                }}
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <p className="block text-sm font-medium text-slate-600 mb-2 flex items-center">
                <FaRegClock className="mr-2 text-blue-500" size={14} />
                Estado del turno:
              </p>
              {activeShift ? (
                <div className="flex items-center gap-2 mt-2 animate-fadeIn">
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm w-full justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                    Turno activo #{activeShift.id}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2 animate-fadeIn">
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200 shadow-sm w-full justify-center">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2"></span>
                    Sin turno activo
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Búsqueda de productos */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-blue-500" />
              </div>
              <input
                type="text"
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos por nombre, SKU o código de barras..."
                className="block w-full pl-12 pr-12 py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-md transition-all"
              />
              {isLoading ? (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-xs text-slate-500">
                  <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                    <FaRegLightbulb className="text-amber-500" />
                    <span>Presiona Enter para buscar</span>
                  </div>
                </div>
              )}
            </div>
            {searchQuery.length > 0 && searchResults.length === 0 && !isLoading && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-700 text-sm animate-fadeIn flex items-center">
                <FaSearch className="mr-2" /> Busca por nombre del producto, SKU o código de barras
              </div>
            )}
          </div>
          
          {/* Resultados de búsqueda */}
          {searchResults.length > 0 && (
            <div className="mb-6 bg-white rounded-lg shadow-md max-h-80 overflow-y-auto border border-slate-200 animate-fadeIn">
              <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 flex items-center">
                <div className="flex items-center gap-2 text-white">
                  <MdLocalOffer size={18} />
                  <h3 className="font-semibold">Productos Encontrados ({searchResults.length})</h3>
                </div>
              </div>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-12 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Precio</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {searchResults.map((product, index) => (
                    <tr 
                      key={product.id} 
                      className="hover:bg-blue-50 transition-all"
                      style={{ 
                        animationDelay: `${index * 50}ms`,
                        animation: 'fadeIn 0.3s ease-in-out forwards'
                      }}
                    >
                      <td className="px-6 py-4 whitespace-normal text-sm font-medium text-slate-800">
                        {product.name}
                        {product.description && (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-1">{product.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 flex items-center">
                        <FaBarcode className="mr-1.5 text-blue-500" size={14} /> {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-right font-medium">
                        {formatCurrency(product.sellingPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium 
                          ${product.stock <= 0 ? 'bg-red-100 text-red-800 border border-red-200' : 
                            product.stock < 5 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
                            'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                          <MdOutlineInventory2 className="mr-1" />
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => addToCart(product)}
                          disabled={product.stock <= 0}
                          className={`inline-flex items-center text-white px-3 py-2 rounded-md shadow-sm ${
                            product.stock <= 0 
                              ? 'bg-slate-300 cursor-not-allowed' 
                              : 'bg-blue-600 hover:bg-blue-700 transition-all hover:shadow-md'
                          }`}
                        >
                          <FaPlus className="mr-1.5" size={12} />
                          Agregar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Carrito de compras */}
          <div className="bg-white rounded-lg shadow-md p-5 mb-6 border border-slate-200 hover:shadow-lg transition-shadow duration-300">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-full">
                  <FaShoppingCart size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Carrito</h3>
                  {cart.length > 0 && (
                    <p className="text-sm text-slate-500">
                      {cart.length} {cart.length === 1 ? 'producto' : 'productos'} en carrito
                    </p>
                  )}
                </div>
                {cart.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {cart.length} {cart.length === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>
              <button 
                onClick={clearCart}
                disabled={cart.length === 0}
                className={`inline-flex items-center gap-1.5 text-white px-3.5 py-2 rounded-md transition-all shadow-sm ${
                  cart.length === 0 
                    ? 'bg-slate-300 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700 hover:shadow'
                }`}
              >
                <FaTrash size={12} />
                Vaciar carrito
              </button>
            </div>
            
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <FaShoppingCart size={64} className="mb-4 opacity-30" />
                <p className="text-xl font-medium">El carrito está vacío</p>
                <p className="text-sm mt-2 max-w-sm text-center">Usa el buscador de productos para agregar items al carrito de compras</p>
                <div className="mt-4 flex items-center text-blue-600">
                  <FaSearch className="mr-2" />
                  <p className="text-sm font-medium">Comienza buscando un producto</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Producto</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Precio</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Cant.</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {cart.map((item, index) => (
                      <tr 
                        key={`${item.productId}-${index}`} 
                        className="hover:bg-blue-50 transition-all pos-item-hover"
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animation: 'fadeIn 0.3s ease-in-out forwards'
                        }}
                      >
                        <td className="px-4 py-4 whitespace-normal text-sm text-slate-800">
                          <div className="font-medium">{item.name}</div>
                          {item.sku && (
                            <div className="text-xs text-slate-500 flex items-center mt-1">
                              <FaTag size={10} className="mr-1 text-blue-500" /> {item.sku}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                          <div className="flex items-center justify-end">
                            <span className="text-slate-400 mr-1">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateCartItem(index, 'unitPrice', e.target.value)}
                              className="w-24 p-2 border border-slate-300 rounded-md text-right focus-ring"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={(e) => updateCartItem(index, 'quantity', e.target.value)}
                            className="w-20 p-2 border border-slate-300 rounded-md text-center mx-auto block focus-ring"
                          />
                          <div className="text-xs text-slate-500 text-center mt-1.5">
                            <span className={item.stock < 5 ? 'text-amber-600 font-medium' : ''}>
                              Stock: {item.stock}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-800">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 inline-block min-w-[100px]">
                            {formatCurrency(item.totalPrice)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                          <button
                            onClick={() => removeFromCart(index)}
                            className="inline-flex items-center text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md transition-colors shadow-sm hover:shadow"
                          >
                            <FaTrash size={12} className="mr-1.5" />
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="bg-slate-50 p-4 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Productos en carrito: {cart.length}</span>
                    <span className="text-sm font-medium text-slate-800">
                      Subtotal: {formatCurrency(calculateSubtotal())}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Panel derecho - Cliente, totales y pago */}
      <div className="w-1/3 bg-white p-5 border-l border-slate-200 flex flex-col animate-fadeIn">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 -m-5 mb-5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <MdReceiptLong size={24} />
            </div>
            <div>
              <h2 className="font-bold text-xl">Detalles de la venta</h2>
              <p className="text-sm text-blue-100">Configure cliente y método de pago</p>
            </div>
          </div>
        </div>
        
        {/* Sección de cliente */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 bg-slate-50 p-2 rounded-lg">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-full">
              <FaUser size={16} />
            </div>
            <h3 className="font-bold text-slate-800">Información del Cliente</h3>
          </div>
          
          {customer ? (
            <div className="bg-blue-50 p-5 rounded-lg border border-blue-200 mb-3 shadow-sm hover:shadow transition-shadow duration-300">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-lg">{customer.name}</p>
                    <div className="mt-2 space-y-2">
                      {customer.document && (
                        <p className="text-sm text-slate-600 flex items-center">
                          <span className="w-5 h-5 inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2 text-xs">ID</span>
                          {customer.document}
                        </p>
                      )}
                      {customer.phone && (
                        <p className="text-sm text-slate-600 flex items-center">
                          <span className="w-5 h-5 inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2 text-xs">📞</span>
                          {customer.phone}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 bg-white p-3 rounded-lg shadow-sm border border-blue-200">
                      <p className="text-sm text-blue-800 flex items-center justify-between">
                        <span className="font-medium">Puntos disponibles</span>
                        <span className="font-bold bg-blue-100 px-2 py-1 rounded-md">
                          {customer.totalPoints - customer.usedPoints || 0} pts
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={clearCustomer}
                  className="text-slate-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-all"
                >
                  <FaTimes size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-4 w-4 text-blue-500" />
                </div>
                <input
                  type="text"
                  ref={customerSearchRef}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Buscar cliente por nombre o documento..."
                  className="block w-full pl-10 pr-20 py-3 border border-slate-300 rounded-lg focus-ring bg-white shadow-sm transition-all"
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                  <button
                    onClick={() => setShowCustomerForm(true)}
                    className="inline-flex items-center mr-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <FaPlus size={12} className="mr-1.5" />
                    Nuevo
                  </button>
                </div>
              </div>
              
              {customerResults.length > 0 && (
                <div className="bg-white rounded-lg shadow-md max-h-64 overflow-y-auto mb-3 border border-slate-200 animate-fadeIn">
                  <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2 border-b border-slate-200">
                    <p className="font-medium text-slate-600 text-sm">
                      Clientes encontrados: {customerResults.length}
                    </p>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {customerResults.map((client, index) => (
                      <li 
                        key={client.id}
                        className="p-3 hover:bg-blue-50 cursor-pointer transition-colors pos-item-hover"
                        onClick={() => selectCustomer(client)}
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animation: 'fadeIn 0.3s ease-in-out forwards'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">{client.name}</p>
                            <div className="flex flex-col space-y-1 mt-1">
                              <div className="flex gap-3">
                                {client.document && <p className="text-xs text-slate-600">Doc: {client.document}</p>}
                                {client.phone && <p className="text-xs text-slate-600">Tel: {client.phone}</p>}
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <p className="text-xs text-blue-600 font-medium">
                                  {client.totalPoints - client.usedPoints || 0} puntos disponibles
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {customerSearch.length > 0 && customerResults.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm flex items-center gap-2 animate-fadeIn">
                  <FaSearch />
                  <p>No se encontraron clientes con ese criterio de búsqueda.</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Sección de descuentos e impuestos */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 bg-slate-50 p-2 rounded-lg">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-full">
              <MdDiscount size={18} />
            </div>
            <h3 className="font-bold text-slate-800">Descuentos e Impuestos</h3>
          </div>
          
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-5 hover:shadow transition-shadow duration-300">
            {/* Descuentos */}
            <div className="pb-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                    <MdLocalOffer size={16} />
                  </span>
                  <label className="block text-sm font-medium text-slate-700">Tipo de Descuento:</label>
                </div>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="border border-slate-300 py-2 px-3 rounded-md text-sm focus-ring bg-white shadow-sm"
                >
                  <option value="percent">Porcentaje (%)</option>
                  <option value="amount">Monto fijo ($)</option>
                </select>
              </div>
              
              {discountType === 'percent' ? (
                <div className="flex items-center mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                      className="w-full py-2.5 pl-3 pr-10 border border-slate-300 rounded-lg text-right focus-ring bg-white shadow-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-slate-500 font-medium">%</span>
                    </div>
                  </div>
                  
                  {discountPercent > 0 && (
                    <div className="ml-4 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 font-medium">
                      - {formatCurrency(calculateDiscount())}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-slate-500 font-medium">$</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-full py-2.5 pl-8 border border-slate-300 rounded-lg text-right focus-ring bg-white shadow-sm"
                    />
                  </div>
                  
                  {discountAmount > 0 && (
                    <div className="ml-4 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 font-medium">
                      - {formatCurrency(discountAmount)}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Impuestos */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <FaRegLightbulb size={16} />
                </span>
                <label className="block text-sm font-medium text-slate-700">Impuesto (%):</label>
              </div>
              
              <div className="flex items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full py-2.5 pl-3 pr-10 border border-slate-300 rounded-lg text-right focus-ring bg-white shadow-sm"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-slate-500 font-medium">%</span>
                  </div>
                </div>
                
                {taxRate > 0 && (
                  <div className="ml-4 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 font-medium">
                    + {formatCurrency(calculateTax())}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Notas */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 bg-slate-50 p-2 rounded-lg">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-full">
              <FaEdit size={16} />
            </div>
            <h3 className="font-bold text-slate-800">Notas de la Venta</h3>
          </div>
          
          <div className="relative bg-white p-1 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-shadow duration-300">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añadir notas a la venta (opcional)..."
              className="w-full p-3 rounded-lg min-h-[100px] focus-ring resize-none"
            />
            <div className="flex justify-end p-2 text-xs text-slate-500">
              {notes.length > 0 ? `${notes.length} caracteres` : 'Sin notas'}
            </div>
          </div>
        </div>
        
        {/* Totales */}
        <div className="mt-auto">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-5 rounded-lg shadow-md mb-5 border border-slate-200 hover:shadow-lg transition-shadow duration-300">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
              </div>
              
              {calculateDiscount() > 0 && (
                <div className="flex justify-between items-center text-rose-600">
                  <span className="flex items-center">
                    <MdDiscount size={18} className="mr-1.5" /> 
                    Descuento:
                  </span>
                  <span className="font-medium bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    -{formatCurrency(calculateDiscount())}
                  </span>
                </div>
              )}
              
              {calculateTax() > 0 && (
                <div className="flex justify-between items-center text-blue-600">
                  <span className="flex items-center">
                    <FaRegLightbulb size={16} className="mr-1.5" />
                    Impuesto:
                  </span>
                  <span className="font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    +{formatCurrency(calculateTax())}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center font-bold text-xl mt-5 pt-3 border-t border-slate-300">
              <span className="text-slate-800">TOTAL:</span>
              <span className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleProceedToPayment}
            disabled={cart.length === 0 || !activeShift}
            className={`w-full py-4 rounded-lg font-bold text-white text-lg flex items-center justify-center gap-3 shadow-md ${
              cart.length === 0 || !activeShift 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 transition-all hover:shadow-lg'
            }`}
          >
            <MdPayment size={26} />
            Proceder al Pago
            {!activeShift && <span className="text-xs">(Sin turno activo)</span>}
            {cart.length === 0 && <span className="text-xs">(Carrito vacío)</span>}
          </button>
        </div>
        
        {/* Modal de Creación de Cliente */}
        {showCustomerForm && (
          <div className="fixed inset-0 bg-slate-800 bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fadeIn">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-full">
                    <FaUser size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-slate-800">Nuevo Cliente</h3>
                    <p className="text-sm text-slate-500">Registrar un nuevo cliente</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCustomerForm(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all"
                >
                  <FaTimes size={18} />
                </button>
              </div>
              
              <form onSubmit={createCustomer}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center">
                      <span className="w-1 h-4 bg-red-500 rounded mr-2"></span>
                      Nombre*
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={newCustomer.name}
                      onChange={handleCustomerInputChange}
                      className="w-full p-3 border border-slate-300 rounded-lg focus-ring shadow-sm"
                      required
                      placeholder="Ingrese el nombre completo"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center">
                      <span className="w-1 h-4 bg-slate-300 rounded mr-2"></span>
                      Documento
                    </label>
                    <input
                      type="text"
                      name="document"
                      value={newCustomer.document}
                      onChange={handleCustomerInputChange}
                      className="w-full p-3 border border-slate-300 rounded-lg focus-ring shadow-sm"
                      placeholder="Número de identificación"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center">
                      <span className="w-1 h-4 bg-slate-300 rounded mr-2"></span>
                      Teléfono
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={newCustomer.phone}
                      onChange={handleCustomerInputChange}
                      className="w-full p-3 border border-slate-300 rounded-lg focus-ring shadow-sm"
                      placeholder="Número de contacto"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center">
                      <span className="w-1 h-4 bg-slate-300 rounded mr-2"></span>
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={newCustomer.email}
                      onChange={handleCustomerInputChange}
                      className="w-full p-3 border border-slate-300 rounded-lg focus-ring shadow-sm"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowCustomerForm(false)}
                    className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium shadow-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center shadow-sm hover:shadow"
                  >
                    <FaPlus size={12} className="mr-2" />
                    Guardar Cliente
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Modal de Pago */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fadeIn">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <MdPayment className="text-blue-600" size={24} />
                  <h3 className="font-bold text-xl text-slate-800">Finalizar Venta</h3>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-all"
                  disabled={isProcessing}
                >
                  <FaTimes size={18} />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <FaShoppingCart className="text-slate-600" size={16} />
                  <h4 className="font-medium text-slate-700">Resumen de la venta</h4>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between mb-2 text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  {calculateDiscount() > 0 && (
                    <div className="flex justify-between mb-2 text-rose-600">
                      <span className="flex items-center">
                        <MdDiscount className="mr-1" size={16} />
                        Descuento:
                      </span>
                      <span className="font-medium">-{formatCurrency(calculateDiscount())}</span>
                    </div>
                  )}
                  {calculateTax() > 0 && (
                    <div className="flex justify-between mb-2 text-blue-600">
                      <span>Impuesto:</span>
                      <span className="font-medium">{formatCurrency(calculateTax())}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg mt-3 pt-3 border-t border-slate-200">
                    <span className="text-slate-800">Total a pagar:</span>
                    <span className="text-slate-800">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
              
              {/* Uso de puntos si hay cliente */}
              {customer && (customer.totalPoints - customer.usedPoints) > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full">
                      <span className="text-xs font-bold">P</span>
                    </div>
                    <h4 className="font-medium text-slate-700">Puntos disponibles</h4>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        id="usePoints"
                        checked={paymentInfo.usePoints}
                        onChange={(e) => setPaymentInfo({...paymentInfo, usePoints: e.target.checked})}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                      />
                      <label htmlFor="usePoints" className="font-medium text-slate-700 ml-2">
                        Usar puntos para esta compra
                      </label>
                    </div>
                    
                    {paymentInfo.usePoints && (
                      <div>
                        <p className="text-sm mb-3 text-blue-700">
                          Puntos disponibles: <span className="font-semibold">{customer.totalPoints - customer.usedPoints}</span>
                        </p>
                        <div className="flex items-center">
                          <label className="text-sm font-medium text-slate-600 mr-3">Puntos a canjear:</label>
                          <div className="flex-1">
                            <input
                              type="number"
                              min="0"
                              max={customer.totalPoints - customer.usedPoints}
                              value={paymentInfo.pointsToRedeem}
                              onChange={(e) => setPaymentInfo({...paymentInfo, pointsToRedeem: parseInt(e.target.value) || 0})}
                              className="p-2 border border-blue-300 rounded-md w-24 text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <span className="text-sm ml-3 text-blue-700 font-medium">
                            = {formatCurrency(paymentInfo.pointsToRedeem * 0.1)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Métodos de pago */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <FaMoneyBillWave className="text-emerald-600" size={16} />
                    <h4 className="font-medium text-slate-700">Métodos de Pago</h4>
                  </div>
                  <button
                    onClick={addPaymentMethod}
                    className="inline-flex items-center text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 transition-colors"
                  >
                    <FaPlus size={10} className="mr-1.5" />
                    Añadir método
                  </button>
                </div>
                
                <div className="space-y-4">
                  {paymentInfo.methods.map((method, index) => (
                    <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          {method.type === 'efectivo' && <FaMoneyBillWave className="text-emerald-600" size={16} />}
                          {method.type === 'tarjeta' && <FaCreditCard className="text-blue-600" size={16} />}
                          {method.type === 'transferencia' && <FaExchangeAlt className="text-purple-600" size={16} />}
                          <select
                            value={method.type}
                            onChange={(e) => updatePaymentMethod(index, 'type', e.target.value)}
                            className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          >
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="otro">Otro</option>
                          </select>
                        </div>
                        
                        {index > 0 && (
                          <button
                            onClick={() => removePaymentMethod(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                          >
                            <FaTrash size={14} />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex space-x-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Monto</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <span className="text-slate-500">$</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={method.amount}
                              onChange={(e) => updatePaymentMethod(index, 'amount', e.target.value)}
                              className="w-full pl-7 p-2.5 border border-slate-300 rounded-md text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                        
                        {method.type !== 'efectivo' && (
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Referencia</label>
                            <input
                              type="text"
                              value={method.reference}
                              onChange={(e) => updatePaymentMethod(index, 'reference', e.target.value)}
                              placeholder={method.type === 'tarjeta' ? "Últimos 4 dígitos" : "# de referencia"}
                              className="w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between mt-4 p-3 bg-slate-100 rounded-lg">
                  <span className="font-medium text-slate-700">Total pagado:</span>
                  <span className={`font-bold ${Math.abs(totalPaymentAmount() - calculateTotal()) > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(totalPaymentAmount())}
                  </span>
                </div>
                
                {Math.abs(totalPaymentAmount() - calculateTotal()) > 0.01 && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mt-2 flex items-center gap-2">
                    <FaExclamationTriangle />
                    <p className="text-sm">
                      {totalPaymentAmount() < calculateTotal() 
                        ? `Falta: ${formatCurrency(calculateTotal() - totalPaymentAmount())}` 
                        : `Sobra: ${formatCurrency(totalPaymentAmount() - calculateTotal())}`}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 mt-8 pt-3 border-t border-slate-200">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-5 py-2.5 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 transition-colors font-medium"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || Math.abs(totalPaymentAmount() - calculateTotal()) > 0.01}
                  className={`px-5 py-2.5 rounded-md text-white font-medium flex items-center ${
                    isProcessing || Math.abs(totalPaymentAmount() - calculateTotal()) > 0.01 
                      ? 'bg-slate-300 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 transition-colors'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <FaArrowRight size={14} className="mr-2" />
                      Finalizar Venta
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Comprobante */}
        {showReceiptModal && sale && (
          <div className="fixed inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-fadeIn">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <FaPrint className="text-blue-600" size={18} />
                  <h3 className="font-bold text-xl text-slate-800">Comprobante de Venta</h3>
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                  #{sale.id}
                </span>
              </div>
              
              <div className="mb-5 bg-slate-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Fecha:</p>
                    <p className="font-medium text-slate-800">{new Date(sale.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Vendedor:</p>
                    <p className="font-medium text-slate-800">{sale.user ? sale.user.name : 'No especificado'}</p>
                  </div>
                </div>
                
                {sale.client && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-0.5">Cliente:</p>
                    <p className="font-medium text-slate-800">{sale.client.name || 'Sin nombre'}</p>
                    {sale.client.document && (
                      <p className="text-sm text-slate-600 flex items-center mt-1">
                        <span className="w-5 h-5 inline-flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-2 text-xs">ID</span>
                        {sale.client.document}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <FaShoppingCart className="text-slate-600" size={14} />
                  <h4 className="font-semibold text-slate-700">Detalle de productos</h4>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Producto</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">Cant.</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Precio</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sale.saleItems && sale.saleItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-slate-800">{item.product.name}</td>
                          <td className="px-3 py-2.5 text-center text-slate-800">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-800">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mb-5 bg-white p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between mb-2 text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
                </div>
                {sale.discount && sale.discount > 0 && (
                  <div className="flex justify-between mb-2 text-rose-600">
                    <span className="flex items-center">
                      <MdDiscount className="mr-1" size={16} />
                      Descuento:
                    </span>
                    <span className="font-medium">-{formatCurrency(sale.discount)}</span>
                  </div>
                )}
                {sale.tax && sale.tax > 0 && (
                  <div className="flex justify-between mb-2 text-blue-600">
                    <span>Impuesto:</span>
                    <span className="font-medium">{formatCurrency(sale.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg mt-3 pt-3 border-t border-slate-200">
                  <span className="text-slate-800">TOTAL:</span>
                  <span className="text-slate-800">{formatCurrency(sale.amount)}</span>
                </div>
              </div>
              
              {sale.payments && sale.payments.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MdPayment className="text-slate-600" size={16} />
                    <h4 className="font-semibold text-slate-700">Método de pago</h4>
                  </div>
                  
                  <div className="grid gap-2">
                    {sale.payments.map(payment => (
                      <div key={payment.id} className={`flex items-center justify-between p-3 rounded-lg ${
                        payment.type === 'efectivo' ? 'bg-emerald-50 border border-emerald-100' :
                        payment.type === 'tarjeta' ? 'bg-blue-50 border border-blue-100' :
                        'bg-purple-50 border border-purple-100'
                      }`}>
                        <div className="flex items-center gap-2">
                          {payment.type === 'efectivo' && <FaMoneyBillWave className="text-emerald-600" size={16} />}
                          {payment.type === 'tarjeta' && <FaCreditCard className="text-blue-600" size={16} />}
                          {payment.type === 'transferencia' && <FaExchangeAlt className="text-purple-600" size={16} />}
                          <span className="font-medium">
                            {payment.type === 'efectivo' ? 'Efectivo' : 
                             payment.type === 'tarjeta' ? 'Tarjeta' : 
                             payment.type === 'transferencia' ? 'Transferencia' : 
                             payment.type}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(payment.amount)}</div>
                          {payment.reference && (
                            <div className="text-xs mt-1 text-slate-500">Ref: {payment.reference}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {sale.client && (sale.pointsEarned || sale.pointsRedeemed) && ((sale.pointsEarned > 0 || sale.pointsRedeemed > 0)) && (
                <div className="mb-5 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full">
                      <span className="text-xs font-bold">P</span>
                    </div>
                    <h4 className="font-semibold text-blue-800">Programa de puntos</h4>
                  </div>
                  
                  <div className="grid gap-2">
                    {sale.pointsEarned > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700">Puntos ganados:</span>
                        <span className="font-medium text-blue-800">+{sale.pointsEarned} pts</span>
                      </div>
                    )}
                    {sale.pointsRedeemed > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-700">Puntos canjeados:</span>
                        <span className="font-medium text-red-700">-{sale.pointsRedeemed} pts</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {sale.notes && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FaEdit className="text-slate-600" size={14} />
                    <h4 className="font-semibold text-slate-700">Notas</h4>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800">
                    {sale.notes}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
                <button
                  onClick={handlePrintReceipt}
                  className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  <FaPrint size={14} className="mr-2" />
                  Imprimir comprobante
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default POS;
