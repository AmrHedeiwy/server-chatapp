import fs from 'fs';

import cloudinary from '../../../lib/cloudinary.js';
import db from '../../models/index.js';

export const upload = async (path, key, uniqueId) => {
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
      await db.Conversation.update(
        { image: result.secure_url },
        { where: { conversationId: uniqueId } }
      );
    }

    return { fileUrl: result.secure_url };
  } catch (err) {
    return { error: err };
  }
};

export default { upload };
