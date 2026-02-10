const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const {generatePDF, generateExcel } = require('../../utils/makeReport')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const moment = require('moment')

const pageerror = async (req, res) => {
    try {
      let admin = null;
  
      if (req.session.admin) {
        admin = await User.findById(req.session.admin);
      }
  
      res.render('admin/pageerror', { admin });
    } catch (error) {
      console.error("Page Error:", error);
      res.status(500).send("Internal Server Error");
    }
  };

const loadLogin = (req, res) => {
  if (req.session.admin) return res.redirect("/admin/dashboard");
  res.render("admin/login", { message: null });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: 1 });

    if (!admin) return res.render("admin/login", { message: "Admin not found" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.render("admin/login", { message: "Incorrect password" });

    req.session.admin = admin._id;
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("Admin login error:", err);
    res.render("admin/login", { message: "Server error" });
  }
};


const loadDashboard = async (req, res) => {
    try {
      if (!req.session.admin) {
        return res.redirect("/admin/login");
      }
  
      // 🧩 Fetch the logged-in admin details
      const admin = await User.findById(req.session.admin);
  
      // 🧮 Example: Fetch simple statistics (replace with real data if needed)
      const totalUsers = await User.countDocuments({ isAdmin: 0 }); // count only normal users
      const totalAdmins = await User.countDocuments({ isAdmin: 1 });
  
      const stats = {
        users: totalUsers,
        admins: totalAdmins,
        // you can add more stats like totalOrders, totalProducts, etc.
      };
  
      // 👇 Now pass both admin and stats to the EJS file
      res.render("admin/dashboard", { admin, stats });
    } catch (error) {
      console.error("Dashboard load error:", error);
      res.redirect("admin/pageerror");
    }
  };

  const logout = async (req, res) => {
    try {
        if (req.session.admin) {
            delete req.session.admin; 
        }
        res.redirect('/admin/login'); 
    } catch (error) {
        console.log('Logout Error', error);
        res.redirect('admin/pageerror');
    }
};

const loadSalesPage = async (req, res) => {
  try {

      const page = req.query.page || 1
      const search = req.query.search || ''
      const limit = 10
      const skip = ( page - 1 ) * limit
      let {rangeType, startDate, endDate, format } = req.query
      
      // Set default values if not provided
      if (!rangeType) {
          rangeType = 'month'; // Default to current month
      }
      if (!startDate) {
          startDate = '';
      }
      if (!endDate) {
          endDate = '';
      }
      
      const matchedQuery = {status: {$in: ['Delivered', 'delivered']}}

      if(rangeType === 'custom' && startDate && endDate){
          matchedQuery.createdOn = {
              $gte: new Date(startDate),
              $lte: new Date(new Date(endDate).setHours(23,59,59,999))
          }
      }else if( rangeType === 'day'){
          const today = moment().startOf('day')
          matchedQuery.createdOn = {
             $lte: moment(today).endOf('day').toDate(), $gte: today.toDate()
              
          }
      }else if(rangeType === 'week'){
          matchedQuery.createdOn = {
              $gte: moment().startOf('week').toDate(),
              $lte: moment().endOf('week').toDate()
          }
      }else if(rangeType === 'month'){
          matchedQuery.createdOn = {
              $gte: moment().startOf('month').toDate(),
              $lte: moment().endOf('month').toDate()
          }
      }
      

      // ✅ Full orders for stats
    const allOrders = await Order.find(matchedQuery)
    .populate('userId')
    .populate('orderedItems.product')
    .sort({ createdOn: -1 });

  let totalSale = allOrders.length;
  let totalAmount = 0;
  let totalDiscount = 0;
  let totalOffer = 0;

  allOrders.forEach(order => {
    const orderTotal = order.finalAmount || 0;
    const discount = order.discount || 0;

    totalAmount += orderTotal;
    totalDiscount += discount;
    
    // Calculate offer based on order's original total vs final amount
    // Offer = (sum of item prices) - finalAmount - discount
    const itemsTotal = order.orderedItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    // Add delivery charge to get original total before discounts
    const deliveryCharge = order.deliveryCharge || 0;
    const offerAmount = (itemsTotal + deliveryCharge) - orderTotal - discount;
    
    if (offerAmount > 0) {
      totalOffer += offerAmount;
    }
  });

      
      
      let orderQuery = Order.find(matchedQuery)
            .populate('userId')
            .populate('orderedItems.product')
            .sort({createdOn: -1});


          if(!format){
          orderQuery = orderQuery.skip(skip).limit(limit)
      }
      const orders = await orderQuery
      // let totalSale = orders.length
      // let totalAmount = 0
      // let totalDiscount = 0
      // let totalOffer = 0

      const salesData = orders.map(order => {
           let orderTotal = order.finalAmount || 0
           let discount = order.discount || 0
           
           // Calculate offer for this order
           const itemsTotal = order.orderedItems.reduce((sum, item) => {
              return sum + (item.price * item.quantity);
           }, 0);
           
           const deliveryCharge = order.deliveryCharge || 0;
           const offerAmount = (itemsTotal + deliveryCharge) - orderTotal - discount;
           const offer = offerAmount > 0 ? offerAmount : 0;

          //  totalAmount += orderTotal
          //  totalDiscount += discount
          //  totalOffer += offer

           return {
              orderId: order.orderId,
              user: order.userId.name,
              date: moment(order.createdOn).format('YYYY-MM-DD'),
              totalAmount: orderTotal,
              discount: discount,
              payment: order.paymentMethod,
              offer: Math.round(offer)
           }
      })

      // download logic
      if(format === 'pdf'){
          return generatePDF(res, salesData, totalSale, totalAmount, totalDiscount, totalOffer)
      }else if(format === 'excel'){
          return generateExcel(res, salesData, totalSale, totalAmount, totalDiscount, totalOffer)
      }

      //pagination
      const count = await Order.find(matchedQuery).countDocuments()
      const totalPages = Math.ceil( count / limit )

      res.render('admin/salesReport',{
          salesData: salesData || [],
          totalSale: totalSale || 0,
          totalAmount: totalAmount || 0,
          totalDiscount: totalDiscount || 0,
          totalOffer: totalOffer || 0,
          currentPage: page,
          totalPages: totalPages || 1,
          search: search || '',
          rangeType: rangeType || 'month',
          startDate: startDate || '',
          endDate: endDate || ''
      })
  } catch (error) {
      console.error('Error while loading sales report page', error)
      res.redirect('/admin/pageerror')
  }
}



//Dashboard
const getDashboardData = async (req, res) => {
  try {
    const { filter, start, end } = req.query;
    const now = new Date();
    let fromDate = new Date(now);
    let toDate = new Date(now);

    // Set date range
    if (filter === 'custom' && start && end) {
      fromDate = new Date(start);
      toDate = new Date(end);
      toDate.setHours(23, 59, 59, 999);
    } else if (filter === 'monthly') {
      fromDate.setMonth(fromDate.getMonth() - 11);
      fromDate.setDate(1);
    } else if (filter === 'yearly') {
      fromDate.setFullYear(fromDate.getFullYear() - 4);
      fromDate.setMonth(0, 1);
    } else {
      // Default: Last 7 Days
      fromDate.setDate(now.getDate() - 6);
    }

    // Filter for all orders
    const baseMatch = {
      createdOn: { $gte: fromDate, $lte: toDate }
    };

    // Filter for sales chart (exclude cancelled/returned)
    const salesMatch = {
      ...baseMatch,
      status: { $nin: ['cancelled', 'returned'] }
    };

    // Group by date/month/year for sales chart
    let groupId = {};
    if (filter === 'yearly') {
      groupId = { year: { $year: '$createdOn' } };
    } else if (filter === 'monthly') {
      groupId = {
        year: { $year: '$createdOn' },
        month: { $month: '$createdOn' }
      };
    } else {
      // daily or last 7 days
      groupId = {
        year: { $year: '$createdOn' },
        month: { $month: '$createdOn' },
        day: { $dayOfMonth: '$createdOn' }
      };
    }

    const salesChart = await Order.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: groupId,
          totalSales: { $sum: '$finalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Pie chart: All order statuses (Delivered, Cancelled, Returned, etc.)
    const orderStatus = await Order.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Summary metrics
    const totalOrders = await Order.countDocuments(salesMatch);
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await User.countDocuments({ isAdmin: false });

    const revenueAgg = await Order.aggregate([
      { $match: salesMatch },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // Top 3 Products (by quantity)
    const bestProducts = await Order.aggregate([
      { $match: salesMatch },
      { $unwind: '$orderedItems' },
      {
        $group: {
          _id: '$orderedItems.product',
          totalQty: { $sum: '$orderedItems.quantity' }
        }
      },
      { $sort: { totalQty: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          totalQty: 1
        }
      }
    ]);

   const bestCategories = await Order.aggregate([
    { $match: { status: { $nin: ['cancelled', 'returned'] } } },
    { $unwind: "$orderedItems" },
    {
      $lookup: {
        from: "products",
        localField: "orderedItems.product",
        foreignField: "_id",
        as: "productInfo"
      }
    },
    { $unwind: "$productInfo" },
    {
      $lookup: {
        from: "categories",
        let: { subId: { $toObjectId: "$productInfo.subcategory" } }, 
        pipeline: [
          {
            $project: {
              subcategories: {
                $filter: {
                  input: "$subcategories",
                  as: "sub",
                  cond: { $eq: ["$$sub._id", "$$subId"] }
                }
              }
            }
          },
          { $unwind: "$subcategories" },
          {
            $project: {
              subcategoryName: "$subcategories.name"
            }
          }
        ],
        as: "subcategoryInfo"
      }
    },
    { $unwind: "$subcategoryInfo" },
    {
      $group: {
        _id: "$subcategoryInfo.subcategoryName",
        totalQty: { $sum: "$orderedItems.quantity" }
      }
    },
    {
      $project: {
        name: "$_id",
        totalQty: 1,
        _id: 0
      }
    },
    { $sort: { totalQty: -1 } },
    { $limit: 3 }
  ]);

    const bestBrands = await Order.aggregate([
        { 
          $match: { 
            status: { $nin: ['cancelled', 'returned'] } 
          } 
        },
        { $unwind: "$orderedItems" },
        {
          $lookup: {
            from: "products",
            localField: "orderedItems.product",
            foreignField: "_id",
            as: "productInfo"
          }
        },
        { $unwind: "$productInfo" },
        {
          $group: {
            _id: "$productInfo.brand", 
            totalQty: { $sum: "$orderedItems.quantity" }
          }
        },
        { $sort: { totalQty: -1 } },
        { $limit: 3 },
        {
          $lookup: {
            from: "brands",
            localField: "_id",
            foreignField: "_id",
            as: "brand"
          }
        },
        { $unwind: "$brand" },
        {
          $project: {
            name: "$brand.name",
            totalQty: 1,
          
            _id: 0
          }
        }
      ]);
      

    res.json({
      salesChart,
      orderStatus,
      totalOrders,
      totalProducts,
      totalCustomers,
      totalRevenue,
      bestProducts,
      bestCategories,
      bestBrands
    });

  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ error: 'Dashboard data fetch failed' });
  }
};



module.exports = { 
    loadLogin, 
    login, 
    loadDashboard,
    pageerror,
    logout,
    getDashboardData,
    loadSalesPage
};


