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
    cb(new Error('Only images are allowed'));
  }
};

// Create the multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

module.exports = upload;