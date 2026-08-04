// Snapshot de reporte periódico generado por el cron (§9.7, §12 4.6).
// El canal de entrega (email/Slack) queda pendiente (§14): por ahora el reporte
// se guarda en BD y puede consultarse vía API.
export default function defineReportSnapshot(sequelize, DataTypes) {
  return sequelize.define(
    'ReportSnapshot',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fecha_generacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      // Resumen estructurado: por cuenta, métricas clave, alertas nuevas, etc.
      contenido: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      tableName: 'report_snapshots',
    }
  );
}
