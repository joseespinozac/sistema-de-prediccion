// Ingesta de histórico GA4/GSC → traffic_snapshots (§4/§10).
// Cachea por rango: si un día ya fue importado para esa cuenta+fuente, no se
// vuelve a llamar a la API para ese día (evita reimportar un rango ya traído).
import { Op } from 'sequelize';
import {
  Account,
  GoogleConnection,
  TrackedUrl,
  TrackedQuery,
  TrafficSnapshot,
} from '../db/index.js';
import {
  getAuthenticatedClient,
  fetchGa4Traffic,
  fetchGscTraffic,
} from './googleData.js';

// Devuelve las fechas (YYYY-MM-DD) ya presentes para una cuenta+fuente en el rango.
async function existingDates(accountId, fuente, startDate, endDate) {
  const rows = await TrafficSnapshot.findAll({
    attributes: ['fecha'],
    where: {
      account_id: accountId,
      fuente,
      fecha: { [Op.between]: [startDate, endDate] },
    },
    group: ['fecha'],
    raw: true,
  });
  return new Set(rows.map((r) => String(r.fecha)));
}

// Busca (o crea) la TrackedUrl de una URL dada dentro de una cuenta.
async function resolveUrlId(accountId, url, cache) {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url);
  const [row] = await TrackedUrl.findOrCreate({
    where: { account_id: accountId, url },
    defaults: { account_id: accountId, url, activo: true },
  });
  cache.set(url, row.id);
  return row.id;
}

async function resolveQueryId(accountId, query, cache) {
  if (!query) return null;
  if (cache.has(query)) return cache.get(query);
  const [row] = await TrackedQuery.findOrCreate({
    where: { account_id: accountId, query },
    defaults: { account_id: accountId, query, activo: true },
  });
  cache.set(query, row.id);
  return row.id;
}

/**
 * Ingesta el histórico de una cuenta para el rango dado.
 * @param {number} accountId
 * @param {{startDate: string, endDate: string, force?: boolean}} opts
 * @returns {Promise<{ga4: number, gsc: number, skipped: string[]}>}
 */
export async function ingestHistory(accountId, { startDate, endDate, force = false }) {
  const account = await Account.findByPk(accountId);
  if (!account) throw new Error('Cuenta no encontrada.');

  const connection = await GoogleConnection.findOne({
    where: { account_id: accountId },
    order: [['connected_at', 'DESC']],
  });
  if (!connection) {
    throw new Error('La cuenta no tiene una conexión de Google asociada.');
  }

  const authClient = await getAuthenticatedClient(connection);
  const urlCache = new Map();
  const queryCache = new Map();
  const result = { ga4: 0, gsc: 0, skipped: [] };

  // ---- GA4 (sesiones por página + canal) ----
  if (account.ga4_property_id) {
    const already = force
      ? new Set()
      : await existingDates(accountId, 'ga4', startDate, endDate);
    const rows = await fetchGa4Traffic(
      authClient,
      account.ga4_property_id,
      startDate,
      endDate
    );
    const toInsert = [];
    for (const r of rows) {
      if (already.has(r.fecha)) continue;
      const url_id = await resolveUrlId(accountId, r.url, urlCache);
      toInsert.push({
        account_id: accountId,
        url_id,
        query_id: null,
        fecha: r.fecha,
        canal_origen: r.canal_origen,
        sesiones: r.sesiones,
        clics: null,
        impresiones: null,
        fuente: 'ga4',
      });
    }
    if (toInsert.length) await TrafficSnapshot.bulkCreate(toInsert);
    result.ga4 = toInsert.length;
  } else {
    result.skipped.push('GA4 (sin ga4_property_id en la cuenta)');
  }

  // ---- GSC (clics + impresiones por query + página) ----
  if (account.gsc_site_url) {
    const already = force
      ? new Set()
      : await existingDates(accountId, 'gsc', startDate, endDate);
    const rows = await fetchGscTraffic(
      authClient,
      account.gsc_site_url,
      startDate,
      endDate
    );
    const toInsert = [];
    for (const r of rows) {
      if (already.has(r.fecha)) continue;
      const url_id = await resolveUrlId(accountId, r.url, urlCache);
      const query_id = await resolveQueryId(accountId, r.query, queryCache);
      toInsert.push({
        account_id: accountId,
        url_id,
        query_id,
        fecha: r.fecha,
        canal_origen: 'organic',
        clics: r.clics,
        impresiones: r.impresiones,
        sesiones: null,
        fuente: 'gsc',
      });
    }
    if (toInsert.length) await TrafficSnapshot.bulkCreate(toInsert);
    result.gsc = toInsert.length;
  } else {
    result.skipped.push('GSC (sin gsc_site_url en la cuenta)');
  }

  return result;
}
