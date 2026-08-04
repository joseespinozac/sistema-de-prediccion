// Resultado de una corrida del motor de predicción (§7, §8).
export default function definePrediction(sequelize, DataTypes) {
  return sequelize.define(
    'Prediction',
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
      // Métrica sobre la que se predijo (ej. 'clics', 'sesiones', 'impresiones').
      metrica: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'clics',
      },
      fecha_generacion: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      periodo_predicho_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      periodo_predicho_fin: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      // Array de puntos { fecha, yhat, yhat_lower, yhat_upper } tal como
      // lo devuelve el servicio Python (§8).
      valores_predichos: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      // Nivel de confianza usado para la banda (ej. 0.8).
      intervalo_confianza: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
    },
    {
      tableName: 'predictions',
    }
  );
}
