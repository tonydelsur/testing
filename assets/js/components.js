/**
 * components.js — HodoMunla / yoquiero.uno
 * Inyección asíncrona de fragmentos HTML estáticos (header / footer).
 *
 * Requisitos:
 *  - Servir el sitio por HTTP(S). Con file:// el fetch queda bloqueado por CORS.
 *
 * Garantías:
 *  - Sin dependencias (jQuery, frameworks o bundlers prohibidos).
 *  - Fallo silencioso para el usuario: solo console.error.
 *  - Aislamiento por componente: el error de uno no tumba al otro.
 *  - Sin scripts de Bootstrap ni componentes dinámicos.
 */

(() => {
  'use strict';

  /** Definición declarativa de los fragmentos a montar. */
  const COMPONENTS = [
    { containerId: 'header-placeholder', url: 'header.html', label: 'header' },
    { containerId: 'footer-placeholder', url: 'footer.html', label: 'footer' },
  ];

  /**
   * Descarga un fragmento HTML.
   * @param {string} url
   * @returns {Promise<string>}
   */
  async function fetchFragment(url) {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      cache: 'no-cache',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    if (!html.trim()) {
      throw new Error('Respuesta vacía');
    }

    return html;
  }

  /**
   * Monta un fragmento en su contenedor.
   * Los errores se capturan localmente para no propagarse.
   * @param {{containerId: string, url: string, label: string}} component
   */
  async function mountComponent({ containerId, url, label }) {
    const target = document.getElementById(containerId);

    if (!target) {
      // El contenedor no existe en esta página: no es un error, se ignora.
      return;
    }

    try {
      target.innerHTML = await fetchFragment(url);
    } catch (error) {
      // Silencioso para el usuario. Solo diagnóstico en consola.
      if (typeof console !== 'undefined' && typeof console.error === 'function') {
        console.error(`[components.js] Fallo al cargar "${label}" desde "${url}":`, error);
      }
    }
  }

  /**
   * Tarea posterior al montaje: mantiene el año del footer actualizado.
   * Si el footer no cargó, simplemente no encuentra el nodo y no hace nada.
   */
  function hydrateDynamicContent() {
    const yearEl = document.getElementById('hm-year');
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }
  }

  /**
   * Punto de entrada. Carga en paralelo y espera a todos los fragmentos.
   */
  async function init() {
    // Promise.all no se rompe porque cada mountComponent captura sus propios errores.
    await Promise.all(COMPONENTS.map(mountComponent));
    hydrateDynamicContent();
  }

  // Arranque seguro sin importar el momento en que se ejecute el script.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();