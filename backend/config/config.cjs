// Configuración de Sequelize por entorno, consumida tanto por sequelize-cli
// (migraciones/seeders) como por la instancia de la app (backend/db/index.js).
// Se usa CommonJS porque sequelize-cli lo requiere con require().
require('dotenv').config();
const path = require('node:path');

// Ruta del archivo SQLite. Vive dentro de backend/db/data para que el
// volumen de docker-compose (/app/backend/db/data) pueda persistirlo.
const sqliteStorage = path.resolve(__dirname, '..', 'db', 'data', 'database.sqlite');

const common = {
  // Silenciar el logging SQL por defecto; se puede activar con DB_LOGGING=true.
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  define: {
    // snake_case en la BD, camelCase en el modelo.
    underscored: true,
    freezeTableName: false,
  },
};

module.exports = {
  development: {
    ...common,
    dialect: 'sqlite',
    storage: sqliteStorage,
  },
  test: {
    ...common,
    dialect: 'sqlite',
    storage: ':memory:',
  },
  // Placeholder para Fase 5 (migración a Postgres/Neon). Hasta entonces,
  // producción usa SQLite por defecto; se puede sobreescribir vía DATABASE_URL.
  production: process.env.DATABASE_URL
    ? {
        ...common,
        dialect: 'postgres',
        use_env_variable: 'DATABASE_URL',
        dialectOptions: {
          ssl: { require: true, rejectUnauthorized: false },
        },
      }
    : {
        ...common,
        dialect: 'sqlite',
        storage: sqliteStorage,
      },
};
