import multer from 'multer';
import { InvalidFileFormat } from '../helpers/ErrorTypes.helper.js';

const upload = multer({
  limits: {
    fileSize: 1000000
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new InvalidFileFormat('Please upload an image'));
    }

    cb(null, true);
  }
});

export default upload;
