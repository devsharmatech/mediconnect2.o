/**
 * Lab Pricing & Discount Calculation Engine
 * Business Rules:
 * - CT Scan (all types): 40% discount on MRP
 * - Ultrasound / USG (all types): 40% discount on MRP
 * - X-Ray (all types): 40% discount on MRP
 * - Echocardiography / Stress Echo: 30% discount on MRP
 * - Others: Standard MRP / Lab specified discount
 */

export function calculateLabTestPricing(item) {
  if (!item) return { mrp: 0, discountPercentage: 0, discountAmount: 0, offerPrice: 0, finalPrice: 0 };

  const mrp = parseFloat(item.mrp || item.price || 0) || 0;
  const dept = (item.department || item.category || "").toUpperCase();
  const name = (item.test_name || item.name || item.package_name || "").toUpperCase();

  let discountPercentage = 0;

  // Only apply discount if explicitly configured on the test item by lab
  if (item.discount_percentage !== undefined && item.discount_percentage !== null && !isNaN(parseFloat(item.discount_percentage))) {
    discountPercentage = parseFloat(item.discount_percentage);
  }

  const discountAmount = discountPercentage > 0 ? Math.round((mrp * discountPercentage) / 100) : 0;
  const offerPrice = Math.max(0, mrp - discountAmount);

  return {
    mrp,
    discountPercentage,
    discountAmount,
    offerPrice,
    finalPrice: offerPrice,
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
