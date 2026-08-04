// Consultas (queries de búsqueda) seleccionadas para trackeo (§7).
export default function defineTrackedQuery(sequelize, DataTypes) {
  return sequelize.define(
    'TrackedQuery',
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
      query: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'tracked_queries',
    }
  );
}
