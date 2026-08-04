// Instancia central de Sequelize + registro de modelos y asociaciones.
// Lee la configuración de config.cjs (misma fuente que usa sequelize-cli),
// de modo que la app y las migraciones nunca divergen de dialecto/almacenamiento.
import { Sequelize, DataTypes } from 'sequelize';
import { createRequire } from 'node:module';
import { env } from '../config/env.js';

import defineUser from './models/user.js';
import defineAccount from './models/account.js';
import defineGoogleConnection from './models/googleConnection.js';
import defineTrackedUrl from './models/trackedUrl.js';
import defineTrackedQuery from './models/trackedQuery.js';
import defineTrafficSnapshot from './models/trafficSnapshot.js';
import defineTechnicalHealthCheck from './models/technicalHealthCheck.js';
import defineExternalEvent from './models/externalEvent.js';
import definePrediction from './models/prediction.js';
import defineAlert from './models/alert.js';
import defineStrategyLog from './models/strategyLog.js';
import defineReportSnapshot from './models/reportSnapshot.js';

// config.cjs es CommonJS; lo cargamos con createRequire para reutilizar
// exactamente la misma config que sequelize-cli.
const require = createRequire(import.meta.url);
const allConfig = require('../config/config.cjs');
const dbConfig = allConfig[env.nodeEnv] || allConfig.development;

export const sequelize = dbConfig.use_env_variable
  ? new Sequelize(process.env[dbConfig.use_env_variable], dbConfig)
  : new Sequelize(dbConfig);

// Registrar modelos.
export const User = defineUser(sequelize, DataTypes);
export const Account = defineAccount(sequelize, DataTypes);
export const GoogleConnection = defineGoogleConnection(sequelize, DataTypes);
export const TrackedUrl = defineTrackedUrl(sequelize, DataTypes);
export const TrackedQuery = defineTrackedQuery(sequelize, DataTypes);
export const TrafficSnapshot = defineTrafficSnapshot(sequelize, DataTypes);
export const TechnicalHealthCheck = defineTechnicalHealthCheck(
  sequelize,
  DataTypes
);
export const ExternalEvent = defineExternalEvent(sequelize, DataTypes);
export const Prediction = definePrediction(sequelize, DataTypes);
export const Alert = defineAlert(sequelize, DataTypes);
export const StrategyLog = defineStrategyLog(sequelize, DataTypes);
export const ReportSnapshot = defineReportSnapshot(sequelize, DataTypes);

export const models = {
  User,
  Account,
  GoogleConnection,
  TrackedUrl,
  TrackedQuery,
  TrafficSnapshot,
  TechnicalHealthCheck,
  ExternalEvent,
  Prediction,
  Alert,
  StrategyLog,
  ReportSnapshot,
};

// ---- Asociaciones ----
Account.hasMany(GoogleConnection, { foreignKey: 'account_id' });
GoogleConnection.belongsTo(Account, { foreignKey: 'account_id' });
GoogleConnection.belongsTo(User, { foreignKey: 'user_id', as: 'connectedBy' });

Account.hasMany(TrackedUrl, { foreignKey: 'account_id' });
TrackedUrl.belongsTo(Account, { foreignKey: 'account_id' });

Account.hasMany(TrackedQuery, { foreignKey: 'account_id' });
TrackedQuery.belongsTo(Account, { foreignKey: 'account_id' });

Account.hasMany(TrafficSnapshot, { foreignKey: 'account_id' });
TrafficSnapshot.belongsTo(Account, { foreignKey: 'account_id' });
TrafficSnapshot.belongsTo(TrackedUrl, { foreignKey: 'url_id' });
TrafficSnapshot.belongsTo(TrackedQuery, { foreignKey: 'query_id' });

Account.hasMany(TechnicalHealthCheck, { foreignKey: 'account_id' });
TechnicalHealthCheck.belongsTo(Account, { foreignKey: 'account_id' });
TechnicalHealthCheck.belongsTo(TrackedUrl, { foreignKey: 'url_id' });

Account.hasMany(ExternalEvent, { foreignKey: 'account_id' });
ExternalEvent.belongsTo(Account, { foreignKey: 'account_id' });

Account.hasMany(Prediction, { foreignKey: 'account_id' });
Prediction.belongsTo(Account, { foreignKey: 'account_id' });
Prediction.belongsTo(TrackedUrl, { foreignKey: 'url_id' });
Prediction.belongsTo(TrackedQuery, { foreignKey: 'query_id' });
Prediction.hasMany(Alert, { foreignKey: 'prediction_id' });

Alert.belongsTo(Prediction, { foreignKey: 'prediction_id' });

Account.hasMany(StrategyLog, { foreignKey: 'account_id' });
StrategyLog.belongsTo(Account, { foreignKey: 'account_id' });
StrategyLog.belongsTo(Alert, { foreignKey: 'alert_id' });
StrategyLog.belongsTo(User, { foreignKey: 'autor_id', as: 'autor' });

export default sequelize;
