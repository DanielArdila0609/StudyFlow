(() => {
  'use strict';
  const SF = window.SF;
  SF.onReady(() => {
    if (!SF.currentUser()) return;
    render();
    document.addEventListener('sf:change', render);
  });
  function render() {
    const streak = SF.streak();
    document.getElementById('currentStreak').textContent = streak;
    document.getElementById('streakUnit').textContent = streak === 1 ? 'día' : 'días';
    document.getElementById('streakMessage').textContent = streak
      ? '¡Muy bien! Sigue estudiando para mantener tu constancia.'
      : 'Empieza hoy y construye tu primera racha.';
    document.getElementById('todayMinutes').textContent = `${SF.formatMinutes(SF.minutesToday())}`;
    document.getElementById('todaySessions').textContent = SF.sessionsToday();
    document.getElementById('completedTasks').textContent = SF.counts().completed;
  }
})();
