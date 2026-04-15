# Coupon Discount Bug Fix

## Issue Description
When applying a coupon/offer on the checkout page, the entire order amount was being discounted instead of just the appropriate discount amount.

## Root Cause
The discount calculation for **flat/fixed coupons** had no upper limit. If a coupon's fixed discount value was equal to or greater than the order total, the entire amount would be discounted, resulting in a final amount of ₹0.

### Problem Code Example
```javascript
// BEFORE (Buggy)
if (coupon.type === 'flat') {
  discount = coupon.offerPrice;  // Could be equal to or exceed order total
}

// Final check was too lenient
discount = Math.min(discount, orderTotal);  // Still allows full discount
```

## Solution
Added a safety cap that **limits all discounts to a maximum of 95% of the order total**, ensuring customers always pay at least 5% of their order value.

### Fixed Code
```javascript
if (coupon.type === 'percentage') {
  discount = Math.floor(orderTotal * coupon.offerPrice / 100);
  if (coupon.maxDiscount) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
} else if (coupon.type === 'fixed') {
  discount = coupon.offerPrice;
}

// Safety cap - ensure discount never exceeds 95% of order total
discount = Math.min(discount, orderTotal * 0.95);
```

## Files Modified
1. **`controller/user/orderController.js`**
   - Fixed `applyCoupon()` function (line ~1117)
   - Fixed checkout page validation (line ~143)
   - Fixed `placeOrder()` function (line ~320)

2. **`controller/user/cartController.js`**
   - Fixed discount recalculation in cart (line ~445)

## Changes Made
- Changed coupon type check from `'flat'` to `'fixed'` for consistency
- Added 95% cap on all discount calculations to prevent full order discounts
- Applied the fix consistently across all coupon calculation points

## Testing
After deployment, verify that:
1. ✅ Percentage coupons apply correctly (e.g., 10% off = 10% discount)
2. ✅ Fixed coupons apply correctly (e.g., ₹100 off)
3. ✅ Order total never becomes ₹0 after discount
4. ✅ Minimum 5% of order amount is always payable
5. ✅ Discounts respect max discount caps if defined

## Example Scenarios

### Before Fix
- Order total: ₹1000
- Coupon: ₹1000 flat discount
- **Bug**: Final amount = ₹0 ❌

### After Fix
- Order total: ₹1000
- Coupon: ₹1000 flat discount
- **Fixed**: Max discount = ₹950 (95%)
- Final amount = ₹50 ✅

