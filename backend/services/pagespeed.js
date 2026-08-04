// Salud técnica: PageSpeed Insights API + chequeo de status code (§6.3, §12 4.7).
// PageSpeed es gratuita y NO requiere OAuth (una API key es opcional pero
// recomendada para la cuota). El resultado se guarda en technical_health_checks.
import { Account, TrackedUrl, TechnicalHealthCheck } from '../db/index.js';
import { env } from '../config/env.js';

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// Resuelve la URL absoluta de una TrackedUrl usando el sitio de la cuenta.
function absoluteUrl(account, trackedUrl) {
  const u = trackedUrl.url;
  if (/^https?:\/\//i.test(u)) return u;
  const base = (account.gsc_site_url || '').replace(/^sc-domain:/, 'https://');
  if (!base) return null;
  try {
    return new URL(u, base).toString();
  } catch {
    return null;
  }
}

// Chequeo simple de status code (sin descargar el body completo).
async function checkStatus(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'manual' });
    return res.status;
  } catch {
    return null;
  }
}

// Llama a PageSpeed Insights y devuelve el score de performance (0-100) + detalle.
async function runPageSpeed(url) {
  const params = new URLSearchParams({ url, category: 'performance', strategy: 'mobile' });
  if (env.pagespeedApiKey) params.set('key', env.pagespeedApiKey);

  const res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`PageSpeed API HTTP ${res.status}`);
  }
  const data = await res.json();
  const perf = data?.lighthouseResult?.categories?.performance?.score;
  const audits = data?.lighthouseResult?.audits || {};
  const detalle = {
    lcp: audits['largest-contentful-paint']?.displayValue,
    cls: audits['cumulative-layout-shift']?.displayValue,
    tbt: audits['total-blocking-time']?.displayValue,
  };
  return {
    score: typeof perf === 'number' ? Math.round(perf * 100) : null,
    detalle,
  };
}

/**
 * Corre el chequeo de salud técnica para una URL trackeada y lo persiste.
 * @returns {Promise<object>} la fila technical_health_checks creada
 */
export async function checkUrlHealth(account, trackedUrl) {
  const url = absoluteUrl(account, trackedUrl);
  let status_code = null;
  let score = null;
  let detalle = null;

  if (url) {
    status_code = await checkStatus(url);
    try {
      const psi = await runPageSpeed(url);
      score = psi.score;
      detalle = psi.detalle;
    } catch {
      // PageSpeed puede fallar (cuota, URL no pública): guardamos solo el status.
    }
  }

  return TechnicalHealthCheck.create({
    account_id: account.id,
    url_id: trackedUrl.id,
    fecha: new Date(),
    status_code,
    core_web_vitals_score: score,
    detalle,
  });
}

/**
 * Corre el chequeo para todas las URLs activas de una cuenta.
 */
export async function checkAccountHealth(accountId) {
  const account = await Account.findByPk(accountId);
  if (!account) throw new Error('Cuenta no encontrada.');
  const urls = await TrackedUrl.findAll({
    where: { account_id: accountId, activo: true },
  });
  const results = [];
  for (const u of urls) {
    // Secuencial para no golpear la cuota de PageSpeed en paralelo.
    results.push(await checkUrlHealth(account, u));
  }
  return results;
}
