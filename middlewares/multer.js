const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up storage location and filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination based on fieldname
    let uploadPath;
    if (file.fieldname === 'profileImage') {
      uploadPath = path.join(__dirname, '../public/uploads/profile');
    } else {
      uploadPath = path.join(__dirname, '../public/uploads/categoryImages');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

// File filter (optional) — only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid file type: ${file.mimetype}. Only JPEG, JPG, PNG and WEBP images are allowed`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};


// Create the multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field in file upload'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  } else if (err) {
    // An unknown error occurred
    if (err.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'Error uploading file'
    });
  }
  next();
};

module.exports = upload;
module.exports.handleMulterError = handleMulterError;
