/* =========================================================
   StudyFlow — Capa de datos
   Cuentas y sesión: las gestiona el servidor (PostgreSQL + cookie HttpOnly).
   Materias y tareas viven en el backend; en localStorage solo quedan el perfil
   visible (nombre, universidad, foto...), el Pomodoro y el correo de la sesión
   como pista para pintar la interfaz. Nunca contraseñas ni tokens.
   ========================================================= */

window.SF = (() => {
  'use strict';

  const KEYS = {
    accounts: 'studyflow:accounts',
    session: 'studyflow:session',
    data: (email) => `studyflow:data:${email}`
  };
// Materias y tareas viven en el backend; aquí solo hay una copia en memoria
  const cache = { subjects: [], tasks: [] };
  const COLORS = ['red', 'blue', 'amber', 'purple', 'green', 'sky', 'pink'];
  const EMOJIS = ['📚', '📐', '⚛️', '🧪', '💻', '📜', '🎨', '🌎'];
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const PRIORITY = {
    high: { label: 'Alta', tone: 'red', weight: 3 },
    medium: { label: 'Media', tone: 'amber', weight: 2 },
    low: { label: 'Baja', tone: 'green', weight: 1 }
  };

  /* ---------- Utilidades ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const norm = (email) => String(email || '').trim().toLowerCase();

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const fromKey = (key) => {
    const [y, m, d] = String(key).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const todayKey = () => toKey(new Date());
  const addDays = (key, n) => {
    const d = fromKey(key);
    d.setDate(d.getDate() + n);
    return toKey(d);
  };

  function emit() {
    document.dispatchEvent(new CustomEvent('sf:change'));
  }

  /* ---------- Cuenta y sesión (el servidor es la autoridad) ---------- */
  const accounts = () => read(KEYS.accounts, {});
  const account = (email) => accounts()[norm(email)] || null;

  function saveAccount(acc) {
    const all = accounts();
    all[acc.email] = acc;
    write(KEYS.accounts, all);
  }

  // Cuentas guardadas por la versión anterior (simulada): se eliminan sus hashes locales.
  function purgeLegacyCredentials() {
    const all = accounts();
    let changed = false;
    Object.values(all).forEach((acc) => {
      if (acc && ('passHash' in acc || 'salt' in acc)) { delete acc.passHash; delete acc.salt; changed = true; }
    });
    if (changed) write(KEYS.accounts, all);
  }

  // Guarda el perfil visible a partir del usuario que confirmó el servidor.
  function adoptUser(serverUser) {
    const email = norm(serverUser.email);
    let acc = account(email);
    if (!acc) {
      const [name, ...rest] = String(serverUser.name || '').trim().split(/\s+/);
      acc = { name: name || '', lastName: rest.join(' '), university: '', career: '', semester: '', avatar: '', provider: 'email' };
    }
    acc = { ...acc, id: serverUser.id, email, createdAt: serverUser.createdAt || acc.createdAt || new Date().toISOString() };
    saveAccount(acc);
    write(KEYS.session, email);
    return acc;
  }

  // El registro NO inicia sesión: después se entra desde «Iniciar sesión».
  const register = ({ fullName, email, password }) => API.register({ name: fullName, email, password });

  // Devuelve el perfil si las credenciales son correctas, null si no; otros errores se propagan.
  async function authenticate(email, password) {
    try {
      const { user } = await API.login({ email, password });
      return adoptUser(user);
    } catch (error) {
      if (error.status === 401) return null;
      throw error;
    }
  }

  const changePassword = (currentPassword, newPassword) => API.changePassword({ currentPassword, newPassword });

  function updateAccount(patch) {
    const acc = currentUser();
    if (!acc) return null;
    const updated = { ...acc, ...patch };
    saveAccount(updated);
    emit();
    return updated;
  }

  const login = (email) => write(KEYS.session, norm(email));

  function clearSession() {
    try { localStorage.removeItem(KEYS.session); } catch (error) { /* sin acceso a storage */ }
    cache.subjects = [];
    cache.tasks = [];
  }

  function logout() {
    clearSession();
    if (window.API) API.logout().catch(() => {}); // el servidor cierra la sesión y borra la cookie
  }

  function currentUser() {
    const email = read(KEYS.session, null);
    return email ? account(email) : null;
  }

  function requireUser() {
    const user = currentUser();
    if (!user) {
      window.location.replace('iniciar-sesion.html');
      return null;
    }
    return user;
  }

  // Confirma con el servidor que la sesión sigue vigente; si no, limpia la pista local.
  async function verifySession() {
    if (!window.API || !currentUser()) return;
    try {
      const { user } = await API.me();
      adoptUser(user);
    } catch (error) {
      if (error.status === 401) clearSession();
      else console.error('No se pudo verificar la sesión:', error.message);
    }
  }

  const fullName = (acc) => [acc.name, acc.lastName].filter(Boolean).join(' ') || acc.email;
  const initials = (acc) => {
    const letters = [acc.name, acc.lastName].filter(Boolean).map((part) => part.trim()[0]).join('').slice(0, 2);
    return (letters || acc.email[0] || '?').toUpperCase();
  };

  /* ---------- Datos por cuenta ---------- */
  const defaultSettings = () => ({ focus: 25, short: 5, long: 20, cycles: 4, dailyGoal: 4, sound: false, notify: false, auto: false });
  const emptyData = () => ({ subjects: [], tasks: [], pomodoro: { settings: defaultSettings(), sessions: [], timer: null } });

  function data() {
    const acc = currentUser();
    const base = emptyData();
    if (!acc) return base;
    const stored = read(KEYS.data(acc.email), base);
    return {
      subjects: cache.subjects,   // antes: stored.subjects
      tasks: cache.tasks,         // antes: stored.tasks
      pomodoro: {
        settings: { ...base.pomodoro.settings, ...((stored.pomodoro || {}).settings || {}) },
        sessions: (stored.pomodoro || {}).sessions || [],
        timer: (stored.pomodoro || {}).timer || null
      }
    };
  }

  function save(d, silent) {
    const acc = currentUser();
    if (!acc) return;
    cache.subjects = d.subjects;
    cache.tasks = d.tasks;
    write(KEYS.data(acc.email), { pomodoro: d.pomodoro }); // solo Pomodoro en localStorage
    if (!silent) emit();
  }

  function update(mutator, silent) {
    const d = data();
    const result = mutator(d);
    save(d, silent);
    return result;
  }

  /* ---------- Sincronización con el backend ---------- */
  async function loadFromServer(quiet = false) {
    if (!window.API || !currentUser()) return; // páginas públicas no consultan el backend
    try {
      const [subjects, tasks] = await Promise.all([API.listSubjects(), API.listTasks()]);
      cache.subjects = subjects;
      cache.tasks = tasks;
    } catch (error) {
      if (error.status === 401) { clearSession(); window.location.replace('iniciar-sesion.html'); return; }
      console.error('No se pudieron cargar los datos del backend:', error.message);
      // Sin este aviso la pantalla quedaría vacía y parecería que se perdieron los datos.
      if (!quiet && window.SFUI) window.SFUI.toast(`No se pudieron cargar tus datos. ${error.message}`, 'error');
    }
  }

  // Si la sesión expiró (401) al guardar, limpia la pista local y vuelve al inicio de sesión.
  function handleExpiredSession(error) {
    if (error && error.status === 401) {
      clearSession();
      window.location.replace('iniciar-sesion.html');
    }
  }

  // Envía el cambio en segundo plano; si falla, vuelve a los datos reales del servidor
  function sync(request, errorMessage) {
    request.catch(async (error) => {
      console.error(errorMessage, error);
      await loadFromServer(true); // el aviso de abajo ya informa del fallo
      emit();
      if (window.SFUI) window.SFUI.toast(`${errorMessage}: ${error.message}`, 'error');
    });
  }
  /* ---------- Materias ---------- */
  const subjects = () => data().subjects;
  const subjectById = (id) => data().subjects.find((s) => s.id === id) || null;

// Async: el ID lo genera Firestore, así que se espera la respuesta
  async function addSubject({ name, teacher = '', emoji, color }) {
    let created;
    try {
      created = await API.createSubject({
        name: name.trim(),
        teacher: String(teacher).trim(),
        emoji: emoji || EMOJIS[0],
        color: color || COLORS[0]
      });
    } catch (error) { handleExpiredSession(error); throw error; }
    update((d) => { d.subjects.push(created); });
    return created;
  }

  function updateSubject(id, patch) {
    update((d) => {
      const subject = d.subjects.find((s) => s.id === id);
      if (subject) Object.assign(subject, patch);
    });
    sync(API.updateSubject(id, patch), 'No se pudo actualizar la materia');
  }

  function removeSubject(id) {
    update((d) => {
      d.subjects = d.subjects.filter((s) => s.id !== id);
      d.tasks = d.tasks.filter((t) => t.subjectId !== id);
    });
    sync(API.deleteSubject(id), 'No se pudo eliminar la materia');
  }

  async function addTask({ title, subjectId = '', priority = 'medium', dueDate = '', dueTime = '', tags = [], notes = '' }) {
    let created;
    try {
      created = await API.createTask({ title: title.trim(), subjectId, priority, dueDate, dueTime, tags, notes });
    } catch (error) { handleExpiredSession(error); throw error; }
    update((d) => { d.tasks.push(created); });
    return created;
  }

  function updateTask(id, patch) {
    update((d) => {
      const task = d.tasks.find((t) => t.id === id);
      if (task) Object.assign(task, patch);
    });
    sync(API.updateTask(id, patch), 'No se pudo actualizar la tarea');
  }

  function removeTask(id) {
    update((d) => { d.tasks = d.tasks.filter((t) => t.id !== id); });
    sync(API.deleteTask(id), 'No se pudo eliminar la tarea');
  }

  function toggleTask(id) {
    const task = update((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (!t) return null;
      t.done = !t.done;
      t.completedAt = t.done ? new Date().toISOString() : null;
      return t;
    });
    if (task) sync(API.updateTask(id, { done: task.done, completedAt: task.completedAt }), 'No se pudo actualizar la tarea');
    return task;
  }

  function persistSubtasks(taskId) {
    const task = taskById(taskId);
    if (task) sync(API.updateTask(taskId, { subtasks: task.subtasks }), 'No se pudo guardar la subtarea');
  }

  function addSubtask(taskId, text) {
    update((d) => {
      const task = d.tasks.find((t) => t.id === taskId);
      if (task) task.subtasks.push({ id: uid(), text: text.trim(), done: false });
    });
    persistSubtasks(taskId);
  }

  function toggleSubtask(taskId, subId) {
    update((d) => {
      const task = d.tasks.find((t) => t.id === taskId);
      const sub = task && task.subtasks.find((s) => s.id === subId);
      if (sub) sub.done = !sub.done;
    });
    persistSubtasks(taskId);
  }

  function removeSubtask(taskId, subId) {
    update((d) => {
      const task = d.tasks.find((t) => t.id === taskId);
      if (task) task.subtasks = task.subtasks.filter((s) => s.id !== subId);
    });
    persistSubtasks(taskId);
  }

  /* ---------- Tareas ---------- */
  const tasks = () => data().tasks;
  const taskById = (id) => data().tasks.find((t) => t.id === id) || null;

  /** Fecha y hora límite como Date (hora por defecto: 23:59). */
  function dueDateTime(task) {
    if (!task.dueDate) return null;
    const date = fromKey(task.dueDate);
    const [h, m] = (task.dueTime || '23:59').split(':').map(Number);
    date.setHours(h || 0, m || 0, 0, 0);
    return date;
  }

  const isOverdue = (task) => !task.done && !!task.dueDate && dueDateTime(task) < new Date();

  function taskFraction(task) {
    if (task.done) return 1;
    if (!task.subtasks.length) return 0;
    return task.subtasks.filter((s) => s.done).length / task.subtasks.length;
  }

  function formatDue(task) {
    if (!task.dueDate) return 'Sin fecha';
    const today = todayKey();
    const time = task.dueTime ? `, ${task.dueTime}` : '';
    if (task.dueDate === today) return `Hoy${time}`;
    if (task.dueDate === addDays(today, 1)) return `Mañana${time}`;
    const d = fromKey(task.dueDate);
    const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${year}${time}`;
  }

  /** Orden por fecha límite (sin fecha al final). */
  function byDue(a, b) {
    const da = dueDateTime(a);
    const db = dueDateTime(b);
    if (da && db) return da - db;
    if (da) return -1;
    if (db) return 1;
    return a.createdAt - b.createdAt;
  }

  function counts() {
    const list = tasks();
    const today = todayKey();
    return {
      pending: list.filter((t) => !t.done).length,
      completed: list.filter((t) => t.done).length,
      overdue: list.filter(isOverdue).length,
      today: list.filter((t) => !t.done && t.dueDate === today).length
    };
  }

  function subjectStats(subjectId) {
    const d = data();
    const list = d.tasks.filter((t) => t.subjectId === subjectId);
    const done = list.filter((t) => t.done).length;
    const progress = list.length ? Math.round((list.reduce((sum, t) => sum + taskFraction(t), 0) / list.length) * 100) : 0;
    return { total: list.length, done, pending: list.length - done, progress };
  }

  /** Progreso del día: tareas con fecha de hoy o completadas hoy. */
  function daySummary() {
    const today = todayKey();
    const list = tasks().filter((t) => t.dueDate === today || (t.completedAt && toKey(new Date(t.completedAt)) === today));
    const percent = list.length ? Math.round((list.reduce((sum, t) => sum + taskFraction(t), 0) / list.length) * 100) : 0;
    return { total: list.length, percent };
  }

  const completedToday = () => tasks().filter((t) => t.completedAt && toKey(new Date(t.completedAt)) === todayKey()).length;

  /** Recordatorios derivados de las tareas (vencidas, hoy, mañana y esta semana). */
  function reminders() {
    const today = todayKey();
    const tomorrow = addDays(today, 1);
    const weekEnd = addDays(today, 7);
    const out = [];
    tasks().filter((t) => !t.done).sort(byDue).forEach((t) => {
      if (isOverdue(t)) out.push({ kind: 'overdue', task: t, text: `Tarea vencida: ${t.title}` });
      else if (t.dueDate === today) out.push({ kind: 'today', task: t, text: `Entrega de «${t.title}» hoy${t.dueTime ? ` a las ${t.dueTime}` : ''}` });
      else if (t.dueDate === tomorrow) out.push({ kind: 'tomorrow', task: t, text: `«${t.title}» vence mañana${t.dueTime ? ` a las ${t.dueTime}` : ''}` });
      else if (t.dueDate && t.dueDate <= weekEnd) {
        const day = WEEKDAYS[fromKey(t.dueDate).getDay()].toLowerCase();
        out.push({ kind: 'week', task: t, text: `«${t.title}» para el ${day}${t.dueTime ? ` a las ${t.dueTime}` : ''}` });
      }
    });
    return out;
  }

  /** Tono e ícono de cada tipo de recordatorio (vencida/hoy, mañana, esta semana). */
  const REMINDER_STYLE = {
    overdue: { tone: 'danger', icon: 'alert' },
    today: { tone: 'danger', icon: 'alert' },
    tomorrow: { tone: 'info', icon: 'star' },
    week: { tone: 'warn', icon: 'clock' }
  };
  const reminderStyle = (kind) => REMINDER_STYLE[kind] || REMINDER_STYLE.week;

  /* ---------- Pomodoro ---------- */
  const settings = () => data().pomodoro.settings;

  function saveSettings(patch) {
    update((d) => { Object.assign(d.pomodoro.settings, patch); }, true);
  }

  function recordSession(minutes) {
    update((d) => {
      d.pomodoro.sessions.push({ date: todayKey(), minutes, at: Date.now() });
    });
  }

  const sessionsOn = (key) => data().pomodoro.sessions.filter((s) => s.date === key);
  const sessionsToday = () => sessionsOn(todayKey()).length;
  const minutesToday = () => sessionsOn(todayKey()).reduce((sum, s) => sum + s.minutes, 0);

  function streak() {
    const days = new Set(data().pomodoro.sessions.map((s) => s.date));
    let cursor = todayKey();
    if (!days.has(cursor)) cursor = addDays(cursor, -1);
    let count = 0;
    while (days.has(cursor)) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    return count;
  }

  const getTimer = () => data().pomodoro.timer;
  const saveTimer = (timer) => update((d) => { d.pomodoro.timer = timer; }, true);

  const isNewUser = () => {
    const d = data();
    return !d.tasks.length && !d.subjects.length && !d.pomodoro.sessions.length;
  };

  function formatHours(minutes) {
    if (!minutes) return '0 h';
    return `${Math.round((minutes / 60) * 10) / 10} h`;
  }

  function formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h ? `${h}h ${pad(m)}m` : `${m}m`;
  }

  /* ---------- Arranque de página ---------- */
  const ready = (async () => {
    purgeLegacyCredentials();
    await verifySession();
    await loadFromServer();
  })();

  const domReady = new Promise((resolve) => {
    if (document.readyState !== 'loading') resolve();
    else document.addEventListener('DOMContentLoaded', resolve, { once: true });
  });

  const onReady = (fn) => Promise.all([ready, domReady]).then(fn);

  window.addEventListener('storage', (event) => {
    if (event.key && event.key.startsWith('studyflow:')) emit();
  });

  return {
    COLORS, EMOJIS, MONTHS, MONTHS_SHORT, WEEKDAYS, PRIORITY,
    esc, uid, pad, toKey, fromKey, todayKey, addDays, onReady,
    register, authenticate, changePassword, updateAccount, account, login, logout, currentUser, requireUser, fullName, initials,
    data, subjects, subjectById, addSubject, updateSubject, removeSubject,
    tasks, taskById, addTask, updateTask, removeTask, toggleTask, addSubtask, toggleSubtask, removeSubtask,
    dueDateTime, isOverdue, taskFraction, formatDue, byDue, counts, subjectStats, daySummary, completedToday, reminders, reminderStyle,
    settings, saveSettings, recordSession, sessionsToday, minutesToday, streak, getTimer, saveTimer,
    isNewUser, formatHours, formatMinutes
  };
})();