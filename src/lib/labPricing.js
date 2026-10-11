/**
 * Lab Pricing Engine
 * 
 * NOTE: Category percentages (e.g., 40% for Ultrasound, CT Scan, X-Ray) are strictly 
 * internal admin/system commission rates used for auditing and lab payouts (see labCommissionHelper.js).
 * They are NOT patient discounts or offer prices.
 * Patients pay the standard test catalog price / MRP.
 */

export function calculateLabTestPricing(item) {
  if (!item) return { mrp: 0, discountPercentage: 0, discountAmount: 0, offerPrice: 0, finalPrice: 0 };

  const mrp = parseFloat(item.price || item.mrp || 0) || 0;

  return {
    mrp,
    discountPercentage: 0,
    discountAmount: 0,
    offerPrice: mrp,
    finalPrice: mrp,
  };
}

export function calculateOrderTotals(items = []) {
  let totalMrp = 0;
  let totalDiscount = 0;
  let finalAmount = 0;

  const processedItems = items.map(item => {
    const pricing = calculateLabTestPricing(item);
    totalMrp += pricing.mrp;
    totalDiscount += pricing.discountAmount;
    finalAmount += pricing.finalPrice;
    return {
      ...item,
      pricing,
    };
  });

  return {
    items: processedItems,
    totalMrp,
    totalDiscount,
    finalAmount,
  };
}

