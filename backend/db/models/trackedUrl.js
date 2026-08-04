// URLs seleccionadas para trackeo dentro de una cuenta (§7).
export default function defineTrackedUrl(sequelize, DataTypes) {
  return sequelize.define(
    'TrackedUrl',
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
      url: {
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
      tableName: 'tracked_urls',
    }
  );
}
