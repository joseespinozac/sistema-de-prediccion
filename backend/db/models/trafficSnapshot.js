// Histórico crudo de tráfico importado desde GA4/GSC (§7).
// Una fila = una métrica de un día para una URL o consulta y un canal de origen.
export default function defineTrafficSnapshot(sequelize, DataTypes) {
  return sequelize.define(
    'TrafficSnapshot',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      account_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      url_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      query_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      canal_origen: {
        // ej. "organic", "direct", "referral" (GA4). Puede ser null para GSC.
        type: DataTypes.STRING,
        allowNull: true,
      },
      clics: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      impresiones: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      sesiones: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      fuente: {
        // 'ga4' | 'gsc' — de qué API vino este dato.
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: 'traffic_snapshots',
      indexes: [
        // Acelera la agregación por día para armar series de predicción,
        // y ayuda al cache de ingesta (no reimportar un rango ya traído).
        {
          fields: ['account_id', 'url_id', 'query_id', 'fuente', 'fecha'],
        },
      ],
    }
  );
}
