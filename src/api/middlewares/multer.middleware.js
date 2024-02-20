import multer from 'multer';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './temp'); // Save files to the 'temp' directory
  }
});

const upload = multer({
  limits: {
    fileSize: 4194304 // 4MB
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
      return new Error('MULTER_FILETPYE_ERROR', file);
    }

    // No need to pass the file since the file path is appended to the request body
    cb(null, file);
  },
  storage
});

export default upload;
