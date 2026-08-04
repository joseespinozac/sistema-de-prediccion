// Wrapper de fetch para toda la app (§11).
// - Envía cookies de sesión (credentials: 'same-origin').
// - Normaliza el manejo de errores en un objeto { message } consistente.
// - Redirige a login si la API responde 401.
window.API = (function apiModule() {
  async function request(method, url, body) {
    const opts = {
      method,
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url, opts);
    } catch (networkErr) {
      throw new Error('No se pudo conectar con el servidor. ¿Está corriendo?');
    }

    // Sesión expirada / no autenticado: mandar a login (salvo que ya estemos ahí).
    if (res.status === 401 && !location.pathname.endsWith('/login.html')) {
      location.href = '/login.html';
      throw new Error('Sesión expirada.');
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!res.ok) {
      const msg = (data && data.message) || `Error ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  return {
    get: (url) => request('GET', url),
    post: (url, body) => request('POST', url, body),
    patch: (url, body) => request('PATCH', url, body),
    del: (url) => request('DELETE', url),
  };
})();
