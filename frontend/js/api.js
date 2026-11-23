/* StudyFlow — Cliente de la API (backend Node + PostgreSQL)
   La identidad la da la cookie de sesión HttpOnly (el navegador la envía sola y
   JavaScript no puede leerla). Aquí no se guarda ni se envía ningún ID de usuario. */
window.API = (() => {
  'use strict';
  // Mismo origen que el backend (Render o http://localhost:3000). Abre la app desde
  // el servidor de Node; con Live Server u otro puerto las cookies no funcionarían.
  const BASE_URL = '/api';

  async function request(path, { method = 'GET', body, keepalive = false } = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'same-origin',
      keepalive,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'StudyFlow' // exigida por el backend (protección CSRF)
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.error || (payload.errors || []).join(' ') || `Error ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  return {
    register: (body) => request('/auth/register', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    logout: () => request('/auth/logout', { method: 'POST', keepalive: true }),
    me: () => request('/auth/me'),
    changePassword: (body) => request('/auth/password', { method: 'POST', body }),
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