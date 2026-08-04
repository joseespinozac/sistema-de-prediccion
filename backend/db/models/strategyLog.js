// Registro de acciones/estrategia — el corazón del objetivo #3 (trazabilidad, §7).
export default function defineStrategyLog(sequelize, DataTypes) {
  return sequelize.define(
    'StrategyLog',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      alert_id: {
        // null = acción registrada sin una alerta puntual asociada.
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      account_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      accion_tomada: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      resultado_observado: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      autor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'strategy_log',
    }
  );
}
