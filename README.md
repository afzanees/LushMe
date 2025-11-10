# LushMe - E-commerce Beauty Products Platform

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v6+-green.svg)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-v5+-blue.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A full-featured e-commerce platform for beauty products built with Node.js, Express, MongoDB, and EJS templating engine.

## 🚀 Features

### Customer Features
- 🔐 **Secure Authentication** - Email/Password + Google OAuth 2.0
- 🛍️ **Product Browsing** - Advanced filtering by category, brand, price, color
- 🔍 **Smart Search** - Search products by name, description, category
- 🛒 **Shopping Cart** - Add, update, remove items
- ❤️ **Wishlist** - Save favorite products
- 📦 **Order Management** - Track order status and history
- 👤 **User Profile** - Manage personal information and addresses
- 📧 **Email Notifications** - OTP verification and order updates
- 💰 **Dynamic Offers** - Product, category, and subcategory level discounts

### Admin Features
- 📊 **Analytics Dashboard** - Real-time statistics and insights
- 👥 **Customer Management** - View, block/unblock users
- 📦 **Product Management** - Complete CRUD operations with image upload
- 🏷️ **Category Management** - Categories with unlimited subcategories
- 🏢 **Brand Management** - Add and manage product brands
- 🎨 **Product Variants** - Manage color, size, and price variations
- 💰 **Offer Management** - Create time-bound promotional offers
- 🖼️ **Image Processing** - Automatic image optimization and WebP conversion

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js (v16+)
- **Framework:** Express.js v5
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** Passport.js (Local + Google OAuth)
- **Session Store:** Express Session
- **Password Hashing:** bcrypt
- **Image Processing:** Sharp
- **Email Service:** Nodemailer

### Frontend
- **Template Engine:** EJS
- **Styling:** Custom CSS + Bootstrap
- **JavaScript:** Vanilla JS

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v6 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **npm** or **yarn** package manager
- **Gmail Account** (for email service with App Password enabled)
- **Google OAuth Credentials** (optional, for Google Sign-In)

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/lushme.git
cd lushme
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Configure the following environment variables in `.env`:

```properties
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/LushMe

# Session Secret (Generate a strong random string)
SESSION_SECRET=your_secure_session_secret_minimum_32_characters

# Email Configuration (Gmail)
NODEMAILER_EMAIL=your_email@gmail.com
NODEMAILER_PASSWORD=your_gmail_app_password

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### 4. Gmail App Password Setup

1. Go to your [Google Account](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification**
3. Scroll down to **App passwords**
4. Generate a new app password for "Mail"
5. Copy the 16-character password to `NODEMAILER_PASSWORD` in `.env`

### 5. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API**
4. Create **OAuth 2.0 Client ID** credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Secret to `.env`

### 6. Start MongoDB

**Windows:**
```bash
net start MongoDB
```

**macOS/Linux:**
```bash
sudo service mongod start
# or
brew services start mongodb-community
```

### 7. Run the Application

**Development Mode (with auto-restart):**
```bash
npm start
```

**Production Mode:**
```bash
npm run start:prod
```

### 8. Access the Application

- **User Frontend:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin
- **Login:** http://localhost:3000/login

### Default Admin Credentials
Create an admin user manually in MongoDB:
```javascript
db.users.insertOne({
  username: "admin",
  email: "admin@lushme.com",
  password: "$2b$10$... (bcrypt hash of your password)",
  isAdmin: 1,
  isBlocked: false,
  createdOn: new Date()
})
```

## 📁 Project Structure

```
lushme/
├── config/                 # Configuration files
│   ├── db.js              # MongoDB connection
│   └── passport.js        # Authentication strategies
├── controller/            # Request handlers
│   ├── admin/            # Admin controllers
│   │   ├── adminController.js
│   │   ├── productController.js
│   │   ├── categoryController.js
│   │   ├── brandController.js
│   │   └── customerController.js
│   └── user/             # User controllers
│       ├── userController.js
│       └── productController.js
├── middlewares/           # Custom middleware
│   ├── auth.js           # Authentication middleware
│   └── multer.js         # File upload configuration
├── models/               # Database schemas
│   ├── userSchema.js
│   ├── productSchema.js
│   ├── categorySchema.js
│   ├── brandSchema.js
│   ├── orderSchema.js
│   ├── cartSchema.js
│   └── wishlistSchema.js
├── routes/               # Route definitions
│   ├── userRouter.js
│   ├── adminRouter.js
│   └── authRoute.js
├── public/               # Static files
│   ├── css/             # Stylesheets
│   ├── images/          # Static images
│   └── uploads/         # User uploaded files
├── views/                # EJS templates
│   ├── admin/           # Admin views
│   ├── user/            # User views
│   └── partials/        # Reusable components
├── documentations/       # Project documentation
├── .env                  # Environment variables (create this)
├── .gitignore           # Git ignore rules
├── app.js               # Application entry point
└── package.json         # Dependencies and scripts
```

## 🔑 Key Features Explained

### Authentication System
- **Local Strategy:** Email and password with bcrypt hashing
- **Google OAuth:** Sign in with Google account
- **OTP Verification:** Email-based OTP for account verification
- **Session Management:** Secure session-based authentication

### Product Management
- **Image Optimization:** Automatic resize, compression, and WebP conversion
- **Variants System:** Support for multiple colors, sizes, and prices
- **Dynamic Pricing:** Calculate effective prices based on multiple offer types
- **Inventory Tracking:** Real-time stock management

### Offer System
The platform supports three types of offers with priority:
1. **Product Offers:** Direct discount on specific products
2. **Category Offers:** Discount on all products in a category
3. **Subcategory Offers:** Targeted discounts on subcategories

**Priority:** Highest offer is automatically applied to the product

## 🔒 Security Features

- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ Session-based authentication with secure cookies
- ✅ Input sanitization and validation
- ✅ Protection against NoSQL injection
- ✅ Secure file upload handling
- ✅ Environment variable protection
- ✅ CSRF protection ready

## 📚 API Endpoints

### Authentication
```
POST   /register              # Register new user
POST   /confirmotp            # Verify OTP
POST   /resend-otp            # Resend OTP
POST   /login                 # User login
GET    /logout                # Logout user
GET    /auth/google           # Google OAuth login
GET    /auth/google/callback  # Google OAuth callback
```

### Products
```
GET    /shop                  # Browse products
GET    /filter                # Filter products
GET    /productDetails        # Product details
```

### Admin
```
GET    /admin/dashboard       # Admin dashboard
GET    /admin/products        # Product list
POST   /admin/addProducts     # Add new product
POST   /admin/editProduct/:id # Update product
GET    /admin/blockProduct    # Block product
```

[See full API documentation](documentations/API_DOCUMENTATION.md)

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests with coverage
npm run test:coverage
```

## 📦 Deployment

### Using Docker

```bash
# Build image
docker build -t lushme:latest .

# Run container
docker run -p 3000:3000 --env-file .env lushme:latest
```

### Using Docker Compose

```bash
docker-compose up -d
```

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Ensure MongoDB is running
```bash
# Check MongoDB status
net start MongoDB  # Windows
sudo service mongod status  # Linux
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:** Change PORT in `.env` or kill the process using port 3000

### Email Not Sending
**Solution:** 
- Ensure Gmail App Password is correct
- Enable "Less secure app access" or use App Password
- Check firewall settings

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 To-Do / Roadmap

- [ ] Implement payment gateway (Stripe/Razorpay)
- [ ] Add product reviews and ratings
- [ ] Implement coupon system
- [ ] Add order invoice generation (PDF)
- [ ] Implement wishlist functionality
- [ ] Add advanced search with filters
- [ ] Implement product comparison feature
- [ ] Add multi-address support
- [ ] Email templates for orders
- [ ] Admin analytics and reports
- [ ] Unit and integration tests
- [ ] API rate limiting
- [ ] Redis caching layer

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)
- Email: your.email@example.com

## 🙏 Acknowledgments

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Passport.js Documentation](http://www.passportjs.org/)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact me via email
- Check the [documentation](documentations/) folder

---

**Built with ❤️ using Node.js and MongoDB**
