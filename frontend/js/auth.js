/* =========================================================
   StudyFlow — Autenticación (simulada, sin backend)
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

      const account = await SF.authenticate(email, password);
      if (!account) {
        const existing = SF.account(email);
        UI.formError(form, existing && !existing.passHash
          ? 'Esta cuenta todavía no tiene una contraseña. Usa «¿Olvidaste tu contraseña?» para crear una.'
          : 'Correo o contraseña incorrectos.');
        return;
      }

      SF.login(email);
      window.location.href = DASHBOARD;
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
        UI.setFieldError(form.email, error && error.message === 'exists'
          ? 'Este correo ya tiene una cuenta. Inicia sesión.'
          : 'No se pudo crear la cuenta. Inténtalo nuevamente.');
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

  /* ---------- Recuperar contraseña ---------- */
  function setupRecover() {
    const recover = document.getElementById('recoverForm');
    const reset = document.getElementById('resetForm');
    const done = document.getElementById('resetDone');
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('recoverSubtitle');
    const badge = document.getElementById('recoverIcon');
    let targetEmail = '';

    const setHeader = (ico, text, sub) => {
      badge.innerHTML = icon(ico);
      title.textContent = text;
      subtitle.textContent = sub;
    };
    setHeader('mail', '¿Olvidaste tu contraseña?', 'Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.');

    recover.addEventListener('submit', (event) => {
      event.preventDefault();
      UI.clearErrors(recover);
      const email = recover.email.value.trim();

      if (!UI.validEmail(email)) { UI.setFieldError(recover.email, 'Escribe un correo electrónico válido.'); return; }
      if (!SF.account(email)) { UI.setFieldError(recover.email, 'No encontramos una cuenta con ese correo.'); return; }

      targetEmail = email;
      setHeader('lock', 'Crea una nueva contraseña', `Cuenta: ${email}`);
      recover.hidden = true;
      reset.hidden = false;
      reset.password.focus();
    });

    reset.addEventListener('submit', async (event) => {
      event.preventDefault();
      UI.clearErrors(reset);
      let valid = true;

      if (reset.password.value.length < 8) { UI.setFieldError(reset.password, 'La contraseña debe tener al menos 8 caracteres.'); valid = false; }
      if (reset.confirm.value !== reset.password.value) { UI.setFieldError(reset.confirm, 'Las contraseñas no coinciden.'); valid = false; }
      if (!valid) return;

      await SF.setPassword(targetEmail, reset.password.value);
      setHeader('check', '¡Contraseña actualizada!', 'Ya puedes iniciar sesión con tu nueva contraseña.');
      document.getElementById('recoverFooter').hidden = true;
      reset.hidden = true;
      done.hidden = false;
      done.querySelector('a').focus();
    });
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
