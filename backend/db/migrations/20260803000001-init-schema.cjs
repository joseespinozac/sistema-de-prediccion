'use strict';

/**
 * Migración inicial: crea todas las tablas del modelo de datos (§7).
 * Se crean todas de una vez para evitar migraciones fragmentadas y para
 * habilitar el salto SQLite → Postgres sin reescribir esquema (§10).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, DATE, DATEONLY, FLOAT, JSON } =
      Sequelize;

    const timestamps = {
      created_at: { type: DATE, allowNull: false },
      updated_at: { type: DATE, allowNull: false },
    };

    await queryInterface.createTable('users', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      email: { type: STRING, allowNull: false, unique: true },
      password_hash: { type: STRING, allowNull: false },
      rol: { type: STRING, allowNull: false, defaultValue: 'member' },
      ...timestamps,
    });

    await queryInterface.createTable('accounts', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: STRING, allowNull: false },
      ga4_property_id: { type: STRING, allowNull: true },
      gsc_site_url: { type: STRING, allowNull: true },
      activo: { type: BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('google_connections', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      account_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: 'accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      user_id: {
        type: INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      access_token_encrypted: { type: TEXT, allowNull: false },
      refresh_token_encrypted: { type: TEXT, allowNull: true },
      expires_at: { type: DATE, allowNull: true },
      scopes: { type: TEXT, allowNull: true },
      google_email: { type: STRING, allowNull: true },
      connected_at: { type: DATE, allowNull: false },
      ...timestamps,
    });

    await queryInterface.createTable('tracked_urls', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      account_id: {
        type: INTEGER,
        allowNull: false,
        references: { model: 'accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      url: { type: STRING, allowNull: false },
      activo: { type: BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('tracked_queries', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      account_id: {
        type: INTEGER,
        allowNull: false,
        references: { model: 'accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      query: { type: STRING, allowNull: false },
      activo: { type: BOOLEAN, allowNull: false, defaultValue: true },
      ...timestamps,
    });

    await queryInterface.createTable('traffic_snapshots', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      account_id: {
        type: INTEGER,
        allowNull: false,
        references: { model: 'accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      url_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: 'tracked_urls', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      query_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: 'tracked_queries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      fecha: { type: DATEONLY, allowNull: false },
      canal_origen: { type: STRING, allowNull: true },
      clics: { type: INTEGER, allowNull: true },
      impresiones: { type: INTEGER, allowNull: true },
      sesiones: { type: INTEGER, allowNull: true },
      fuente: { type: STRING, allowNull: false },
      ...timestamps,
    });
    await queryInterface.addIndex('traffic_snapshots', {
      name: 'idx_traffic_series',
      fields: ['account_id', 'url_id', 'query_id', 'fuente', 'fecha'],
    });

    await queryInterface.createTable('technical_health_checks', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      account_id: {
        type: INTEGER,
        allowNull: false,
        references: { model: 'accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      url_id: {
        type: INTEGER,
        allowNull: false,
        references: { model: 'tracked_urls', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      fecha: { type: DATE, allowNull: false },
      status_code: { type: INTEGER, allowNull: true },
      core_web_vitals_score: { type: FLOAT, allowNull: true },
      detalle: { type: JSON, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('external_events', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      fecha: { type: DATEONLY, allowNull: false },
      tipo: { type: STRING, allowNull: false },
      descripcion: { type: STRING, allowNull: false },
      account_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: 'accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ...timestamps,
    });

    await queryInterface.createTable('predictions', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      account_id: {
        type: INTEGER,
        allowNull: false,
        references: { model: 'accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      url_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: 'tracked_urls', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      query_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: 'tracked_queries', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      metrica: { type: STRING, allowNull: false, defaultValue: 'clics' },
      fecha_generacion: { type: DATE, allowNull: false },
      periodo_predicho_inicio: { type: DATEONLY, allowNull: false },
      periodo_predicho_fin: { type: DATEONLY, allowNull: false },
      valores_predichos: { type: JSON, allowNull: false },
      intervalo_confianza: { type: FLOAT, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('alerts', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      prediction_id: {
        type: INTEGER,
        allowNull: false,
        references: { model: 'predictions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tipo: { type: STRING, allowNull: false },
      severidad: { type: STRING, allowNull: false, defaultValue: 'media' },
      cambio_proyectado: { type: FLOAT, allowNull: true },
      sugerencia: { type: TEXT, allowNull: true },
      fecha_detectada: { type: DATE, allowNull: false },
      resuelta: { type: BOOLEAN, allowNull: false, defaultValue: false },
      ...timestamps,
    });

    await queryInterface.createTable('strategy_log', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      alert_id: {
        type: INTEGER,
        allowNull: true,
        references: { model: 'alerts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      account_id: {
        type: INTEGER,
        allowNull: false,
        references: { model: 'accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      fecha: { type: DATE, allowNull: false },
      accion_tomada: { type: TEXT, allowNull: false },
      resultado_observado: { type: TEXT, allowNull: true },
      autor_id: {
        type: INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ...timestamps,
    });
  },

  async down(queryInterface) {
    // Orden inverso por las llaves foráneas.
    await queryInterface.dropTable('strategy_log');
    await queryInterface.dropTable('alerts');
    await queryInterface.dropTable('predictions');
    await queryInterface.dropTable('external_events');
    await queryInterface.dropTable('technical_health_checks');
    await queryInterface.dropTable('traffic_snapshots');
    await queryInterface.dropTable('tracked_queries');
    await queryInterface.dropTable('tracked_urls');
    await queryInterface.dropTable('google_connections');
    await queryInterface.dropTable('accounts');
    await queryInterface.dropTable('users');
  },
};
