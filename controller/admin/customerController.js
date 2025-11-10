const User = require("../../models/userSchema");
//const Order = require("../../models/orderSchema");

const customerInfo = async (req, res) => {
    try {
        let search=''
        if(req.query.search){
            search = req.query.search
        }
        let page=1
        if(req.query.page){
            page = req.query.page
        }
        const limit = 3;
        const userData = await User.find({
            isAdmin:false,
             $or:[
                {username:{$regex:".*"+search+".*"}}, 
                {email:{$regex:".*"+search+".*"}},
             ]}
            )
             .sort({createdAt:-1, _id:1})
             .skip((page-1) * limit)
             .limit(limit)
             .exec();

             const count = await User.find({
                isAdmin:false,
             $or:[
                {username:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}},
             ]
             }).countDocuments();

            //  await Promise.all(userData.map(async (u) => {
            //     u.orderCount = await Order.countDocuments({ userId: u._id });
            //     }));

             res.render('admin/customers',{
                data:userData,
                totalPages:Math.ceil(count/limit),
                currentPage:page,
                search
             })
             console.log(userData);
        
    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}
const customerBlocked = async (req, res) => {
    try {
      const id = req.query.id
      await User.updateOne({ _id: id }, { $set: { isBlocked: true } })
      res.redirect("/admin/users")
    } catch (error) {
      res.redirect("/admin/pageerror")
    }
  }

const customerUnblocked = async (req,res) => {
    try {

        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/users")
        } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerUnblocked,
    }