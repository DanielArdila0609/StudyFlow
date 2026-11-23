/* =========================================================
   StudyFlow — Autenticación (servidor + sesión por cookie HttpOnly)
   Iniciar sesión, crear cuenta y recuperar contraseña.
   ========================================================= */

(() => {
  'use strict';

  const { icon } = window.SFIcons;
  const UI = window.SFUI;
  const SF = window.SF;

  const DASHBOARD = 'dashboard.html';

  SF.onReady(() => {
    const onRecover = document.getElementById('recoverForm');

    // Quien ya tiene sesión va directo al panel (excepto al recuperar contraseña).
    if (SF.currentUser() && !onRecover && !document.getElementById('signupForm')) {
      window.location.replace(DASHBOARD);
      return;
    }

    renderVisual();
    UI.setupPasswordToggles();

    const login = document.getElementById('loginForm');
    const signup = document.getElementById('signupForm');

    if (login) setupLogin(login);
    if (signup) setupSignup(signup);
    if (onRecover) setupRecover();
  });

  /* ---------- Iniciar sesión ---------- */
  function setupLogin(form) {
    const emailFromUrl = new URLSearchParams(window.location.search).get('email');
    if (emailFromUrl && form.email) form.email.value = emailFromUrl;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      UI.clearErrors(form);

      const email = form.email.value.trim();
      const password = form.password.value;
      let valid = true;

      if (!UI.validEmail(email)) { UI.setFieldError(form.email, 'Escribe un correo electrónico válido.'); valid = false; }
      if (!password) { UI.setFieldError(form.password, 'Escribe tu contraseña.'); valid = false; }
      if (!valid) return;

      const submit = form.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        const account = await SF.authenticate(email, password);
        if (!account) { UI.formError(form, 'Correo o contraseña incorrectos.'); return; }
        window.location.href = DASHBOARD;
      } catch (error) {
        UI.formError(form, error.status === 429 || error.status === 400 || error.transient
          ? error.message
          : 'No se pudo iniciar sesión. Inténtalo nuevamente.');
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }

  /* ---------- Crear cuenta ---------- */
  function setupSignup(form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      UI.clearErrors(form);

      const fullName = form.elements.name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      let valid = true;

      if (fullName.length < 2) { UI.setFieldError(form.elements.name, 'Escribe tu nombre completo.'); valid = false; }
      if (!UI.validEmail(email)) { UI.setFieldError(form.email, 'Escribe un correo electrónico válido.'); valid = false; }
      if (password.length < 8) { UI.setFieldError(form.password, 'La contraseña debe tener al menos 8 caracteres.'); valid = false; }
      if (form.confirm.value !== password) { UI.setFieldError(form.confirm, 'Las contraseñas no coinciden.'); valid = false; }
      if (!form.terms.checked) { UI.setFieldError(form.terms, 'Debes aceptar los términos y condiciones.'); valid = false; }
      if (!valid) return;

      const submit = form.querySelector('[type="submit"]');
      if (submit) { submit.disabled = true; submit.textContent = 'Creando cuenta…'; }
      try {
        await SF.register({ fullName, email, password });
      } catch (error) {
        const status = error && error.status;
        UI.setFieldError(form.email, status === 409
          ? 'Este correo ya tiene una cuenta. Inicia sesión.'
          : (status === 400 || status === 429 || (error && error.transient) ? error.message : 'No se pudo crear la cuenta. Inténtalo nuevamente.'));
        if (submit) { submit.disabled = false; submit.textContent = 'Crear cuenta gratis'; }
        return;
      }

      const success = document.getElementById('signupSuccess');
      const title = document.getElementById('authTitle');
      const subtitle = document.querySelector('.auth-card__subtitle');
      const loginLink = document.getElementById('signupLoginLink');
      if (title) title.textContent = '¡Bienvenido a StudyFlow!';
      if (subtitle) subtitle.textContent = 'Tu cuenta está lista para comenzar.';
      form.hidden = true;
      if (success) success.hidden = false;
      const footer = document.getElementById('signupFooter');
      if (footer) footer.hidden = true;
      if (loginLink) loginLink.href = `iniciar-sesion.html?email=${encodeURIComponent(email)}`;
      if (loginLink) loginLink.focus();
    });
  }

  /* ---------- Recuperar contraseña ----------
     Restablecer una contraseña solo con el correo no es seguro. Hace falta enviar un
     enlace de un solo uso por correo (aún no hay servicio de correo configurado), así que
     por ahora la página lo dice con claridad en lugar de simular el proceso. */
  function setupRecover() {
    document.getElementById('recoverIcon').innerHTML = icon('mail');
    document.getElementById('authTitle').textContent = 'Recuperar contraseña';
    document.getElementById('recoverSubtitle').textContent =
      'La recuperación por correo todavía no está disponible. Si ya tienes sesión iniciada, puedes cambiar tu contraseña en Mi perfil.';
    document.getElementById('recoverForm').hidden = true;
    document.getElementById('resetForm').hidden = true;
  }

  /* ---------- Mockup decorativo (lado izquierdo) ---------- */
  function renderVisual() {
    const visual = document.getElementById('authVisual');
    if (!visual) return;

    visual.innerHTML = `
      <span class="float-icon float-icon--a">${icon('check')}</span>
      <span class="float-icon float-icon--b">${icon('clock')}</span>
      <span class="float-icon float-icon--c">${icon('coffee')}</span>
      ${window.SFMockup ? window.SFMockup.html() : ''}`;
  }
})();