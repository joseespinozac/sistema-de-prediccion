// Credenciales OAuth de Google (GA4 + GSC) encriptadas en reposo (§6.2).
// Los campos *_encrypted contienen texto cifrado AES-256-GCM (base64) y
// NUNCA se exponen al cliente: toJSON los elimina explícitamente.
export default function defineGoogleConnection(sequelize, DataTypes) {
  const GoogleConnection = sequelize.define(
    'GoogleConnection',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      account_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // se asocia a una cuenta tras elegir propiedad/sitio
      },
      user_id: {
        // Quién conectó esta cuenta (auditoría, §6.2).
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      access_token_encrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      refresh_token_encrypted: {
        type: DataTypes.TEXT,
        allowNull: true, // Google no siempre reemite refresh_token
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      scopes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Email de la cuenta de Google conectada (informativo, no secreto).
      google_email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      connected_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'google_connections',
    }
  );

  // Los tokens encriptados jamás salen en una respuesta JSON (§6.2, §10).
  GoogleConnection.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };
    delete values.access_token_encrypted;
    delete values.refresh_token_encrypted;
    return values;
  };

  return GoogleConnection;
}
