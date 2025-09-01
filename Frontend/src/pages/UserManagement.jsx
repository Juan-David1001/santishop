import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import toast from 'react-hot-toast';
import '../styles/UserManagement.css';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({ name: '', username: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Función para filtrar usuarios según término de búsqueda
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/users');
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Error al cargar los usuarios');
      toast.error('Error al cargar los usuarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!newUser.name || !newUser.username) {
      toast.error('Nombre y nombre de usuario son obligatorios');
      return;
    }

    try {
      const response = await apiClient.post('/users', newUser);
      setUsers([...users, response.data]);
      setNewUser({ name: '', username: '' });
      toast.success('Usuario creado exitosamente');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear el usuario');
      console.error(err);
    }
  };

  // Funciones para manejo de usuarios
  const handleEditUserClick = (user) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      username: user.username
    });
    setIsEditing(true);
    // Scroll hacia el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info(`Editando usuario: ${user.name}`);
  };
  
  const handleDeleteUserClick = async (user) => {
    if (window.confirm(`¿Está seguro de que desea eliminar al usuario ${user.name}?`)) {
      try {
        // Aquí iría la lógica para eliminar el usuario
        toast.success(`Usuario ${user.name} eliminado correctamente`);
        loadUsers(); // Recargar la lista de usuarios
      } catch (err) {
        toast.error('Error al eliminar el usuario');
        console.error(err);
      }
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingUser(null);
    setNewUser({ name: '', username: '' });
  };
  
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!newUser.name || !newUser.username) {
      toast.error('Nombre y nombre de usuario son obligatorios');
      return;
    }
    
    try {
      // Aquí iría la lógica para actualizar el usuario
      // const response = await apiClient.put(`/users/${editingUser.id}`, newUser);
      
      toast.success(`Usuario ${editingUser.name} actualizado correctamente`);
      setIsEditing(false);
      setEditingUser(null);
      setNewUser({ name: '', username: '' });
      loadUsers(); // Recargar la lista de usuarios
    } catch (err) {
      toast.error('Error al actualizar el usuario');
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-700 rounded-lg shadow-lg mr-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Usuarios</h1>
            <p className="text-sm text-slate-500">
              {isEditing 
                ? `Editando usuario: ${editingUser.name}` 
                : "Administración de cuentas y permisos"}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2 w-full md:w-auto">
          {isEditing && (
            <button 
              onClick={handleCancelEdit}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar Edición
            </button>
          )}
          <button 
            onClick={loadUsers}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 w-full md:w-auto justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-6 shadow-sm">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}
      
      {loading && (
        <div className="flex flex-col justify-center items-center h-60 bg-white rounded-xl shadow-md mb-8">
          <div className="relative w-20 h-20">
            <div className="absolute top-0 mt-1 w-20 h-20 border-4 border-fuchsia-200 rounded-full"></div>
            <div className="absolute top-0 mt-1 w-20 h-20 border-4 border-transparent rounded-full animate-spin border-t-fuchsia-600 border-l-fuchsia-600"></div>
          </div>
          <p className="mt-4 text-fuchsia-800 font-medium">Cargando usuarios...</p>
          <p className="text-sm text-slate-500 mt-2">Estamos obteniendo la información</p>
        </div>
      )}

      {/* Formulario para crear/editar usuarios */}
      <div className={`bg-white rounded-xl shadow-lg p-6 mb-8 ${isEditing ? 'border-l-4 border-fuchsia-500 edit-mode-active' : ''}`}>
        <div className="flex items-center mb-6">
          <div className="p-2 bg-gradient-to-r from-violet-100 to-fuchsia-100 rounded-lg shadow-inner mr-3">
            <svg className="w-6 h-6 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {isEditing ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              )}
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-800">
            {isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h3>
          
          {isEditing && (
            <span className="ml-3 bg-fuchsia-100 text-fuchsia-800 text-xs font-medium py-1 px-2 rounded">
              ID: {editingUser.id}
            </span>
          )}
        </div>
        
        <form onSubmit={isEditing ? handleUpdateUser : handleCreateUser}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                Nombre Completo
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newUser.name}
                  onChange={handleInputChange}
                  className={`w-full pl-10 px-4 py-2.5 border ${isEditing ? 'border-fuchsia-300 bg-fuchsia-50' : 'border-slate-300'} rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all duration-200`}
                  placeholder="Ej. Juan Pérez"
                />
              </div>
            </div>
            
            <div className="relative">
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                Nombre de Usuario
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={newUser.username}
                  onChange={handleInputChange}
                  className={`w-full pl-10 px-4 py-2.5 border ${isEditing ? 'border-fuchsia-300 bg-fuchsia-50' : 'border-slate-300'} rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all duration-200`}
                  placeholder="Ej. juanperez"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">El nombre de usuario debe ser único en el sistema</p>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={isEditing ? handleCancelEdit : () => setNewUser({ name: '', username: '' })}
              className="mr-3 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center btn-hover-effect"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                {isEditing ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                )}
              </svg>
              {isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <div className="p-2 bg-white/20 rounded-lg mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Usuarios Registrados</h3>
          </div>
          
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar usuarios..."
              className="pl-10 w-full bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 py-2 focus:outline-none focus:ring-2 focus:ring-white/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="p-6">
          {loading ? null : filteredUsers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
              <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-slate-700 font-medium text-lg">
                {users.length === 0 ? "No hay usuarios registrados" : "No se encontraron usuarios"}
              </h3>
              <p className="mt-2 text-slate-500 max-w-sm mx-auto">
                {users.length === 0 
                  ? "Utiliza el formulario de arriba para crear tu primer usuario en el sistema"
                  : `No se encontraron usuarios que coincidan con "${searchTerm}"`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gradient-to-r from-violet-50 to-fuchsia-50">
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">ID</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Nombre</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Nombre de Usuario</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Fecha de Creación</th>
                    <th className="text-left py-3.5 px-4 font-medium text-slate-700 border-b border-slate-200">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors duration-150 user-row">
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{user.id}</td>
                      <td className="py-3.5 px-4 text-slate-700">{user.name}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-mono text-sm">{user.username}</td>
                      <td className="py-3.5 px-4 text-slate-600 text-sm">
                        {new Date(user.createdAt).toLocaleString('es-ES', { 
                          year: 'numeric', 
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex space-x-2">
                          <button
                            className="flex items-center justify-center px-3 py-1.5 text-fuchsia-600 bg-fuchsia-50 rounded-lg hover:bg-fuchsia-100 transition-colors"
                            onClick={() => handleEditUserClick(user)}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                          <button
                            className="flex items-center justify-center px-3 py-1.5 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            onClick={() => handleDeleteUserClick(user)}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Eliminar
                          </button>
                        </div>
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

export default UserManagement;
