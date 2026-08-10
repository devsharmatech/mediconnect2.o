import dayjs from "dayjs";

export function buildInvoiceHtml(data) {
  const { invoice, seller, buyer, doctor, prescription, items, amounts } = data;

  const logoUrl = `https://placehold.co/200x60?text=${seller.pharmacy_name}`;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Invoice ${invoice.number}</title>

<style>
  @page { size: A4; margin: 10mm; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: #222;
    margin: 0;
    padding: 0;
  }

  .invoice-box {
    width: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }

  .logo img {
    height: 55px;
  }

  .invoice-title {
    text-align: right;
  }

  .invoice-title h1 {
    margin: 0;
    font-size: 22px;
    color: #0f172a;
  }

  .muted {
    font-size: 11px;
    color: #555;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }

  th, td {
    border: 1px solid #ddd;
    padding: 7px;
    vertical-align: top;
  }

  th {
    background: #f1f5f9;
    font-weight: bold;
    text-align: left;
  }

  .right {
    text-align: right;
  }

  .section-title {
    margin-top: 18px;
    font-weight: bold;
    font-size: 13px;
    color: #0f172a;
  }

  .no-border td {
    border: none;
    padding: 3px 0;
  }

  .totals td {
    font-size: 13px;
    font-weight: bold;
  }

  .grand-total {
    font-size: 16px;
    color: #065f46;
  }

  .footer {
    margin-top: 25px;
    border-top: 1px solid #ddd;
    padding-top: 8px;
    font-size: 10px;
    color: #555;
  }

  .signature {
    margin-top: 40px;
    text-align: right;
    font-size: 11px;
  }
</style>
</head>

<body>
<div class="invoice-box">

  <!-- HEADER -->
  <div class="header">
    <div class="logo">
      <img src="${logoUrl}" />
    </div>

    <div class="invoice-title">
      <h1>TAX INVOICE</h1>
      <div class="muted">
        Invoice No: <b style="text-transform: uppercase;">${invoice.number}</b><br/>
        Date: ${dayjs(invoice.date).format("DD MMM YYYY")}<br/>
        Order ID: ${invoice.order_unid}<br/>
        Payment Mode: ${invoice.payment_mode}
      </div>
    </div>
  </div>

  <!-- SELLER / BUYER -->
  <table>
    <tr>
      <td width="50%">
        <b>Seller (Chemist)</b><br/>
        ${seller.pharmacy_name}<br/>
        ${seller.address}<br/>
        Mobile: ${seller.mobile}<br/>
        GSTIN: ${seller.gstin || "N/A"}<br/>
        Reg No: ${seller.registration_no || "N/A"}
      </td>

      <td width="50%">
        <b>Buyer (Patient)</b><br/>
        ${buyer.name}<br/>
        ${buyer.address}<br/>
        Phone: ${buyer.phone}
      </td>
    </tr>
  </table>

  <!-- DOCTOR INFO -->
  ${
    doctor
      ? `
  <div class="section-title">Prescribing Doctor</div>
  <table class="no-border">
    <tr>
      <td>
        ${doctor.name} <br/>
        ${doctor.qualification || ""} <br/>
        ${doctor.specialization || ""} <br/>
        ${doctor.clinic_name || ""}
      </td>
    </tr>
  </table>
  `
      : ""
  }

  <!-- ITEMS -->
  <div class="section-title">Medicine Details</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Medicine</th>
        <th class="right">Qty</th>
        <th class="right">Unit Price</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.name}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">Rs ${item.unit_price}</td>
          <td class="right">Rs ${item.total}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <!-- TOTALS -->
  <table class="totals">
    <tr>
      <td class="right">Subtotal</td>
      <td class="right">Rs ${amounts.subtotal}</td>
    </tr>
    <tr>
      <td class="right">GST</td>
      <td class="right">Rs ${amounts.tax}</td>
    </tr>
    <tr>
      <td class="right grand-total">Grand Total</td>
      <td class="right grand-total">Rs ${amounts.grand_total}</td>
    </tr>
  </table>

  <!-- FOOTER -->
  <div class="signature">
    For <b>${seller.pharmacy_name}</b><br/><br/>
    Authorised Signatory
  </div>

  <div class="footer">
    This is a computer-generated invoice. No signature required.<br/>
    Generated via ${seller.pharmacy_name}.
  </div>

</div>
</body>
</html>
`;
}