import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Generate and download a client-side PDF from an HTML element
 * @param {HTMLElement} element - The DOM element to convert to PDF
 * @param {string} filename - The output PDF file name
 */
export async function generateClientPdf(element, filename = "mediconnect-report.pdf") {
  if (!element) {
    throw new Error("Target element for PDF generation was not found");
  }

  // Ensure element is visible during render
  const originalDisplay = element.style.display;
  element.style.display = "block";

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution (2x DPI)
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 1024
    });

    const imgData = canvas.toDataURL("image/png");
    
    // A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;

    // Handle multi-page documents if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error("Client-side PDF generation error:", error);
    throw error;
  } finally {
    element.style.display = originalDisplay;
  }
}
