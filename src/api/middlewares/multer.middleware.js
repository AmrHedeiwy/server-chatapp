import multer from 'multer';
import { InvalidFileFormat } from '../helpers/ErrorTypes.helper.js';

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({
  limits: {
    fileSize: 1000000
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new InvalidFileFormat());
    }

    cb(null, true);
  },
  storage
});

export default upload;
