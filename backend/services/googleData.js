// Acceso a datos de Google (GA4 Admin/Data + Search Console) usando una
// conexión OAuth guardada. Centraliza la renovación de access_token (tarea 1.10)
// y la desencriptación en memoria justo antes de llamar a Google (§6.2).
import { google } from 'googleapis';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { createOAuthClient, refreshAccessToken } from './googleOAuth.js';
import { encrypt, decrypt, encryptNullable } from './crypto.js';

// Margen de seguridad: renovar si el token vence en <2 minutos.
const EXPIRY_MARGIN_MS = 2 * 60 * 1000;

/**
 * Devuelve un cliente OAuth2 autenticado y con token vigente a partir de una
 * fila `GoogleConnection`. Si el access_token está por vencer, lo renueva con
 * el refresh_token, re-encripta y persiste el nuevo token (§6.2).
 *
 * @param {import('../db/index.js').GoogleConnection} connection instancia Sequelize
 * @returns {Promise<import('googleapis').Auth.OAuth2Client>}
 */
export async function getAuthenticatedClient(connection) {
  const accessToken = decrypt(connection.access_token_encrypted);
  const refreshToken = connection.refresh_token_encrypted
    ? decrypt(connection.refresh_token_encrypted)
    : null;

  const expiresAt = connection.expires_at
    ? new Date(connection.expires_at).getTime()
    : 0;
  const needsRefresh =
    !expiresAt || expiresAt - Date.now() < EXPIRY_MARGIN_MS;

  if (needsRefresh && refreshToken) {
    const creds = await refreshAccessToken(refreshToken);
    // Persistir el nuevo access_token encriptado (el refresh_token no cambia).
    connection.access_token_encrypted = encrypt(creds.access_token);
    if (creds.refresh_token) {
      connection.refresh_token_encrypted = encryptNullable(creds.refresh_token);
    }
    connection.expires_at = creds.expiry_date
      ? new Date(creds.expiry_date)
      : null;
    await connection.save();

    return createOAuthClient({
      access_token: creds.access_token,
      refresh_token: refreshToken,
      expiry_date: creds.expiry_date,
    });
  }

  return createOAuthClient({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiresAt || undefined,
  });
}

/**
 * Lista las propiedades GA4 accesibles con la cuenta conectada (GA4 Admin API).
 * @returns {Promise<Array<{property_id: string, display_name: string}>>}
 */
export async function listGa4Properties(authClient) {
  const admin = google.analyticsadmin({ version: 'v1beta', auth: authClient });
  // accountSummaries agrupa cuentas → propiedades en una sola llamada.
  const { data } = await admin.accountSummaries.list({ pageSize: 200 });
  const properties = [];
  for (const account of data.accountSummaries ?? []) {
    for (const prop of account.propertySummaries ?? []) {
      properties.push({
        property_id: prop.property, // "properties/123456789"
        display_name: prop.displayName,
        account_name: account.displayName,
      });
    }
  }
  return properties;
}

/**
 * Lista los sitios de Search Console accesibles (Webmasters sites.list).
 * @returns {Promise<Array<{site_url: string, permission_level: string}>>}
 */
export async function listGscSites(authClient) {
  const webmasters = google.webmasters({ version: 'v3', auth: authClient });
  const { data } = await webmasters.sites.list();
  return (data.siteEntry ?? []).map((s) => ({
    site_url: s.siteUrl,
    permission_level: s.permissionLevel,
  }));
}

/**
 * Trae tráfico diario de GA4 (sesiones por página y canal).
 * @returns {Promise<Array<{fecha, canal_origen, sesiones, url}>>}
 */
export async function fetchGa4Traffic(authClient, propertyId, startDate, endDate) {
  // El cliente dedicado toma el token del OAuth client via authClient.credentials.
  const dataClient = new BetaAnalyticsDataClient({ authClient });
  const property = propertyId.startsWith('properties/')
    ? propertyId
    : `properties/${propertyId}`;

  const [response] = await dataClient.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: 'date' },
      { name: 'pagePath' },
      { name: 'sessionDefaultChannelGroup' },
    ],
    metrics: [{ name: 'sessions' }],
    limit: 100000,
  });

  return (response.rows ?? []).map((row) => {
    const [date, pagePath, channel] = row.dimensionValues.map((d) => d.value);
    return {
      fecha: formatGa4Date(date), // "20260101" → "2026-01-01"
      url: pagePath,
      canal_origen: channel,
      sesiones: Number.parseInt(row.metricValues[0].value, 10) || 0,
    };
  });
}

/**
 * Trae tráfico diario de Search Console (clics + impresiones por query/page).
 * @returns {Promise<Array<{fecha, query, url, clics, impresiones}>>}
 */
export async function fetchGscTraffic(authClient, siteUrl, startDate, endDate) {
  const webmasters = google.webmasters({ version: 'v3', auth: authClient });
  const { data } = await webmasters.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['date', 'query', 'page'],
      rowLimit: 25000,
    },
  });

  return (data.rows ?? []).map((row) => {
    const [date, query, page] = row.keys;
    return {
      fecha: date, // GSC ya devuelve "YYYY-MM-DD"
      query,
      url: page,
      clics: Math.round(row.clicks || 0),
      impresiones: Math.round(row.impressions || 0),
    };
  });
}

// GA4 devuelve la dimensión date como "YYYYMMDD".
function formatGa4Date(yyyymmdd) {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}
