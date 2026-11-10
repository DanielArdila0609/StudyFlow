/* StudyFlow — Cliente de la API (backend Node + Firestore) */
window.API = (() => {
  'use strict';
  const BASE_URL = 'http://localhost:3000/api';
  const USER_ID = 'demo123'; // TEMPORAL: reemplazar por token luego

  async function request(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': USER_ID
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