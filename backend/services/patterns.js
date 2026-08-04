// Detector de patrones semanal (reglas, v1 — ver ROADMAP.md "Detector de
// patrones"). Agrega el tráfico diario en semanas de calendario, compara cada
// semana contra una línea base móvil de semanas anteriores, detecta episodios
// (caída/pico, recuperación, tendencia sostenida) y los narra por plantillas.
// No usa LLM — la v2 con narración asistida por LLM queda documentada (no
// implementada) en ROADMAP.md, a propósito: la detección debe seguir siendo
// determinística y auditable.
import { Op } from 'sequelize';
import { ExternalEvent } from '../db/index.js';
import { buildSeries, sourceForMetric } from './predictionClient.js';
import { env } from '../config/env.js';

const METRIC_LABEL = {
  clics: 'los clics',
  impresiones: 'las impresiones',
  sesiones: 'las sesiones',
};
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const ORDINALS = ['primera', 'segunda', 'tercera', 'cuarta', 'última'];

const { dropThreshold: DROP_THRESHOLD, recoveryBand: RECOVERY_BAND,
  baselineWeeks: BASELINE_WEEKS, sustainedWeeks: SUSTAINED_WEEKS } = env.patterns;

// Semanas con menos días de datos que esto no se consideran representativas.
const MIN_DAYS_PER_WEEK = 4;

function parseISODate(s) {
  return new Date(s + 'T00:00:00Z');
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// Lunes (UTC) de la semana que contiene `date`.
function mondayOf(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=domingo..6=sábado
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

// Agrupa la serie diaria en semanas de calendario (lunes-domingo).
function groupIntoWeeks(series) {
  const buckets = new Map();
  for (const point of series) {
    const day = parseISODate(point.fecha);
    const weekStart = toISODate(mondayOf(day));
    if (!buckets.has(weekStart)) buckets.set(weekStart, []);
    buckets.get(weekStart).push(point.valor);
  }
  const weeks = [];
  for (const [weekStart, valores] of buckets) {
    weeks.push({
      weekStart,
      weekEnd: toISODate(addDays(parseISODate(weekStart), 6)),
      avg: valores.reduce((a, b) => a + b, 0) / valores.length,
      days: valores.length,
    });
  }
  weeks.sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
  return weeks;
}

function weekOfMonthOrdinal(weekStartISO) {
  const dayOfMonth = parseISODate(weekStartISO).getUTCDate();
  const idx = Math.min(4, Math.ceil(dayOfMonth / 7) - 1);
  return ORDINALS[idx];
}

function monthNameEs(weekStartISO) {
  return MONTHS_ES[parseISODate(weekStartISO).getUTCMonth()];
}

function shortDate(iso) {
  const d = parseISODate(iso);
  return `${d.getUTCDate()} de ${MONTHS_ES[d.getUTCMonth()]}`;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function round(n) {
  return Math.round(n);
}

function pct(n) {
  return Math.round(Math.abs(n) * 100);
}

// Etiqueta de una sola semana, ej. "la primera semana de mayo".
function singleWeekLabel(week) {
  return `la ${weekOfMonthOrdinal(week.weekStart)} semana de ${monthNameEs(week.weekStart)}`;
}

// Etiqueta de un episodio corto (1-2 semanas), para el inicio de la frase.
function episodeLabel(episode) {
  if (episode.weeks.length === 1) return singleWeekLabel(episode.weeks[0]);
  const first = episode.weeks[0];
  const last = episode.weeks[episode.weeks.length - 1];
  return `del ${shortDate(first.weekStart)} al ${shortDate(last.weekEnd)}`;
}

// Punto de partida de un episodio sostenido, para "desde el ...".
function sinceLabel(episode) {
  const first = episode.weeks[0];
  return episode.weeks.length === 1
    ? singleWeekLabel(first)
    : `el ${shortDate(first.weekStart)}`;
}

// Busca un evento externo cercano al rango del episodio (misma cuenta o global).
async function findRelatedEvent(accountId, episode) {
  const from = toISODate(addDays(parseISODate(episode.weeks[0].weekStart), -7));
  const to = episode.weeks[episode.weeks.length - 1].weekEnd;
  return ExternalEvent.findOne({
    where: {
      fecha: { [Op.between]: [from, to] },
      [Op.or]: [{ account_id: accountId }, { account_id: null }],
    },
    order: [['fecha', 'DESC']],
  });
}

// Redacta un episodio ya detectado (con o sin recuperación/sostenido) en una frase.
function narrateEpisode(episode, metricLabel, relatedEvent) {
  const magnitud = pct(episode.avgDelta);
  const direccion = episode.type === 'caida' ? 'por debajo del' : 'por encima del';

  let frase;
  if (episode.sustained) {
    const tendencia = episode.type === 'caida' ? 'una baja sostenida' : 'un alza sostenida';
    frase = `Desde ${sinceLabel(episode)} se observa ${tendencia} en ${metricLabel}, de alrededor de ${magnitud}% ${direccion} promedio habitual.`;
  } else {
    const label = capitalize(episodeLabel(episode));
    const verbo = episode.type === 'caida' ? 'cayeron' : 'tuvieron un pico de';
    frase = `${label}, ${metricLabel} ${verbo} ${magnitud}% respecto al promedio habitual (~${round(episode.weeks[0].avg)} vs. ~${round(episode.baselineAtStart)} por día).`;
  }

  if (episode.recovered) {
    frase += ` Se recuperó en ${episode.recoveryLabel}, volviendo al nivel habitual del sitio.`;
  }
  if (relatedEvent) {
    frase += ` Coincide con un evento registrado: "${relatedEvent.descripcion}" (${relatedEvent.fecha}).`;
  }
  return frase;
}

/**
 * Detecta patrones en el tráfico semanal de una cuenta/URL/consulta y
 * devuelve episodios + un resumen narrado en texto.
 *
 * `start`/`end` (opcionales, "YYYY-MM-DD"): si se pasan, acotan qué episodios
 * se devuelven al rango visible en el dashboard — pero internamente se trae
 * un colchón de semanas anteriores (`baselineWeeks`) para poder calcular la
 * línea base de las primeras semanas del rango.
 */
export async function detectPatterns({
  accountId,
  metric = 'clics',
  urlId = null,
  queryId = null,
  start = null,
  end = null,
}) {
  const safeMetric = ['clics', 'impresiones', 'sesiones'].includes(metric) ? metric : 'clics';
  const source = sourceForMetric(safeMetric);

  const fetchStart = start
    ? toISODate(addDays(parseISODate(start), -BASELINE_WEEKS * 7))
    : undefined;
  const series = await buildSeries({
    accountId,
    metric: safeMetric,
    source,
    urlId,
    queryId,
    start: fetchStart,
    end: end || undefined,
  });

  const allWeeks = groupIntoWeeks(series).filter((w) => w.days >= MIN_DAYS_PER_WEEK);

  // Clasificar cada semana contra su línea base móvil (semanas anteriores).
  const classified = allWeeks.map((week, i) => {
    const baselineWeeks = allWeeks.slice(Math.max(0, i - BASELINE_WEEKS), i);
    if (baselineWeeks.length < 2) {
      return { ...week, baseline: null, delta: null, type: 'sin_base' };
    }
    const baseline = baselineWeeks.reduce((a, w) => a + w.avg, 0) / baselineWeeks.length;
    const delta = (week.avg - baseline) / baseline;
    let type = 'normal';
    if (delta <= -DROP_THRESHOLD) type = 'caida';
    else if (delta >= DROP_THRESHOLD) type = 'pico';
    return { ...week, baseline, delta, type };
  });

  // Fusionar semanas consecutivas del mismo tipo (caída/pico) en episodios.
  const episodes = [];
  let current = null;
  classified.forEach((week, idx) => {
    if (week.type === 'caida' || week.type === 'pico') {
      if (current && current.type === week.type) {
        current.weeks.push(week);
        current.endIdx = idx;
      } else {
        if (current) episodes.push(current);
        current = { type: week.type, weeks: [week], baselineAtStart: week.baseline, endIdx: idx };
      }
    } else if (current) {
      episodes.push(current);
      current = null;
    }
  });
  if (current) episodes.push(current);

  // Magnitud representativa, ¿es tendencia sostenida?, ¿se recuperó después?
  for (const ep of episodes) {
    ep.avgDelta = ep.weeks.reduce((a, w) => a + w.delta, 0) / ep.weeks.length;
    ep.sustained = ep.weeks.length >= SUSTAINED_WEEKS;
    ep.recovered = false;

    for (let j = ep.endIdx + 1; j < classified.length && j <= ep.endIdx + 4; j++) {
      const w = classified[j];
      if (w.baseline == null) continue;
      const deltaVsOriginal = (w.avg - ep.baselineAtStart) / ep.baselineAtStart;
      if (Math.abs(deltaVsOriginal) <= RECOVERY_BAND) {
        ep.recovered = true;
        ep.recoveryLabel = singleWeekLabel(w);
        break;
      }
    }
  }

  // Acotar al rango visible del dashboard (si se pidió), usando lo anterior
  // solo como colchón para la línea base.
  const visibleEpisodes = start && end
    ? episodes.filter(
        (ep) =>
          ep.weeks[ep.weeks.length - 1].weekEnd >= start && ep.weeks[0].weekStart <= end
      )
    : episodes;

  const metricLabel = METRIC_LABEL[safeMetric] || safeMetric;
  const narradas = [];
  for (const ep of visibleEpisodes) {
    const evento = await findRelatedEvent(accountId, ep);
    narradas.push(narrateEpisode(ep, metricLabel, evento));
  }

  const resumen = narradas.length
    ? narradas.join(' ')
    : `No se detectaron patrones fuera de lo habitual en ${metricLabel} durante este periodo — el tráfico se mantuvo dentro de su rango normal.`;

  return {
    resumen,
    episodios: visibleEpisodes.map((ep) => ({
      tipo: ep.type,
      desde: ep.weeks[0].weekStart,
      hasta: ep.weeks[ep.weeks.length - 1].weekEnd,
      magnitud_pct: Math.round(ep.avgDelta * 100),
      sostenido: ep.sustained,
      recuperado: ep.recovered,
    })),
    semanas_analizadas: allWeeks.length,
  };
}
