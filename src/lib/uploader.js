import cloudinary from './cloudinary.js';
import fs from 'fs';

export const uploader = async (path = null, data = null, folder) => {
  try {
    // const result = await cloudinary.uploader.upload(`./${path}` ?? data, {
    //   folder
    // });

    if (!!path)
      fs.unlink(`./${path}`, (err) => {
        if (err) {
          console.error('Error deleting file:', err, 'path:', path);
          return;
        }
      });

    return { secure_url: result.secure_url };
  } catch (err) {
    return { error: err };
  }
};
