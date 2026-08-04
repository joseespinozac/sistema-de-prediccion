#!/usr/bin/env node
// CLI runner para periodic jobs: `npm run jobs:run <job-name>`.
// Implementa la regla ADR-004 §Orquestador / CLI runner: cada job vive en
// backend/jobs/<job-name>.js exportando `runJobName()`, y este dispatcher
// lo invoca bajo demanda.
//
// `npm run jobs:run -- --list` imprime los jobs disponibles.
import 'dotenv/config';

const jobArg = process.argv[2];

const JOBS = {
  'report-snapshot': () =>
    import('../backend/jobs/report-snapshot.js').then((m) => m.runReportSnapshot()),
};

if (jobArg === '--list' || !jobArg) {
  console.log('Available jobs:');
  for (const name of Object.keys(JOBS)) {
    console.log(`  ${name}`);
  }
  process.exit(jobArg === '--list' ? 0 : 1);
}

if (!JOBS[jobArg]) {
  console.error(
    `FATAL: job "${jobArg}" desconocido. Disponibles: ${Object.keys(JOBS).join(', ')}`,
  );
  process.exit(1);
}

try {
  const result = await JOBS[jobArg]();
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
} catch (err) {
  console.error(JSON.stringify({ jobName: jobArg, error: err.message }, null, 2));
  process.exit(1);
}
