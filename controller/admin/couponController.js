
const User = require("../../models/userSchema");
const Coupon = require("../../models/couponSchema");
const cron = require('node-cron');

const COUPON_TYPES = new Set(["percentage", "fixed"]);
const COUPON_STATUSES = new Set(["Active", "Inactive"]);

const parseDateInput = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const validateCouponPayload = (payload, { requireFutureStart = false } = {}) => {
  const errors = [];

  const name = String(payload.name || "").trim().replace(/\s+/g, " ");
  const alnumCount = name.replace(/[^A-Za-z0-9]/g, "").length;
  if (name.length < 5 || alnumCount < 3) {
    errors.push("Coupon name must be at least 5 characters and contain at least 3 letters or numbers");
  }

  const code = String(payload.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{5,}$/.test(code)) {
    errors.push("Coupon code must be at least 5 alphanumeric characters");
  }

  const type = String(payload.type || "").trim().toLowerCase();
  if (!COUPON_TYPES.has(type)) {
    errors.push("Invalid coupon type");
  }

  const offerPrice = Number(payload.offerPrice);
  if (!Number.isFinite(offerPrice) || offerPrice <= 0) {
    errors.push("Discount value must be greater than 0");
  } else if (type === "percentage" && offerPrice > 100) {
    errors.push("Percentage discount cannot be greater than 100");
  }

  const minimumPrice = Number(payload.minimumPrice);
  if (!Number.isFinite(minimumPrice) || minimumPrice < 500) {
    errors.push("Minimum order amount must be at least 500");
  }
  
  // Validate fixed discount doesn't exceed minimum price
  if (type === "fixed" && Number.isFinite(offerPrice) && Number.isFinite(minimumPrice)) {
    if (offerPrice >= minimumPrice) {
      errors.push("Fixed discount must be less than minimum order amount");
    }
  }

  const usageLimit = Number(payload.usageLimit);
  if (!Number.isInteger(usageLimit) || usageLimit < 1) {
    errors.push("Usage limit must be an integer greater than or equal to 1");
  }

  const usagePerUser = Number(payload.usagePerUser);
  if (!Number.isInteger(usagePerUser) || usagePerUser < 1) {
    errors.push("Usage per user must be an integer greater than or equal to 1");
  } else if (Number.isInteger(usageLimit) && usagePerUser > usageLimit) {
    errors.push("Usage per user cannot be greater than total usage limit");
  }

  const startingDate = parseDateInput(payload.startingDate);
  if (!startingDate) {
    errors.push("Starting date is invalid");
  }

  const expiryDate = parseDateInput(payload.expiryDate);
  if (!expiryDate) {
    errors.push("Expiry date is invalid");
  }

  if (startingDate && expiryDate && expiryDate <= startingDate) {
    errors.push("Expiry date must be greater than starting date");
  }

  if (requireFutureStart && startingDate && startingDate < startOfToday()) {
    errors.push("Starting date must be today or later");
  }

  const status = String(payload.status || "Active").trim();
  if (!COUPON_STATUSES.has(status)) {
    errors.push("Invalid status");
  }

  return {
    errors,
    value: {
      name,
      code,
      type,
      offerPrice,
      minimumPrice,
      usageLimit,
      usagePerUser,
      startingDate,
      expiryDate,
      status,
    },
  };
};

cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();
    await Coupon.updateMany(
      { expiryDate: { $lt: now }, status: 'Active' },
      { $set: { status: 'Inactive' } }
    );
    console.log("Expired coupons marked as inactive");
  } catch (err) {
    console.error('Error updating expired coupons:', err);
  }
});


//load page
const loadCouponPage = async (req, res) => {
  try {
    const coupons = await Coupon.find({})
      .sort({ startingDate: -1 })
      .lean();

    const now = new Date();

    coupons.forEach(coupon => {
      coupon.startingDateFormatted = new Date(coupon.startingDate).toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      coupon.expiryDateFormatted = new Date(coupon.expiryDate).toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    });

    res.render('admin/coupon', {
      coupons,
      now
    });
  } catch (error) {
    console.error('Error while loading coupon page', error);
    res.redirect("/pageerror");
  }
};

//add coupon page
const loadAddCouponPage = async (req, res) => {
    try {
        res.render('admin/add-coupon')
    } catch (error) {
        console.error('Error while loading add coupon page', error)
        res.redirect('/admin/pageerror')
    }
}

//add coupon

const addCoupon = async (req, res) => {
    try {
      const { errors, value } = validateCouponPayload(req.body, { requireFutureStart: true });
      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: errors[0], errors });
      }

      if (await Coupon.findOne({ code: value.code })) {
        return res.status(400).json({ success: false, message: 'Coupon code already exists' });
      }

      const newCoupon = new Coupon(value);
  
      await newCoupon.save();
  
      res.status(200).json({ success: true, message: 'Coupon added successfully' });
    } catch (error) {
      console.error('Error while adding coupon', error);
  
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Duplicate coupon code or name exists' });
      }
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  //edit coupon page
  
const getEditPage =async (req,res)=>{
    try{
        const couponId = req.params.id 
        const coupon = await Coupon.findById(couponId)
        if(!coupon){
            return res.status(404).json({success: false, message: 'Coupon not found!'})
        }
        
        res.render('admin/edit-coupon',{coupon})

    }catch(error){
        console.error('Error while loading add coupon page', error)
        res.redirect('/admin/pageerror')

    }
}
//edit page
const editCoupon = async (req, res) => {
    try {
      const couponId = req.params.id;
      const { errors, value } = validateCouponPayload(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: errors[0], errors });
      }
  
      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found!' });
      }

      const existingCode = await Coupon.findOne({ code: value.code, _id: { $ne: couponId } });
      if (existingCode) {
        return res.status(400).json({ success: false, message: 'Coupon code already exists' });
      }

      coupon.name = value.name;
      coupon.code = value.code;
      coupon.type = value.type;
      coupon.offerPrice = value.offerPrice;
      coupon.minimumPrice = value.minimumPrice;
      coupon.usageLimit = value.usageLimit;
      coupon.usagePerUser = value.usagePerUser;
      coupon.startingDate = value.startingDate;
      coupon.expiryDate = value.expiryDate;
      coupon.status = value.status;
  
      await coupon.save();
  
      res.status(200).json({ success: true, message: 'Coupon edited successfully' });
  
    } catch (error) {
      console.error('Error while editing coupon', error);
  
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Duplicate coupon code or name exists' });
      }
  
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  //delete coupon
  const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.id 
        const coupon = await Coupon.findById(couponId)
        if(!coupon){
            return res.status(404).json({success: false, message: 'Coupon not found'})
        }
        
        // Check if coupon has been used
        if (coupon.usedCount > 0) {
            return res.status(400).json({
                success: false, 
                message: `Cannot delete coupon. It has been used ${coupon.usedCount} time(s). Consider marking it as Inactive instead.`
            })
        }

        await Coupon.deleteOne({_id: couponId})
        res.status(200).json({ success: true, message: 'Coupon deleted successfully'})
    } catch (error) {
        console.error('Error while deleting coupon', error)
        res.status(500).json({success: false, message: 'Internal server error'})
    }
}
  

module.exports={
    loadCouponPage,
    loadAddCouponPage,
    addCoupon,
    getEditPage,
    editCoupon,
    deleteCoupon
}
