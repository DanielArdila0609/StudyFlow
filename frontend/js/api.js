/* StudyFlow — Cliente de la API (backend Node + Firestore) */
window.API = (() => {
  'use strict';
  const BASE_URL = 'http://localhost:3000/api';

  // Función dinámica para obtener el ID del usuario actual de la sesión
  function getUserId() {
    try {
      // Busca la clave donde store.js guarda la sesión actual
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('current')) {
          const user = JSON.parse(localStorage.getItem(key));
          if (user && user.email) {
            // Convierte el correo en un ID apto para carpetas (reemplaza @ y puntos)
            return user.email.replace(/[@.]/g, '_');
          }
        }
      }
    } catch (e) {
      console.error('Error obteniendo usuario activo:', e);
    }
    return 'demo123'; // Fallback por defecto si no hay sesión activa
  }

  async function request(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': getUserId() // ¡Ahora es dinámico según quién haya iniciado sesión!
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.error || (payload.errors || []).join(' ') || `Error ${response.status}`;
      throw new Error(message);
    }
    return payload;
  }

  return {
    listSubjects: () => request('/materias'),
    createSubject: (body) => request('/materias', { method: 'POST', body }),
    updateSubject: (id, body) => request(`/materias/${id}`, { method: 'PATCH', body }),
    deleteSubject: (id) => request(`/materias/${id}`, { method: 'DELETE' }),
    listTasks: () => request('/tareas'),
    createTask: (body) => request('/tareas', { method: 'POST', body }),
    updateTask: (id, body) => request(`/tareas/${id}`, { method: 'PATCH', body }),
    deleteTask: (id) => request(`/tareas/${id}`, { method: 'DELETE' })
  };
})();