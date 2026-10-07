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
