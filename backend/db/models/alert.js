// Alertas generadas a partir de una predicción (§7).
export default function defineAlert(sequelize, DataTypes) {
  return sequelize.define(
    'Alert',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      prediction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tipo: {
        // 'caida' | 'pico'
        type: DataTypes.STRING,
        allowNull: false,
      },
      severidad: {
        // 'alta' | 'media' | 'baja'
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'media',
      },
      // Magnitud del cambio proyectado (fracción, ej. -0.22 = -22%).
      cambio_proyectado: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      // Sugerencia de acción preventiva generada por reglas (§9.4).
      sugerencia: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      fecha_detectada: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      resuelta: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'alerts',
    }
  );
}
