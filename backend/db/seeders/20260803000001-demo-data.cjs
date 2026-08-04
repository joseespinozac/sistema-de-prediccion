'use strict';

/**
 * Datos de demostración para desarrollar sin credenciales reales de Google.
 * Crea: un usuario demo, una cuenta demo, URLs/consultas trackeadas y ~180 días
 * de traffic_snapshots sintéticos (tendencia + estacionalidad semanal + ruido),
 * suficientes para superar el umbral de 90 días de histórico.
 *
 * Login demo:  email = demo@e3.com   password = demo1234
 */
const bcrypt = require('bcryptjs');

// Genera una serie diaria con tendencia suave, estacionalidad semanal y ruido.
// Determinista (sin Math.random puro): usa un PRNG con semilla para reproducibilidad.
function makePrng(seed) {
  let s = seed >>> 0;
  return function next() {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

function buildSeries(days, base, trendPerDay, weeklyAmp, noiseAmp, seed) {
  const rng = makePrng(seed);
  const out = [];
  const today = new Date('2026-08-03T00:00:00Z');
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const dow = d.getUTCDay(); // 0=domingo
    // Fin de semana con menos tráfico.
    const weekly = weeklyAmp * Math.sin((dow / 7) * 2 * Math.PI);
    const weekendPenalty = dow === 0 || dow === 6 ? -weeklyAmp * 0.8 : 0;
    const trend = trendPerDay * (days - i);
    const noise = (rng() - 0.5) * 2 * noiseAmp;
    const value = Math.max(0, Math.round(base + trend + weekly + weekendPenalty + noise));
    out.push({ fecha: d.toISOString().slice(0, 10), valor: value });
  }
  return out;
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // --- Usuario demo ---
    const passwordHash = await bcrypt.hash('demo1234', 12);
    await queryInterface.bulkInsert('users', [
      {
        email: 'demo@e3.com',
        password_hash: passwordHash,
        rol: 'member',
        created_at: now,
        updated_at: now,
      },
    ]);
    const [[user]] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = 'demo@e3.com' LIMIT 1;"
    );

    // --- Cuenta demo ---
    await queryInterface.bulkInsert('accounts', [
      {
        nombre: 'Demo E3 (datos sintéticos)',
        ga4_property_id: 'properties/000000000',
        gsc_site_url: 'https://demo-e3.example/',
        activo: true,
        created_at: now,
        updated_at: now,
      },
    ]);
    const [[account]] = await queryInterface.sequelize.query(
      "SELECT id FROM accounts WHERE nombre LIKE 'Demo E3%' LIMIT 1;"
    );

    // --- URLs y consultas trackeadas ---
    const urls = [
      '/',
      '/servicios/seo',
      '/blog/guia-predictor-trafico',
      '/contacto',
    ];
    const queries = [
      'consultoria seo',
      'predictor de trafico',
      'auditoria tecnica web',
    ];

    await queryInterface.bulkInsert(
      'tracked_urls',
      urls.map((url) => ({
        account_id: account.id,
        url,
        activo: true,
        created_at: now,
        updated_at: now,
      }))
    );
    await queryInterface.bulkInsert(
      'tracked_queries',
      queries.map((query) => ({
        account_id: account.id,
        query,
        activo: true,
        created_at: now,
        updated_at: now,
      }))
    );

    const [urlRows] = await queryInterface.sequelize.query(
      `SELECT id, url FROM tracked_urls WHERE account_id = ${account.id};`
    );
    const [queryRows] = await queryInterface.sequelize.query(
      `SELECT id, query FROM tracked_queries WHERE account_id = ${account.id};`
    );

    // --- traffic_snapshots sintéticos (~180 días) ---
    const DAYS = 180;
    const snapshots = [];

    // GA4: sesiones por URL + canal "organic".
    urlRows.forEach((u, idx) => {
      const serie = buildSeries(
        DAYS,
        120 + idx * 40, // base distinta por URL
        0.15, // leve tendencia al alza
        18, // estacionalidad semanal
        14, // ruido
        1000 + idx
      );
      for (const point of serie) {
        snapshots.push({
          account_id: account.id,
          url_id: u.id,
          query_id: null,
          fecha: point.fecha,
          canal_origen: 'organic',
          clics: null,
          impresiones: null,
          sesiones: point.valor,
          fuente: 'ga4',
          created_at: now,
          updated_at: now,
        });
      }
    });

    // GSC: clics + impresiones por consulta.
    queryRows.forEach((q, idx) => {
      const clicks = buildSeries(DAYS, 40 + idx * 15, 0.08, 8, 6, 2000 + idx);
      for (let i = 0; i < clicks.length; i++) {
        const c = clicks[i].valor;
        snapshots.push({
          account_id: account.id,
          url_id: null,
          query_id: q.id,
          fecha: clicks[i].fecha,
          canal_origen: 'organic',
          clics: c,
          impresiones: c * (12 + idx), // CTR sintético ~ 1/(12+idx)
          sesiones: null,
          fuente: 'gsc',
          created_at: now,
          updated_at: now,
        });
      }
    });

    // Inserción por lotes para no exceder límites de SQLite.
    const BATCH = 500;
    for (let i = 0; i < snapshots.length; i += BATCH) {
      await queryInterface.bulkInsert('traffic_snapshots', snapshots.slice(i, i + BATCH));
    }

    // --- Un evento externo de ejemplo (update de Google) ---
    await queryInterface.bulkInsert('external_events', [
      {
        fecha: '2026-06-15',
        tipo: 'update_google',
        descripcion: 'Core Update de junio (registro de ejemplo)',
        account_id: null,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    const [[account]] = await queryInterface.sequelize.query(
      "SELECT id FROM accounts WHERE nombre LIKE 'Demo E3%' LIMIT 1;"
    );
    if (account) {
      await queryInterface.bulkDelete('traffic_snapshots', { account_id: account.id });
      await queryInterface.bulkDelete('tracked_urls', { account_id: account.id });
      await queryInterface.bulkDelete('tracked_queries', { account_id: account.id });
      await queryInterface.bulkDelete('accounts', { id: account.id });
    }
    await queryInterface.bulkDelete('external_events', { descripcion: 'Core Update de junio (registro de ejemplo)' });
    await queryInterface.bulkDelete('users', { email: 'demo@e3.com' });
  },
};
