const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

// Get all orders with pagination and search
const getOrderList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';

        let query = {};
        
        if (search) {
            // Search by order ID, status, or user name
            const users = await User.find({
                name: { $regex: search, $options: 'i' }
            }).select('_id');
            
            const userIds = users.map(user => user._id);
            
            query = {
                $or: [
                    { orderId: { $regex: search, $options: 'i' } },
                    { status: { $regex: search, $options: 'i' } },
                    { paymentStatus: { $regex: search, $options: 'i' } },
                    { userId: { $in: userIds } }
                ]
            };
        }

        const orders = await Order.find(query)
            .populate('userId', 'name email phone')
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit);

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('admin/order-list', {
            orders,
            currentPage: page,
            totalPages,
            search,
            user: orders.map(order => order.userId)
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('admin/pageerror', { 
            message: 'Error loading orders' 
        });
    }
};

// Get order details
const getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findOne({ orderId })
            .populate('userId', 'name email phone')
            .populate('orderedItems.product');

        if (!order) {
            return res.status(404).render('admin/pageerror', { 
                message: 'Order not found' 
            });
        }

        // Enrich ordered items with product details
        const enrichedItems = order.orderedItems.map(item => {
            const product = item.product;
            const variant = product.variants && product.variants[item.variantIndex];
            
            console.log('DEBUG - Product:', product.name);
            console.log('DEBUG - Variant Index:', item.variantIndex);
            console.log('DEBUG - Variant:', variant);
            console.log('DEBUG - Product Image:', variant?.productImage);
            console.log('DEBUG - Color:', variant?.color);
            
            return {
                productName: product.name,
                productImage: variant?.productImage?.[0] || product.variants[0]?.productImage?.[0] || '',
                color: variant?.color || 'N/A',
                finalPrice: item.price,
                quantity: item.quantity,
                status: item.status || order.status,
                productId: product._id
            };
        });

        const orderData = {
            ...order.toObject(),
            orderedItems: enrichedItems,
            subTotal: order.totalPrice
        };

        res.render('admin/orderDetails', { order: orderData });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).render('admin/pageerror', { 
            message: 'Error loading order details' 
        });
    }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const validStatuses = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status' 
            });
        }

        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        order.status = status;
        await order.save();

        res.json({ 
            success: true, 
            message: 'Order status updated successfully' 
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating order status' 
        });
    }
};

// Update individual item status
const updateItemStatus = async (req, res) => {
    try {
        const { orderId, itemIndex } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned', 'return_requested'];
        
        if (!validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status' 
            });
        }

        const order = await Order.findOne({ orderId }).populate('orderedItems.product');
        
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        if (itemIndex >= order.orderedItems.length) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid item index' 
            });
        }

        // Map lowercase status to schema enum format (case-sensitive)
        const statusMap = {
            'pending': 'Pending',
            'confirmed': 'confirmed',
            'processing': 'processing',
            'shipped': 'Shipped',
            'delivered': 'Delivered',
            'cancelled': 'cancelled',
            'returned': 'Returned',
            'return_requested': 'return_requested'
        };

        const mappedStatus = statusMap[status.toLowerCase()];

        if (!mappedStatus) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status mapping' 
            });
        }

        // Update the specific item's status
        order.orderedItems[itemIndex].status = mappedStatus;

        // Update overall order status based on items
        const allStatuses = order.orderedItems.map(item => (item.status || order.status).toLowerCase());
        
        if (allStatuses.every(s => s === 'delivered')) {
            order.status = 'Delivered';
        } else if (allStatuses.every(s => s === 'cancelled')) {
            order.status = 'Cancelled';
        } else if (allStatuses.some(s => s === 'shipped')) {
            order.status = 'Shipped';
        } else if (allStatuses.some(s => s === 'confirmed')) {
            order.status = 'Pending'; // 'Confirmed' is not in order-level enum, keep as Pending
        }

        // Handle product stock updates and wallet refunds for cancellations
        const item = order.orderedItems[itemIndex];
        const product = item.product;
        
        if (status.toLowerCase() === 'cancelled') {
            // Calculate refund amount with proportional discount
            const itemTotal = item.price * item.quantity;
            let refundAmount = itemTotal;

            if (order.discount > 0 && order.totalPrice > 0) {
                const proportionalDiscount = (itemTotal / order.totalPrice) * order.discount;
                refundAmount -= proportionalDiscount;
                refundAmount = Math.round(refundAmount);
            }

            // WALLET REFUND for Razorpay and Wallet payments
            const paymentMethod = (order.paymentMethod || '').toLowerCase();
            if (paymentMethod === 'razorpay' || paymentMethod === 'wallet') {
                try {
                    const user = await User.findById(order.userId);
                    if (user) {
                        // Credit refund to user wallet
                        user.wallet = (user.wallet || 0) + refundAmount;
                        
                        if (!user.walletTransactions) {
                            user.walletTransactions = [];
                        }
                        
                        user.walletTransactions.push({
                            amount: refundAmount,
                            status: "credited",
                            method: 'refund',
                            description: `Refund for cancelled item in order ${order.orderId} (Admin cancelled)`,
                        });
                        
                        await user.save();
                        console.log(`✅ Admin cancelled - Refunded ₹${refundAmount} to user's wallet`);
                    }
                } catch (refundError) {
                    console.error('❌ Wallet refund failed:', refundError);
                    // Continue with cancellation even if refund fails, but log it
                }
            }

            // Restore product stock
            if (product.variants && product.variants[item.variantIndex]) {
                product.variants[item.variantIndex].quantity += item.quantity;
                await product.save();
                console.log('✅ Product stock restored');
            }
        }

        await order.save();

        res.json({ 
            success: true, 
            message: 'Item status updated successfully' 
        });
    } catch (error) {
        console.error('Error updating item status:', error);
        console.error('Error details:', error.message);
        if (error.name === 'ValidationError') {
            console.error('Validation errors:', error.errors);
        }
        res.status(500).json({ 
            success: false, 
            message: 'Error updating item status',
            error: error.message 
        });
    }
};

// Cancel order (admin)
const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findOne({ orderId }).populate('orderedItems.product');
        
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        if (order.status === 'Delivered' || order.status === 'Cancelled') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot cancel delivered or already cancelled order' 
            });
        }

        // Wallet refund for prepaid orders (Razorpay/Wallet)
        const paymentMethod = (order.paymentMethod || '').toLowerCase();
        if (paymentMethod === 'razorpay' || paymentMethod === 'wallet') {
            const user = await User.findById(order.userId);
            if (user) {
                const refundAmount = order.finalAmount;
                user.wallet = (user.wallet || 0) + refundAmount;
                
                if (!user.walletTransactions) {
                    user.walletTransactions = [];
                }
                
                user.walletTransactions.push({
                    amount: refundAmount,
                    status: "credited",
                    method: 'refund',
                    description: `Refund for cancelled order ${order.orderId} (Admin cancelled)`,
                });
                
                await user.save();
                console.log(`✅ Admin cancelled - Refunded ₹${refundAmount} to user ${user.email}`);
            }
        }

        // Restore product stock
        for (const item of order.orderedItems) {
            const product = item.product;
            if (product.variants && product.variants[item.variantIndex]) {
                product.variants[item.variantIndex].quantity += item.quantity;
                await product.save();
            }
        }

        order.status = 'Cancelled';
        order.cancellationReason = reason || 'Cancelled by admin';
        await order.save();

        res.json({ 
            success: true, 
            message: 'Order cancelled successfully and refund processed' 
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error cancelling order' 
        });
    }
};

// Handle return request
const handleReturnRequest = async (req, res) => {
    try {
        const { orderId, itemIndex } = req.params;
        const { action, adminNote, rejectionReason } = req.body; // action: 'approve' or 'reject'

        const order = await Order.findOne({ orderId }).populate('orderedItems.product');
        
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        if (itemIndex >= order.orderedItems.length) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid item index' 
            });
        }

        const item = order.orderedItems[itemIndex];
        
        if (item.status.toLowerCase() !== 'return_requested') {
            return res.status(400).json({ 
                success: false, 
                message: 'No return request for this item' 
            });
        }

        if (action === 'approve') {
            item.status = 'Returned'; // Match schema enum case
            item.returnRejected = false;
            item.returnRejectionReason = '';

            // Refund to wallet for prepaid orders (Razorpay / Wallet)
            const paymentMethod = (order.paymentMethod || '').toLowerCase();
            if (paymentMethod === 'razorpay' || paymentMethod === 'wallet') {
                const user = await User.findById(order.userId);
                if (user) {
                    const itemTotal = item.price * item.quantity;
                    const orderSubtotal = order.orderedItems.reduce((sum, orderItem) => {
                        return sum + ((orderItem.price || 0) * (orderItem.quantity || 0));
                    }, 0);
                    const totalDiscount = Number(order.couponDiscount || order.discount || 0);

                    let refundAmount = itemTotal;
                    if (totalDiscount > 0 && orderSubtotal > 0) {
                        const proportionalDiscount = (itemTotal / orderSubtotal) * totalDiscount;
                        refundAmount = Math.max(Math.round(itemTotal - proportionalDiscount), 0);
                    }

                    user.wallet = (user.wallet || 0) + refundAmount;
                    if (!user.walletTransactions) {
                        user.walletTransactions = [];
                    }
                    user.walletTransactions.push({
                        amount: refundAmount,
                        status: "credited",
                        method: "refund",
                        description: `Refund for returned item in order ${order.orderId} (Admin approved)`,
                    });
                    await user.save();
                    console.log(`✅ Return approved - Refunded ₹${refundAmount} to user's wallet`);
                }
            }
            
            // Restore product stock
            const product = item.product;
            if (product.variants && product.variants[item.variantIndex]) {
                product.variants[item.variantIndex].quantity += item.quantity;
                await product.save();
            }
        } else if (action === 'reject') {
            item.status = 'Delivered'; // Match schema enum case
            item.returnRejected = true;
            item.returnRejectionReason = rejectionReason || 'Return request rejected by admin';
        }

        if (adminNote) {
            item.adminNote = adminNote;
        }

        await order.save();

        res.json({ 
            success: true, 
            message: `Return request ${action}d successfully` 
        });
    } catch (error) {
        console.error('Error handling return request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing return request' 
        });
    }
};

// Approve user cancellation request (for Razorpay/Wallet orders)
const approveCancellation = async (req, res) => {
    try {
        const { orderId, itemIndex } = req.params;
        const { adminNote } = req.body;

        const order = await Order.findOne({ orderId }).populate('orderedItems.product');
        
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        if (itemIndex >= order.orderedItems.length) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid item index' 
            });
        }

        const item = order.orderedItems[itemIndex];
        
        if (item.status.toLowerCase() !== 'cancellation_requested') {
            return res.status(400).json({ 
                success: false, 
                message: 'No cancellation request pending for this item' 
            });
        }

        // Calculate refund amount with proportional discount
        const itemTotal = item.price * item.quantity;
        let refundAmount = itemTotal;

        if (order.discount > 0 && order.totalPrice > 0) {
            const proportionalDiscount = (itemTotal / order.totalPrice) * order.discount;
            refundAmount -= proportionalDiscount;
            refundAmount = Math.round(refundAmount);
        }

        // STEP 1: Process refund to user wallet FIRST
        const user = await User.findById(order.userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        try {
            user.wallet = (user.wallet || 0) + refundAmount;
            
            if (!user.walletTransactions) {
                user.walletTransactions = [];
            }
            
            user.walletTransactions.push({
                amount: refundAmount,
                status: "credited",
                method: 'refund',
                description: `Refund for cancelled item in order ${order.orderId} (Admin approved)`,
            });
            
            await user.save();
            console.log(`✅ Refund processed: ₹${refundAmount} credited to ${user.email}'s wallet`);
        } catch (refundError) {
            console.error('❌ Refund failed:', refundError);
            return res.status(500).json({ 
                success: false, 
                message: 'Refund processing failed. Please try again.' 
            });
        }

        // STEP 2: ONLY after successful refund, confirm cancellation
        item.status = 'cancelled';
        if (adminNote) {
            item.adminNote = adminNote;
        }

        // Restore product stock
        const product = item.product;
        if (product.variants && product.variants[item.variantIndex]) {
            product.variants[item.variantIndex].quantity += item.quantity;
            await product.save();
            console.log('✅ Product stock restored');
        }

        // Recalculate order totals
        let newTotal = 0;
        order.orderedItems.forEach(orderItem => {
            const status = (orderItem.status || '').toLowerCase();
            if (status !== "cancelled" && status !== "cancellation_requested") {
                newTotal += orderItem.price * orderItem.quantity;
            }
        });

        order.totalPrice = newTotal;
        const deliveryCharge = newTotal > 0 && newTotal < 500 ? 50 : 0;
        order.deliveryCharge = deliveryCharge;
        order.finalAmount = newTotal - order.discount + deliveryCharge;

        // Update overall order status if all items cancelled
        const allCancelled = order.orderedItems.every(p => {
            const s = (p.status || '').toLowerCase();
            return s === "cancelled";
        });
        if (allCancelled) {
            order.status = 'Cancelled';
        }

        await order.save();

        res.json({ 
            success: true, 
            message: `Cancellation approved. ₹${refundAmount} refunded to user's wallet.` 
        });
    } catch (error) {
        console.error('Error approving cancellation:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing cancellation approval' 
        });
    }
};

// Get order statistics for dashboard
const getOrderStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'Pending' });
        const deliveredOrders = await Order.countDocuments({ status: 'Delivered' });
        const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });
        
        const totalRevenue = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $group: { _id: null, total: { $sum: '$finalAmount' } } }
        ]);

        res.json({
            success: true,
            stats: {
                totalOrders,
                pendingOrders,
                deliveredOrders,
                cancelledOrders,
                totalRevenue: totalRevenue[0]?.total || 0
            }
        });
    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching statistics' 
        });
    }
};

module.exports = {
    getOrderList,
    getOrderDetails,
    updateOrderStatus,
    updateItemStatus,
    cancelOrder,
    handleReturnRequest,
    approveCancellation,
    getOrderStats
};
