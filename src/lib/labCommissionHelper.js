import sql from "@/lib/db";

/**
 * Commission Tiers Default Mapping:
 * - Category 1 (Cat 1): 50%
 * - Category 2 (Cat 2): 40%
 * - Category 3 (Cat 3): 30%
 * - Category 4 (Cat 4): 5%
 * - Package: 50%
 *
 * NOTE: These categories are strictly for internal admin/system commission calculations
 * and must NEVER be exposed as medical categories to patients or the public marketplace.
 */

export const DEFAULT_COMMISSION_RATES = {
  category_1: 50.0,
  category_2: 40.0,
  category_3: 30.0,
  category_4: 5.0,
  package: 50.0,
};

/**
 * Normalizes any category string into standard commission key.
 * e.g. "Category 1" -> "category_1", "Cat1" -> "category_1", "Package" -> "package"
 */
export function normalizeCategoryKey(category) {
  if (!category) return "category_1";
  const normalized = String(category).toLowerCase().trim();
  if (normalized.includes("1") || normalized.includes("cat1") || normalized.includes("cat 1")) return "category_1";
  if (normalized.includes("2") || normalized.includes("cat2") || normalized.includes("cat 2")) return "category_2";
  if (normalized.includes("3") || normalized.includes("cat3") || normalized.includes("cat 3")) return "category_3";
  if (normalized.includes("4") || normalized.includes("cat4") || normalized.includes("cat 4")) return "category_4";
  if (normalized.includes("package")) return "package";
  return "category_1";
}

/**
 * Fetches all commission settings from AWS RDS PostgreSQL.
 */
export async function getCommissionSettings() {
  try {
    const rows = await sql`
      SELECT id, category_key, category_label, commission_percentage::float, description, updated_at
      FROM lab_commission_settings
      ORDER BY id ASC;
    `;
    if (rows && rows.length > 0) {
      return rows;
    }
  } catch (err) {
    console.error("[Lab Commission] Error fetching commission settings:", err.message);
  }

  // Fallback defaults if table is empty or error
  return Object.entries(DEFAULT_COMMISSION_RATES).map(([key, pct], idx) => ({
    id: idx + 1,
    category_key: key,
    category_label: key.replace("_", " ").toUpperCase(),
    commission_percentage: pct,
    description: "Default fallback commission rate",
  }));
}

/**
 * Returns a key-value map of { category_key: percentage }
 */
export async function getCommissionRateMap() {
  const settings = await getCommissionSettings();
  const map = { ...DEFAULT_COMMISSION_RATES };
  settings.forEach((s) => {
    map[s.category_key] = parseFloat(s.commission_percentage);
  });
  return map;
}

/**
 * Calculates backend commission and lab payout.
 * @param {Object} params
 * @param {string} params.category - "Category 1", "Category 2", etc.
 * @param {number|string} params.mrp - Test MRP price
 * @param {number} [params.customPercentage] - Optional override percentage
 * @returns {Object} { mrp, commissionPercentage, adminCommissionAmount, labPayoutAmount }
 */
export async function calculateLabCommission({ category, mrp = 0, customPercentage = null }) {
  const numericMrp = parseFloat(mrp) || 0;
  let commissionPercentage = customPercentage;

  if (commissionPercentage === null || commissionPercentage === undefined) {
    const key = normalizeCategoryKey(category);
    const rateMap = await getCommissionRateMap();
    commissionPercentage = rateMap[key] ?? DEFAULT_COMMISSION_RATES[key] ?? 50.0;
  }

  const adminCommissionAmount = parseFloat(((numericMrp * commissionPercentage) / 100).toFixed(2));
  const labPayoutAmount = parseFloat((numericMrp - adminCommissionAmount).toFixed(2));

  return {
    mrp: numericMrp,
    commissionPercentage,
    adminCommissionAmount,
    labPayoutAmount,
  };
}

/**
 * Calculates Admin Lab Commission Revenue metrics for dashboard & analytics.
 * @param {Object} options
 * @param {string|null} options.startIso - Start timestamp ISO string
 * @param {string|null} options.endIso - End timestamp ISO string
 */
export async function getLabRevenueMetrics({ startIso = null, endIso = null } = {}) {
  try {
    const res = await sql`
      WITH item_categories AS (
        SELECT 
          oi.id as item_id,
          oi.order_id,
          oi.test_name,
          COALESCE(oi.price, 0)::numeric as item_price,
          COALESCE(
            c_by_id.name, 
            c_by_name.name,
            CASE 
              WHEN oi.test_name ILIKE '%package%' OR oi.test_name ILIKE '%checkup%' THEN 'All Test Packages'
              ELSE 'Category 1'
            END
          ) as category_name,
          COALESCE(
            c_by_id.commission_percentage,
            c_by_name.commission_percentage,
            50.00
          )::numeric as commission_percentage
        FROM lab_test_order_items oi
        LEFT JOIN lab_tests t_by_id ON oi.test_id = t_by_id.id
        LEFT JOIN lab_test_categories c_by_id ON t_by_id.category_id = c_by_id.id
        LEFT JOIN LATERAL (
          SELECT t2.category_id 
          FROM lab_tests t2 
          WHERE LOWER(TRIM(t2.test_name)) = LOWER(TRIM(oi.test_name))
             OR t2.test_name ILIKE ('%' || oi.test_name || '%')
             OR oi.test_name ILIKE ('%' || t2.test_name || '%')
          LIMIT 1
        ) t_by_name ON t_by_id.id IS NULL
        LEFT JOIN lab_test_categories c_by_name ON t_by_name.category_id = c_by_name.id
      ),
      order_commissions AS (
        SELECT 
          order_id,
          ROUND(SUM(item_price * commission_percentage / 100.0), 2) as order_admin_commission,
          ROUND(SUM(item_price - (item_price * commission_percentage / 100.0)), 2) as order_lab_items_share
        FROM item_categories
        GROUP BY order_id
      )
      SELECT 
        COUNT(o.id)::int as total_orders,
        COUNT(o.id) FILTER (WHERE o.visit_type = 'home_collection')::int as home_collection_count,
        COUNT(o.id) FILTER (WHERE o.visit_type = 'walk_in')::int as walk_in_count,
        COUNT(o.id) FILTER (WHERE o.payment_status = 'paid' OR o.status = 'completed')::int as paid_orders_count,
        COUNT(o.id) FILTER (WHERE o.payment_status = 'pending')::int as pending_orders_count,
        -- Paid Gross Volume
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'paid' OR o.status = 'completed'), 0)::numeric as paid_gross_volume,
        -- Paid Admin Commission (Realized Lab Revenue)
        COALESCE(SUM(oc.order_admin_commission) FILTER (WHERE o.payment_status = 'paid' OR o.status = 'completed'), 0)::numeric as paid_admin_commission,
        -- All Gross Volume (including pending)
        COALESCE(SUM(o.total_amount), 0)::numeric as all_gross_volume,
        -- All Admin Potential Commission
        COALESCE(SUM(oc.order_admin_commission), 0)::numeric as all_admin_commission
      FROM lab_test_orders o
      LEFT JOIN order_commissions oc ON o.id = oc.order_id
      WHERE 
        (${startIso}::timestamp with time zone IS NULL OR o.created_at >= ${startIso}::timestamp with time zone)
        AND (${endIso}::timestamp with time zone IS NULL OR o.created_at <= ${endIso}::timestamp with time zone);
    `;

    const row = res[0] || {};
    const paidGross = Number(row.paid_gross_volume || 0);
    const paidCommission = Number(row.paid_admin_commission || 0);
    const labPayouts = Math.max(0, parseFloat((paidGross - paidCommission).toFixed(2)));

    return {
      totalOrders: row.total_orders || 0,
      homeCollectionCount: row.home_collection_count || 0,
      walkInCount: row.walk_in_count || 0,
      paidOrdersCount: row.paid_orders_count || 0,
      pendingOrdersCount: row.pending_orders_count || 0,
      grossOrderVolume: paidGross,
      adminCommissionRevenue: paidCommission,
      labPayouts: labPayouts,
      allGrossVolume: Number(row.all_gross_volume || 0),
      allPotentialCommission: Number(row.all_admin_commission || 0),
    };
  } catch (err) {
    console.error("[Lab Commission] Error calculating revenue metrics:", err.message);
    return {
      totalOrders: 0,
      homeCollectionCount: 0,
      walkInCount: 0,
      paidOrdersCount: 0,
      pendingOrdersCount: 0,
      grossOrderVolume: 0,
      adminCommissionRevenue: 0,
      labPayouts: 0,
      allGrossVolume: 0,
      allPotentialCommission: 0,
    };
  }
}

