function getEffectiveOffer(product, category, subcategory) {
    const productOffer     = product.productOffer    || 0; // fix field name here once
    const categoryOffer    = category?.categoryOffer  || 0;
    const subcategoryOffer = subcategory?.offer       || 0;
  
    return Math.max(productOffer, categoryOffer, subcategoryOffer);
  }
  
  function applyOffer(price, offerPercent) {
    return Math.round(price * (1 - offerPercent / 100));
  }
  
  module.exports = { getEffectiveOffer, applyOffer };