/* ==========================================================================
   Portal Arcade HodoMunla · Fase 4: Lógica de Interacción e Inmersión
   Vanilla JavaScript (ES6+) · Sin dependencias
   --------------------------------------------------------------------------
   Responsabilidades de este módulo:
     1. Abrir el modal e inyectar el iframe del juego seleccionado.
     2. Cerrar el modal y DESTRUIR el iframe (liberación de RAM/CPU/audio).
     3. Mantener accesibilidad básica (focus, Escape, scroll lock).
   Restricciones del contexto:
     - Event Delegation para los clics en ".play-btn" (soporta N tarjetas).
     - Lógica agnóstica al contenido del juego (no escuchamos nada del iframe).
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Selección de elementos
     ------------------------------------------------------------------------ */
  const grid          = document.getElementById('game-grid');
  const modal         = document.getElementById('game-modal');
  const closeBtn      = document.getElementById('modal-close');
  const iframeBox     = document.getElementById('game-iframe-container');
  const modalTitle    = document.getElementById('modal-title');
  const body          = document.body;

  // Salvaguarda: si el DOM no está completo, no rompemos el portal.
  if (!grid || !modal || !closeBtn || !iframeBox || !modalTitle) {
    console.warn('[HodoMunla] Faltan nodos clave en el DOM. Módulo abortado.');
    return;
  }

  // Guardamos el último elemento enfocado para restaurar el foco al cerrar.
  let lastFocusedElement = null;

  /* ------------------------------------------------------------------------
     2. Helpers privados
     ------------------------------------------------------------------------ */

  /**
   * Extrae el título legible del juego desde la tarjeta contenedora.
   * Prioridad: <h2 class="game-card__title"> > aria-label del botón > fallback.
   * @param {HTMLElement} btn  Botón ".play-btn" presionado.
   * @returns {string}
   */
  const getGameTitle = (btn) => {
    const card  = btn.closest('.game-card');
    const title = card?.querySelector('.game-card__title')?.textContent?.trim();
    if (title) return title;

    const aria = btn.getAttribute('aria-label')?.trim();
    if (aria) return aria;

    return 'Minijuego';
  };

  /**
   * Construye un <iframe> listo para inyectar.
   * Se crea con `document.createElement` (nunca con innerHTML) para evitar
   * cualquier riesgo de inyección al leer `data-url`.
   * @param {string} url
   * @param {string} title
   * @returns {HTMLIFrameElement}
   */
  const buildIframe = (url, title) => {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = '0';                    // legacy, pero inocuo
    iframe.setAttribute('allow', 'fullscreen; autoplay; gamepad');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('title', `Juego: ${title}`);
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    // `loading="eager"` para que cargue de inmediato al abrir.
    iframe.loading = 'eager';
    return iframe;
  };

  /**
   * Abre el modal con el juego indicado.
   * @param {string} url
   * @param {string} title
   * @param {HTMLElement} trigger  Elemento que originó la apertura (para foco).
   */
  const openGame = (url, title, trigger) => {
    if (!url) {
      console.warn('[HodoMunla] Botón sin "data-url"; apertura ignorada.');
      return;
    }

    lastFocusedElement = trigger || document.activeElement;

    // 1) Limpieza defensiva antes de inyectar (evita iframes huérfanos).
    iframeBox.replaceChildren();

    // 2) Actualizamos el título del modal.
    modalTitle.textContent = title;

    // 3) Inyectamos el iframe del juego.
    iframeBox.appendChild(buildIframe(url, title));

    // 4) Mostramos el modal (quitando [hidden] y sincronizando aria).
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');

    // 5) Bloqueamos el scroll del fondo.
    body.classList.add('modal-open');

    // 6) Foco accesible al botón de cierre.
    closeBtn.focus({ preventScroll: true });
  };

  /**
   * Cierra el modal y DESTRUYE el iframe para liberar RAM, CPU y audio.
   * Es el punto crítico de rendimiento del portal.
   */
  const closeGame = () => {
    if (modal.hidden) return; // ya estaba cerrado

    // 1) Ocultamos el modal primero (evita repintados del iframe al destruirse).
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');

    // 2) Destruimos el iframe por completo.
    //    `replaceChildren()` elimina el nodo del árbol; al perder su `src`
    //    el navegador mata el documento hijo, sus timers, sus AudioContext
    //    y el bucle de requestAnimationFrame. El GC recupera la memoria.
    iframeBox.replaceChildren();

    // 3) Restauramos el scroll del documento.
    body.classList.remove('modal-open');

    // 4) Devolvemos el foco al elemento que abrió el modal (a11y).
    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus({ preventScroll: true });
    }
    lastFocusedElement = null;
  };

  /* ------------------------------------------------------------------------
     3. Event Delegation — un único listener para N tarjetas
     ------------------------------------------------------------------------
     Se engancha UN solo listener en el contenedor #game-grid. Cuando la
     grilla crezca a 100 juegos, seguimos teniendo 1 listener en vez de 100.
     ------------------------------------------------------------------------ */
  grid.addEventListener('click', (event) => {
    const btn = event.target.closest('.play-btn');
    if (!btn || !grid.contains(btn)) return;

    // Prevenimos cualquier comportamiento por defecto (ej. submit).
    event.preventDefault();

    const url   = btn.dataset.url;
    const title = getGameTitle(btn);

    openGame(url, title, btn);
  });

  /* ------------------------------------------------------------------------
     4. Listeners de cierre
     ------------------------------------------------------------------------ */

  // 4.1 Botón "X"
  closeBtn.addEventListener('click', closeGame);

  // 4.2 Tecla Escape (accesibilidad de teclado / escritorio)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      event.preventDefault();
      closeGame();
    }
  });

  // 4.3 Clic en el fondo del modal (fuera del contenido) → cierre.
  //     Se usa `event.target === modal` para no capturar clics en .modal__content.
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeGame();
  });

  /* ------------------------------------------------------------------------
     5. Red de seguridad: si el usuario navega fuera con el modal abierto,
        el navegador descargará el iframe igualmente, pero esto ayuda en
        navegaciones BFCache y evita estados zombis al volver "atrás".
     ------------------------------------------------------------------------ */
  window.addEventListener('pagehide', () => {
    iframeBox.replaceChildren();
  });

})();