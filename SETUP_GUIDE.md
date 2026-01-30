# Quick Setup Guide - Order Placement Fix

## Step 1: Install Dependencies (if not already installed)
```bash
npm install razorpay
```

## Step 2: Configure Environment Variables

Create or update your `.env` file with your Razorpay credentials:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here

# Session Configuration (if not already set)
SESSION_SECRET=your_session_secret_here

# Database and other configs...
```

### How to Get Razorpay Credentials:

1. Go to https://dashboard.razorpay.com/
2. Sign up or log in
3. Navigate to **Settings** → **API Keys**
4. Generate new keys or use existing ones
5. Copy **Key ID** and **Key Secret**

**For Testing:**
- Use **Test Mode** keys (they start with `rzp_test_`)
- Test card: `4111 1111 1111 1111`, any future expiry, any CVV

**For Production:**
- Complete KYC verification
- Use **Live Mode** keys (they start with `rzp_live_`)

## Step 3: Restart Your Server

```bash
npm start
```

## Step 4: Test the Order Flow

### Test COD Payment:
1. Navigate to `/checkout`
2. Select a delivery address
3. Select "Cash on Delivery"
4. Click "Place Order"
5. ✅ You should see a success dialog
6. ✅ Cart should be empty
7. ✅ Order should appear in your profile/orders

### Test Wallet Payment:
1. Ensure you have wallet balance (add money if needed)
2. Navigate to `/checkout`
3. Select a delivery address
4. Select "Wallet"
5. Click "Place Order"
6. ✅ Success dialog should appear
7. ✅ Wallet balance should be deducted
8. ✅ Cart should be empty

### Test Razorpay Payment:
1. Navigate to `/checkout`
2. Select a delivery address
3. Select "Razorpay"
4. Click "Place Order"
5. ✅ Razorpay modal should open
6. Enter test card: `4111 1111 1111 1111`
7. Enter any future expiry date
8. Enter any CVV
9. Click Pay
10. ✅ Success message should appear
11. ✅ Cart should be empty
12. ✅ Order should be created with "Processing" status

## Troubleshooting

### Problem: "razorpayInstance is not defined"
**Solution:** Check your `.env` file has RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET set correctly, then restart server.

### Problem: Nothing happens when clicking "Place Order"
**Solution:** 
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify jQuery and SweetAlert2 are loading
4. Check if button ID is `placeOrderBtn`

### Problem: Razorpay modal not opening
**Solution:**
1. Check if Razorpay script is loading: View page source and search for `checkout.razorpay.com`
2. Verify your Razorpay key is in Test Mode
3. Check browser console for errors

### Problem: Payment successful but cart not cleared
**Solution:**
1. Check `/verify-razorpay-payment` route exists in userRouter.js
2. Verify user session is active
3. Check server console for errors

### Problem: "Invalid signature" error
**Solution:**
1. Verify RAZORPAY_KEY_SECRET in .env matches your Razorpay dashboard
2. Ensure no extra spaces in the secret key
3. Restart server after changing .env

## What Changed?

### Files Modified:
1. ✅ `controller/user/orderController.js` - Fixed payment logic and added Razorpay
2. ✅ `views/user/checkout.ejs` - Fixed JavaScript event handlers and payment flow

### No Changes Needed:
- ✅ `routes/userRouter.js` - Routes already configured correctly
- ✅ `package.json` - Razorpay already installed

## Support

If you still face issues:
1. Check server console for error logs
2. Check browser console for JavaScript errors
3. Review `ORDER_PLACEMENT_FIX.md` for detailed documentation
4. Ensure all dependencies are installed: `npm install`
