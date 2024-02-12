import fs from 'fs';

import cloudinary from '../../../lib/cloudinary.js';
import db from '../../models/index.js';
import { io } from '../../../app.js';

/**
 * Uploads a file to a cloud storage service and updates the corresponding database entry with the file URL.
 * @param {string} currentUserId - The ID of the current user.
 * @param {string} path - The local path of the file to be uploaded.
 * @param {string} key - The key indicating the type of entity the file belongs to (e.g., 'conversationId').
 * @param {string} uniqueId - The unique identifier of the entity the file belongs to.
 * @returns {Object} An object containing the URL of the uploaded file, or an error object.
 */
export const upload = async (currentUserId, path, key, uniqueId) => {
  try {
    const result = await cloudinary.uploader.upload(path, {
      folder: 'images',
      public_id: `profile_img:${uniqueId}`
    });

    fs.unlink(path, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return;
      }
    });

    if (key === 'conversationId') {
      const conversation = await db.Conversation.findByPk(uniqueId, {
        include: ['members']
      });

      conversation.image = result.secure_url;
      await conversation.save();

      //  emits a socket event to update conversation data if the file is uploaded for a conversation image.
      io.to(uniqueId)
        .except(currentUserId)
        .emit('update_conversation', {
          conversationId: uniqueId,
          data: { image: result.secure_url }
        });
    }

    return { fileUrl: result.secure_url };
  } catch (err) {
    return { error: err };
  }
};

export default { upload };
