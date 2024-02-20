import { Model } from 'sequelize';
import { format } from 'date-fns';

export default (sequelize, DataTypes) => {
  /**
   * @class Member
   * Represents the association between a user and a conversation.
   *
   * @property {string} userId - The unique ID of the user.
   * @property {string} conversationId - The unique ID of the conversation.
   * @property {Date} joinedAt - The date when the user was associated with the conversation.
   * @property {boolean} isAdmin - Indicates if the user is an admin in the conversation.
   */
  class Member extends Model {}

  Member.init(
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      conversationId: {
        type: DataTypes.UUID,
        primaryKey: true
      },
      joinedAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        get() {
          let date = this.getDataValue('joinedAt');

          return !!date && date instanceof Date
            ? format(date, 'd MMMM yyyy, h:mm a')
            : date;
        }
      },
      isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: 'Member',
      tableName: 'members',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'conversationId'],
          name: 'idx_usersconversations_userId_conversationId',
          type: 'BTREE'
        }
      ]
    }
  );

  Member.associate = (models) => {
    Member.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'profile'
    });
    Member.belongsTo(models.Conversation, {
      foreignKey: 'conversationId',
      as: 'conversation'
    });
  };
  return Member;
};
