const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const toDateText = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-IN');
};

const currency = (value) => `Rs ${toNumber(value).toFixed(2)}`;

function generatePDF(res, salesData, totalSale, totalAmount, totalDiscount, totalOffer) {
  const doc = new PDFDocument({ margin: 28, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
  doc.pipe(res);

  doc
    .fontSize(20)
    .fillColor('#333366')
    .text('Sales Report', { align: 'center' })
    .moveDown(1.5);

  const X = {
    sl: 28,
    orderId: 52,
    user: 145,
    date: 300,
    amount: 375,
    discount: 455,
    offer: 530,
    payment: 605
  };

  const drawHeader = () => {
    const y = doc.y;
    doc
      .fontSize(11)
      .fillColor('#000')
      .text('SL', X.sl, y)
      .text('Order ID', X.orderId, y)
      .text('Customer', X.user, y)
      .text('Date', X.date, y)
      .text('Amount', X.amount, y)
      .text('Discount', X.discount, y)
      .text('Offer', X.offer, y)
      .text('Payment', X.payment, y);

    doc.moveDown(0.4);
    doc.moveTo(28, doc.y).lineTo(810, doc.y).stroke();
  };

  drawHeader();
  let y = doc.y + 8;

  salesData.forEach((item, i) => {
    const payment =
      item.payment ??
      item.paymentMethod ??
      item.payment_mode ??
      item.payment_type ??
      item.paymentType ??
      '';

    doc
      .fontSize(9)
      .fillColor('#000')
      .text(String(i + 1), X.sl, y, { width: 18 })
      .text(toText(item.orderId).slice(0, 12), X.orderId, y, { width: 85, ellipsis: true })
      .text(toText(item.user, 'N/A'), X.user, y, { width: 145, ellipsis: true })
      .text(toDateText(item.date), X.date, y, { width: 65, ellipsis: true })
      .text(currency(item.totalAmount), X.amount, y, { width: 75, align: 'left' })
      .text(currency(item.discount), X.discount, y, { width: 65, align: 'left' })
      .text(currency(item.offer), X.offer, y, { width: 65, align: 'left' })
      .text(toText(payment).toUpperCase(), X.payment, y, { width: 80, ellipsis: true });

    y += 17;

    if (y > 560) {
      doc.addPage();
      drawHeader();
      y = doc.y + 8;
    }
  });

  y += 20;
  doc
    .fontSize(11)
    .fillColor('#000')
    .text(`Total Orders: ${toNumber(totalSale)}`, 28, y)
    .text(`Total Amount: ${currency(totalAmount)}`, 28, y + 18)
    .text(`Total Discount: ${currency(totalDiscount)}`, 28, y + 36)
    .text(`Total Offer: ${currency(totalOffer)}`, 28, y + 54);

  doc.end();
}

async function generateExcel(res, salesData, totalSale, totalAmount, totalDiscount, totalOffer) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  worksheet.columns = [
    { header: 'SL', key: 'sl', width: 6 },
    { header: 'Order ID', key: 'orderId', width: 22 },
    { header: 'User', key: 'user', width: 28 },
    { header: 'Date', key: 'date', width: 16 },
    { header: 'Amount', key: 'totalAmount', width: 15 },
    { header: 'Discount', key: 'discount', width: 15 },
    { header: 'Offer', key: 'offer', width: 15 },
    { header: 'Payment', key: 'payment', width: 16 }
  ];

  salesData.forEach((row, i) => {
    worksheet.addRow({
      sl: i + 1,
      orderId: toText(row.orderId),
      user: toText(row.user, 'N/A'),
      date: toText(row.date),
      totalAmount: toNumber(row.totalAmount),
      discount: toNumber(row.discount),
      offer: toNumber(row.offer),
      payment: toText(row.payment).toUpperCase()
    });
  });

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF333366' }
  };
  worksheet.getRow(1).alignment = { horizontal: 'center' };

  worksheet.getColumn('E').numFmt = '#,##0.00';
  worksheet.getColumn('F').numFmt = '#,##0.00';
  worksheet.getColumn('G').numFmt = '#,##0.00';

  worksheet.addRow([]);

  worksheet.addRow({
    sl: '',
    user: 'TOTALS:',
    totalAmount: toNumber(totalAmount),
    discount: toNumber(totalDiscount),
    offer: toNumber(totalOffer),
    payment: `ORDERS: ${toNumber(totalSale)}`
  });

  const lastRow = worksheet.lastRow;
  lastRow.font = { bold: true };
  lastRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = {
  generatePDF,
  generateExcel
};
