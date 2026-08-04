// Lógica del dashboard (Alpine.js + fetch + ApexCharts).
// Maneja explícitamente estados de carga y error en cada fetch (§11).
// Incluye: histórico (Fase 2), overlay de predicción (3.8), panel de alertas
// (4.3), registro de estrategia (4.4) y eventos externos (4.8).
function dashboard() {
  return {
    // --- Estado base ---
    user: null,
    accounts: [],
    accountId: '',
    metric: 'clics',
    urls: [],
    queries: [],
    urlId: '',
    queryId: '',
    start: '',
    end: '',

    loadingAccounts: true,
    loadingChart: false,
    error: '',
    chart: null,
    seriesCount: 0,
    lastSeries: [],

    // --- Importación de histórico (ingesta GA4/GSC) ---
    importingHistory: false,
    importMsg: '',

    // --- Predicción ---
    prediction: null, // array de puntos {fecha, yhat, yhat_lower, yhat_upper}
    predicting: false,
    predictionMsg: '',

    // --- Detector de patrones (v1, reglas, semanal — ver ROADMAP.md) ---
    patternsResumen: '',
    patternsEpisodios: [],
    analyzingPatterns: false,

    // --- Alertas ---
    alerts: [],
    loadingAlerts: false,

    // --- Estrategia ---
    strategyEntries: [],
    nuevaAccion: '',
    nuevoResultado: '',
    savingStrategy: false,

    // --- Eventos externos ---
    events: [],
    evFecha: '',
    evTipo: 'update_google',
    evDescripcion: '',
    savingEvent: false,

    // --- Chart enhancements (v0.4.0) ---
    donutAlerts: null,           // ApexCharts instance para donut por severidad
    sparklines: { alerts: [], events: [], strategy: [] }, // series por dia (14d)

    async init() {
      try {
        const me = await API.get('/api/auth/me');
        this.user = me.user;
      } catch {
        return;
      }
      const today = new Date();
      const past = new Date();
      past.setDate(today.getDate() - 90);
      this.end = today.toISOString().slice(0, 10);
      this.start = past.toISOString().slice(0, 10);
      this.evFecha = this.end;
      await this.loadAccounts();
    },

    async loadAccounts() {
      this.loadingAccounts = true;
      this.error = '';
      try {
        const data = await API.get('/api/accounts');
        this.accounts = data.accounts || [];
        if (this.accounts.length) {
          const params = new URLSearchParams(location.search);
          const preset = params.get('account');
          this.accountId =
            preset && this.accounts.some((a) => String(a.id) === preset)
              ? preset
              : String(this.accounts[0].id);
          await this.onAccountChange();
        }
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loadingAccounts = false;
      }
    },

    async onAccountChange() {
      if (!this.accountId) return;
      this.urlId = '';
      this.queryId = '';
      this.prediction = null;
      this.predictionMsg = '';
      this.importMsg = '';
      this.patternsResumen = '';
      this.patternsEpisodios = [];
      await Promise.all([this.loadUrls(), this.loadQueries()]);
      await this.loadChart();
      await Promise.all([
        this.loadAlerts(),
        this.loadStrategy(),
        this.loadEvents(),
        this.loadSparklines(),
      ]);
    },

    async loadUrls() {
      try {
        const data = await API.get(`/api/accounts/${this.accountId}/urls`);
        this.urls = data.urls || [];
      } catch (e) {
        this.error = e.message;
      }
    },

    async loadQueries() {
      try {
        const data = await API.get(`/api/accounts/${this.accountId}/queries`);
        this.queries = data.queries || [];
      } catch (e) {
        this.error = e.message;
      }
    },

    isGa4() {
      return this.metric === 'sesiones';
    },

    // Al cambiar filtros, se invalida la predicción/análisis anterior (ya no aplica).
    onFilterChange() {
      this.prediction = null;
      this.predictionMsg = '';
      this.patternsResumen = '';
      this.patternsEpisodios = [];
      this.loadChart();
    },

    async loadChart(opts = {}) {
      if (!this.accountId) return;
      this.loadingChart = true;
      this.error = '';
      try {
        const qs = new URLSearchParams({
          metric: this.metric,
          start: this.start,
          end: this.end,
        });
        if (this.isGa4() && this.urlId) qs.set('urlId', this.urlId);
        if (!this.isGa4() && this.queryId) qs.set('queryId', this.queryId);

        const data = await API.get(
          `/api/accounts/${this.accountId}/traffic?` + qs.toString()
        );
        this.seriesCount = data.count || 0;
        this.lastSeries = data.series || [];
        this.renderChart();

        // Detección automática (§ pedido: traer histórico al cambiar cuenta/fechas):
        // si cubrimos menos de la mitad de los días del rango pedido, es señal de
        // que ese rango nunca se importó desde Google — se importa solo.
        if (!opts.skipAutoImport) {
          const expected = this.expectedDaysBetween(this.start, this.end);
          if (expected > 0 && this.seriesCount < expected * 0.5) {
            await this.tryAutoImport();
          }
        }
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loadingChart = false;
      }
    },

    // Nº de días calendario entre dos fechas ISO (inclusive), para medir cobertura.
    expectedDaysBetween(start, end) {
      if (!start || !end) return 0;
      const s = new Date(start + 'T00:00:00Z');
      const e = new Date(end + 'T00:00:00Z');
      return Math.floor((e - s) / 86400000) + 1;
    },

    // --- Importación de histórico GA4/GSC (§12 1.9) ---
    // Llama al endpoint de ingesta. No toca this.error/this.importMsg: eso lo
    // decide el llamador (importHistoryManual = explícito, tryAutoImport = silencioso).
    async importHistory(startDate, endDate) {
      if (!this.accountId) return null;
      this.importingHistory = true;
      try {
        const data = await API.post(`/api/accounts/${this.accountId}/ingest`, {
          startDate,
          endDate,
        });
        return data.result || {};
      } finally {
        this.importingHistory = false;
      }
    },

    formatIngestResult(r) {
      const skipped = r.skipped && r.skipped.length ? ` Omitido: ${r.skipped.join('; ')}.` : '';
      return `Histórico importado: ${r.ga4 || 0} filas de GA4, ${r.gsc || 0} filas de Search Console.${skipped}`;
    },

    // Botón manual: importa/actualiza el rango de fechas seleccionado.
    async importHistoryManual() {
      if (!this.accountId) return;
      this.error = '';
      this.importMsg = 'Importando histórico desde Google…';
      try {
        const r = await this.importHistory(this.start, this.end);
        this.importMsg = this.formatIngestResult(r);
        await Promise.all([this.loadUrls(), this.loadQueries()]);
        await this.loadChart({ skipAutoImport: true });
      } catch (e) {
        this.importMsg = '';
        this.error = 'No se pudo importar el histórico: ' + e.message;
      }
    },

    // Automático: se llama desde loadChart cuando detecta poca/nula cobertura.
    async tryAutoImport() {
      if (this.importingHistory) return;
      this.importMsg = 'Poco o ningún histórico para este rango — importando automáticamente desde Google…';
      try {
        const r = await this.importHistory(this.start, this.end);
        this.importMsg = this.formatIngestResult(r);
        await Promise.all([this.loadUrls(), this.loadQueries()]);
        await this.loadChart({ skipAutoImport: true });
      } catch (e) {
        // Cuentas sin conexión de Google (ej. la cuenta demo con datos
        // sintéticos) no deben mostrar esto como un error bloqueante.
        if (/conexión de Google/i.test(e.message)) {
          this.importMsg = '';
        } else {
          this.importMsg = '';
          this.error = 'No se pudo importar histórico automáticamente: ' + e.message;
        }
      }
    },

    // --- Predicción (Fase 3) ---
    async runPrediction() {
      if (!this.accountId) return;
      this.predicting = true;
      this.predictionMsg = '';
      this.error = '';
      try {
        const body = { metric: this.metric };
        if (this.isGa4() && this.urlId) body.urlId = this.urlId;
        if (!this.isGa4() && this.queryId) body.queryId = this.queryId;

        const data = await API.post(`/api/accounts/${this.accountId}/predict`, body);

        if (data.estado === 'datos_insuficientes') {
          this.prediction = null;
          this.predictionMsg = data.message;
          this.renderChart();
        } else {
          this.prediction = data.prediction.valores_predichos || [];
          this.predictionMsg =
            'Predicción generada' +
            (data.componentes?.motor ? ` (motor: ${data.componentes.motor})` : '') +
            '.';
          this.renderChart();
          // Si generó una alerta, recargar el panel.
          if (data.alert) await this.loadAlerts();
        }
      } catch (e) {
        this.error = e.message;
      } finally {
        this.predicting = false;
      }
    },

    // --- Detector de patrones (v1, reglas, semanal) ---
    async analyzePatterns() {
      if (!this.accountId) return;
      this.analyzingPatterns = true;
      this.error = '';
      try {
        const qs = new URLSearchParams({
          metric: this.metric,
          start: this.start,
          end: this.end,
        });
        if (this.isGa4() && this.urlId) qs.set('urlId', this.urlId);
        if (!this.isGa4() && this.queryId) qs.set('queryId', this.queryId);

        const data = await API.get(
          `/api/accounts/${this.accountId}/patterns?` + qs.toString()
        );
        this.patternsResumen = data.resumen || '';
        this.patternsEpisodios = data.episodios || [];
      } catch (e) {
        this.error = 'No se pudo analizar patrones: ' + e.message;
      } finally {
        this.analyzingPatterns = false;
      }
    },

    episodeTypeLabel(ep) {
      const base = ep.tipo === 'caida' ? 'Caída' : 'Pico';
      return ep.sostenido ? `${base} sostenida` : base;
    },

    renderChart() {
      const histData = this.lastSeries.map((p) => ({
        x: p.fecha,
        y: p.valor,
      }));

      // Series y arrays de estilo dimensionados al nº real de series (evita el
      // crash "reading '0'" de ApexCharts por arrays de distinta longitud).
      const series = [{ name: 'Histórico', type: 'line', data: histData }];
      const colors = ['#2563eb'];
      const strokeWidth = [2];
      const dashArray = [0];
      const fillOpacity = [1];

      const hasPrediction = this.prediction && this.prediction.length;
      if (hasPrediction) {
        // Conectar el último punto histórico con la predicción.
        const bridge = histData.length ? [histData[histData.length - 1]] : [];
        const fc = this.prediction.map((p) => ({ x: p.fecha, y: p.yhat }));
        const band = this.prediction.map((p) => ({
          x: p.fecha,
          y: [p.yhat_lower, p.yhat_upper],
        }));

        // Orden: histórico (línea) · confianza (banda) · predicción (línea punteada).
        series.push({ name: 'Confianza', type: 'rangeArea', data: band });
        series.push({
          name: 'Predicción',
          type: 'line',
          data: [...bridge, ...fc],
        });
        colors.push('#93c5fd', '#f59e0b');
        strokeWidth.push(1, 2);
        dashArray.push(0, 6);
        fillOpacity.push(0.2, 1);
      }

      // Annotations: external_events en el rango visible del chart.
      // Colorear por tipo: update_google rojo, mercado amber.
      const annotations = this.buildEventAnnotations();

      const options = {
        chart: {
          // 'rangeArea' soporta combo con líneas; 'line' se usa cuando no hay banda.
          type: hasPrediction ? 'rangeArea' : 'line',
          height: 380,
          fontFamily: 'inherit',
          toolbar: { show: true },
          animations: { enabled: true },
        },
        series,
        colors,
        xaxis: { type: 'datetime', labels: { datetimeUTC: false } },
        yaxis: {
          labels: { formatter: (v) => Math.round(v).toLocaleString('es-MX') },
        },
        stroke: { curve: 'smooth', width: strokeWidth, dashArray },
        fill: { opacity: fillOpacity },
        legend: { show: true },
        dataLabels: { enabled: false },
        tooltip: { x: { format: 'dd MMM yyyy' } },
        noData: { text: 'Sin datos para este rango.' },
        ...(annotations ? { annotations } : {}),
      };

      if (this.chart) {
        this.chart.destroy();
      }
      this.chart = new ApexCharts(document.querySelector('#chart'), options);
      this.chart.render();
    },

    // Convierte this.events en annotations de ApexCharts filtradas al
    // rango visible del chart (start..end). Devuelve null si no hay
    // eventos en rango, para omitir la key annotations.
    buildEventAnnotations() {
      if (!this.events?.length || !this.start || !this.end) return null;
      const startMs = new Date(this.start).getTime();
      const endMs = new Date(this.end).getTime() + 24 * 60 * 60 * 1000 - 1;
      const inRange = this.events.filter((e) => {
        const t = new Date(e.fecha).getTime();
        return t >= startMs && t <= endMs;
      });
      if (!inRange.length) return null;
      return {
        xaxis: inRange.map((e) => ({
          x: new Date(e.fecha).getTime(),
          borderColor: e.tipo === 'update_google' ? '#dc2626' : '#f59e0b',
          strokeWidth: 1,
          strokeDashArray: 4,
          label: {
            text: e.descripcion,
            style: {
              color: '#fff',
              background: e.tipo === 'update_google' ? '#dc2626' : '#f59e0b',
              fontSize: '10px',
              fontWeight: 500,
              padding: { left: 4, right: 4, top: 2, bottom: 2 },
            },
            orientation: 'horizontal',
            position: 'top',
            offsetY: -4,
          },
        })),
      };
    },

    metricLabel() {
      return (
        { clics: 'Clics', impresiones: 'Impresiones', sesiones: 'Sesiones' }[
          this.metric
        ] || this.metric
      );
    },

    // --- Alertas (Fase 4) ---
    async loadAlerts() {
      this.loadingAlerts = true;
      try {
        const data = await API.get(`/api/alerts?accountId=${this.accountId}`);
        this.alerts = data.alerts || [];
        this.$nextTick(() => this.renderDonutAlerts());
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loadingAlerts = false;
      }
    },

    async resolveAlert(id) {
      try {
        await API.patch(`/api/alerts/${id}/resolve`, {});
        await this.loadAlerts();
      } catch (e) {
        this.error = e.message;
      }
    },

    severityColor(sev) {
      return (
        {
          alta: 'bg-red-100 text-red-800 border-red-200',
          media: 'bg-amber-100 text-amber-800 border-amber-200',
          baja: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        }[sev] || 'bg-gray-100 text-gray-700 border-gray-200'
      );
    },

    // --- Estrategia (Fase 4) ---
    async loadStrategy() {
      try {
        const data = await API.get(`/api/accounts/${this.accountId}/strategy-log`);
        this.strategyEntries = data.entries || [];
      } catch (e) {
        this.error = e.message;
      }
    },

    async saveStrategy(alertId = null) {
      if (!this.nuevaAccion.trim()) return;
      this.savingStrategy = true;
      try {
        await API.post(`/api/accounts/${this.accountId}/strategy-log`, {
          accion_tomada: this.nuevaAccion,
          resultado_observado: this.nuevoResultado || null,
          alert_id: alertId,
        });
        this.nuevaAccion = '';
        this.nuevoResultado = '';
        await this.loadStrategy();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.savingStrategy = false;
      }
    },

    // Registrar acción ligada a una alerta concreta.
    async logForAlert(alert) {
      const accion = prompt('Acción tomada para esta alerta:');
      if (!accion) return;
      try {
        await API.post(`/api/accounts/${this.accountId}/strategy-log`, {
          accion_tomada: accion,
          alert_id: alert.id,
        });
        await this.loadStrategy();
      } catch (e) {
        this.error = e.message;
      }
    },

    // --- Eventos externos (Fase 4) ---
    async loadEvents() {
      try {
        const data = await API.get(`/api/external-events?accountId=${this.accountId}`);
        this.events = data.events || [];
        // Re-render el chart principal para incluir las annotations.
        if (this.chart) this.renderChart();
      } catch (e) {
        this.error = e.message;
      }
    },

    // --- Sparklines para stat cards ---
    async loadSparklines() {
      try {
        const data = await API.get(
          `/api/dashboard/sparklines?accountId=${this.accountId}&days=14`
        );
        this.sparklines = {
          alerts: data.alerts || [],
          events: data.events || [],
          strategy: data.strategy || [],
        };
        this.$nextTick(() => {
          this.initApexSparkline('sparkline-alerts', this.sparklines.alerts, '#dc2626');
          this.initApexSparkline('sparkline-events', this.sparklines.events, '#f59e0b');
          this.initApexSparkline('sparkline-strategy', this.sparklines.strategy, '#10b981');
        });
      } catch (e) {
        console.error('loadSparklines:', e);
      }
    },

    initApexSparkline(elId, values, color) {
      const el = document.getElementById(elId);
      if (!el) return;
      // Reusar instancia si ya existe; solo updateSeries (mas barato).
      if (this[`sparkline_${elId}`]) {
        this[`sparkline_${elId}`].updateSeries([{ data: values }]);
        return;
      }
      const chart = new ApexCharts(el, {
        chart: {
          type: 'area',
          height: 32,
          sparkline: { enabled: true },
          animations: { enabled: false },
        },
        series: [{ data: values }],
        stroke: { curve: 'smooth', width: 2 },
        colors: [color],
        fill: { opacity: 0.15 },
        tooltip: {
          enabled: true,
          theme: 'light',
          x: { show: false },
          y: { formatter: (v) => v + (v === 1 ? ' evento' : ' eventos') },
        },
      });
      chart.render();
      this[`sparkline_${elId}`] = chart;
    },

    // --- Donut: alertas por severidad ---
    renderDonutAlerts() {
      const counts = { alta: 0, media: 0, baja: 0 };
      for (const al of this.alerts) {
        if (counts[al.severidad] !== undefined) counts[al.severidad] += 1;
      }
      const series = [counts.alta, counts.media, counts.baja];
      if (this.donutAlerts) {
        this.donutAlerts.updateOptions({
          series,
          labels: ['Alta', 'Media', 'Baja'],
        });
        return;
      }
      const el = document.getElementById('chart-alerts-donut');
      if (!el) return;
      this.donutAlerts = new ApexCharts(el, {
        chart: { type: 'donut', height: 160 },
        series,
        labels: ['Alta', 'Media', 'Baja'],
        colors: ['#dc2626', '#f59e0b', '#10b981'],
        legend: { position: 'bottom', fontSize: '12px', markers: { size: 5 } },
        plotOptions: { pie: { donut: { size: '65%' } } },
        dataLabels: { enabled: false },
        stroke: { width: 2, colors: ['#fff'] },
        tooltip: {
          y: { formatter: (v) => v + (v === 1 ? ' alerta' : ' alertas') },
        },
      });
      this.donutAlerts.render();
    },

    async saveEvent() {
      if (!this.evFecha || !this.evDescripcion.trim()) return;
      this.savingEvent = true;
      try {
        await API.post('/api/external-events', {
          fecha: this.evFecha,
          tipo: this.evTipo,
          descripcion: this.evDescripcion,
          account_id: Number.parseInt(this.accountId, 10),
        });
        this.evDescripcion = '';
        await this.loadEvents();
      } catch (e) {
        this.error = e.message;
      } finally {
        this.savingEvent = false;
      }
    },

    async deleteEvent(id) {
      try {
        await API.del(`/api/external-events/${id}`);
        await this.loadEvents();
      } catch (e) {
        this.error = e.message;
      }
    },

    async logout() {
      try {
        await API.post('/api/auth/logout');
      } finally {
        location.href = '/login.html';
      }
    },
  };
}
