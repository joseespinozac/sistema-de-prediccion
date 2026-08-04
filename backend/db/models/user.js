// Usuarios del equipo E3 (login propio, no SSO en v1).
export default function defineUser(sequelize, DataTypes) {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      rol: {
        // Rol único en v1 ("member"); roles diferenciados quedan a futuro (§7).
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'member',
      },
    },
    {
      tableName: 'users',
    }
  );

  // El hash NUNCA se serializa en respuestas JSON (§10).
  User.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };
    delete values.password_hash;
    return values;
  };

  return User;
}
