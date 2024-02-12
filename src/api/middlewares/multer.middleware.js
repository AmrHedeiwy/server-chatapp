import multer from 'multer';
import { InvalidFileFormat } from '../helpers/ErrorTypes.helper.js';

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
  destination: function (req, file, cb) {
    cb(null, './temp'); // Save files to the 'temp' directory
  }
});

const upload = multer({
  limits: {
    fileSize: 4194304
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
      return cb(new InvalidFileFormat());
    }

    // No need to pass the file since the file path is appended to the request body
    cb(null, file);
  },
  storage
});

export default upload;
