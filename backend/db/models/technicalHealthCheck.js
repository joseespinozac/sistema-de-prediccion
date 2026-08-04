// Resultado de chequeos de salud técnica (PageSpeed + status code) por URL (§6.3, §7).
export default function defineTechnicalHealthCheck(sequelize, DataTypes) {
  return sequelize.define(
    'TechnicalHealthCheck',
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
        allowNull: false,
      },
      fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status_code: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // Puntaje de performance de PageSpeed (0-100) como proxy de Core Web Vitals.
      core_web_vitals_score: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      // Detalle crudo opcional (LCP/CLS/FID) por si se quiere mostrar después.
      detalle: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: 'technical_health_checks',
    }
  );
}
