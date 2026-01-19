const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");

const addressController = {

  // GET add / edit address page (profile + checkout)
  getAddressPage: async (req, res) => {
    try {
      const userId = req.user._id;
      const { addressId } = req.params;
      const { redirect } = req.query; // profile | checkout

      let address = null;

      // Edit case
      if (addressId) {
        const userAddresses = await Address.findOne({ userId });
        if (userAddresses) {
          address = userAddresses.address.id(addressId);
        }
      }

      // Decide redirect target
      const redirectTo =
        redirect === 'checkout'
          ? '/checkout'
          : '/profile';

      res.render('user/address', {
        address,
        redirectTo,
        user: req.user
      });

    } catch (err) {
      console.error(err);
      res.redirect('/pageNotFound');
    }
  },

  // POST add / edit address
  saveAddress: async (req, res) => {
    try {
      const userId = req.user._id;
      const {
        addressId,
        addressType,
        name,
        phone,
        altPhone,
        houseNo,
        landMark,
        city,
        state,
        pincode,
        redirectTo
      } = req.body;

      // EDIT
      if (addressId) {
        await Address.updateOne(
          { userId, 'address._id': addressId },
          {
            $set: {
              'address.$.addressType': addressType,
              'address.$.username': name,
              'address.$.phone': phone,
              'address.$.altPhone': altPhone || '',
              'address.$.houseNo': houseNo,
              'address.$.landMark': landMark,
              'address.$.city': city,
              'address.$.state': state,
              'address.$.pincode': pincode
            }
          }
        );
      }
      // ADD - new addresses go to the beginning (default)
      else {
        const newAddress = {
          addressType: addressType || 'Home',
          name,
          phone,
          altPhone: altPhone || '',
          houseNo,
          landMark,
          city,
          state,
          pincode
        };

        const existingAddress = await Address.findOne({ userId });
        
        if (existingAddress) {
          // Add new address at the beginning to make it default
          await Address.updateOne(
            { userId },
            { $push: { address: { $each: [newAddress], $position: 0 } } }
          );
        } else {
          // Create new address document
          await Address.create({
            userId,
            address: [newAddress]
          });
        }
      }

      // Redirect back
      res.redirect(redirectTo || '/profile');

    } catch (err) {
      console.error(err);
      res.redirect('/pageNotFound');
    }
  }

};

module.exports = addressController;
