'use strict';

/** Tabla para los snapshots del reporte periódico (§12 4.6). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, DATE, JSON } = Sequelize;
    await queryInterface.createTable('report_snapshots', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      fecha_generacion: { type: DATE, allowNull: false },
      contenido: { type: JSON, allowNull: false },
      created_at: { type: DATE, allowNull: false },
      updated_at: { type: DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('report_snapshots');
  },
};
