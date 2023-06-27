import { Model } from 'sequelize';

/**
 * Defines the Session model.
 *
 * @param {import('sequelize').Sequelize} sequelize - The Sequelize instance.
 * @param {import('sequelize').DataTypes} DataTypes - The data types module.
 * @returns {Session} The initalized model.
 */
export default (sequelize, DataTypes) => {
  class Session extends Model {}

  Session.init(
    {
      SessionID: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
      },
      Expires: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      Data: {
        type: DataTypes.BLOB
      }
    },
    {
      sequelize,
      modelName: 'Session',
      tableName: 'sessions'
    }
  );

  return Session;
};
