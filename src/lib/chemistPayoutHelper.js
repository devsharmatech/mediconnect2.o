/**
 * Utility helper for Chemist / Pharmacy 90% Payout Routing & Destination Audit.
 * Rule:
 * 1. Check if Chemist has Bank Account added (bank_account_number & bank_ifsc_code).
 *    If YES -> Route payout to Bank Account.
 * 2. If NO Bank Account -> Fallback to Chemist's UPI ID.
 * 3. Save comprehensive audit details capturing destination, amounts, and settlement reference.
 */

export function resolveChemistPayoutDestination(chemist) {
  if (!chemist) {
    return {
      method: "UNKNOWN",
      status: "missing_chemist_profile",
      summary: "Chemist details not found",
      destination: {},
      isBank: false,
      isUpi: false,
    };
  }

  const bankAcc = (chemist.bank_account_number || "").trim();
  const ifsc = (chemist.bank_ifsc_code || "").trim();
  const hasValidBank = bankAcc.length >= 6 && ifsc.length >= 4;

  if (hasValidBank) {
    const maskedAcc = bankAcc.length > 4 ? `••••••••${bankAcc.slice(-4)}` : bankAcc;
    const bankName = (chemist.bank_name || "Commercial Bank").trim();
    const ifscUpper = ifsc.toUpperCase();
    const branch = (chemist.bank_branch || "").trim();
    const beneficiary = (chemist.owner_name || chemist.pharmacy_name || "Pharmacy Partner").trim();

    return {
      method: "BANK_ACCOUNT",
      status: "bank_configured",
      isBank: true,
      isUpi: false,
      summary: `Bank Transfer (${bankName} - A/C: ${maskedAcc}, IFSC: ${ifscUpper})`,
      destination: {
        method: "BANK_ACCOUNT",
        bank_name: bankName,
        account_number_masked: maskedAcc,
        account_number: bankAcc,
        ifsc_code: ifscUpper,
        bank_branch: branch || null,
        beneficiary_name: beneficiary,
      },
    };
  }

  // Fallback to UPI
  const upiId = (chemist.upi_id || "").trim();
  const hasValidUpi = upiId.length >= 3 && upiId.includes("@");

  if (hasValidUpi) {
    const beneficiary = (chemist.owner_name || chemist.pharmacy_name || "Pharmacy Partner").trim();
    return {
      method: "UPI",
      status: "upi_configured",
      isBank: false,
      isUpi: true,
      summary: `UPI Transfer (${upiId})`,
      destination: {
        method: "UPI",
        upi_id: upiId,
        beneficiary_name: beneficiary,
        qr_payload: chemist.payment_qr_payload || upiId,
        qr_url: chemist.payment_qr_url || null,
      },
    };
  }

  // Edge-case fallback
  return {
    method: "PENDING_DETAILS",
    status: "details_required",
    isBank: false,
    isUpi: false,
    summary: "Pending Payout Info (No Bank Account or UPI ID configured)",
    destination: {
      method: "PENDING_DETAILS",
      beneficiary_name: (chemist.owner_name || chemist.pharmacy_name || "Pharmacy Partner").trim(),
    },
  };
}
