// Flujo OAuth2 con Google para GA4 + Search Console (§6.1).
// Este módulo NO toca la BD: solo habla con Google y con el módulo de crypto.
// El guardado/lectura de tokens encriptados lo orquestan las rutas/servicios.
import { google } from 'googleapis';
import { env } from '../config/env.js';

// Scopes de solo lectura (§6.1). openid/email para identificar la cuenta conectada.
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'openid',
  'email',
];

// Crea un cliente OAuth2 nuevo. Si se pasan tokens, quedan cargados en él.
export function createOAuthClient(tokens = null) {
  const client = new google.auth.OAuth2(
    env.google.clientId,
    env.google.clientSecret,
    env.google.redirectUri
  );
  if (tokens) client.setCredentials(tokens);
  return client;
}

// Indica si las credenciales OAuth están configuradas (para avisar en la UI).
export function isOAuthConfigured() {
  return Boolean(env.google.clientId && env.google.clientSecret);
}

// URL de la pantalla de consentimiento de Google.
// `state` viaja de ida y vuelta para mitigar CSRF en el callback.
export function buildConsentUrl(state) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline', // pide refresh_token
    prompt: 'consent', // fuerza la reemisión del refresh_token
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

// Intercambia el `code` del callback por { access_token, refresh_token, expiry_date, ... }.
export async function exchangeCodeForTokens(code) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

// Obtiene el email de la cuenta de Google conectada (informativo, no secreto).
export async function fetchGoogleEmail(tokens) {
  const client = createOAuthClient(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();
  return data.email || null;
}

// Renueva el access_token usando el refresh_token. Devuelve las nuevas
// credenciales para que el llamador las re-encripte y guarde (§6.2).
export async function refreshAccessToken(refreshToken) {
  const client = createOAuthClient({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

// Revoca el token en Google (parte obligatoria del "Desconectar cuenta", §6.2).
export async function revokeToken(token) {
  const client = createOAuthClient();
  await client.revokeToken(token);
}
