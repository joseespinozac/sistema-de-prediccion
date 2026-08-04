// Factores externos registrados manualmente en v1 (§6.4, §7):
// updates de Google o eventos de mercado que alteran el tráfico.
export default function defineExternalEvent(sequelize, DataTypes) {
  return sequelize.define(
    'ExternalEvent',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      tipo: {
        // 'update_google' | 'mercado'
        type: DataTypes.STRING,
        allowNull: false,
      },
      descripcion: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      account_id: {
        // null = aplica a todas las cuentas.
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'external_events',
    }
  );
}
