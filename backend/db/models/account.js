// Una cuenta = un sitio/marca trackeado dentro de la herramienta (§7).
export default function defineAccount(sequelize, DataTypes) {
  return sequelize.define(
    'Account',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // ID de propiedad GA4 (formato "properties/123456789" o solo el número).
      ga4_property_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      // URL del sitio en Search Console (ej. "https://ejemplo.com/" o "sc-domain:ejemplo.com").
      gsc_site_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'accounts',
    }
  );
}
