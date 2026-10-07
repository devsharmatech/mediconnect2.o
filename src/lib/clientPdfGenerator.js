import jsPDF from "jspdf";

/**
 * Dynamically resolves html2canvas-pro (with modern lab/oklch support) or falls back to html2canvas
 */
let cachedCanvasLib = null;
async function getHtml2Canvas() {
  if (cachedCanvasLib) return cachedCanvasLib;
  try {
    const mod = await import("html2canvas-pro");
    cachedCanvasLib = mod.default || mod;
    return cachedCanvasLib;
  } catch {
    const fallback = await import("html2canvas");
    cachedCanvasLib = fallback.default || fallback;
    return cachedCanvasLib;
  }
}

/**
 * Generate, download, or print a client-side high-resolution PDF from an HTML element
 * @param {HTMLElement} element - The DOM element to convert to PDF
 * @param {string} filename - The output PDF file name
 * @param {Object} options - Custom rendering options (e.g. action: 'download' | 'print')
 */
export async function generateClientPdf(element, filename = "MediConnect_Health_Report.pdf", options = {}) {
  if (!element) {
    throw new Error("Target element for PDF generation was not found");
  }

  // Preserve original display & positioning
  const originalDisplay = element.style.display;
  const originalVisibility = element.style.visibility;
  
  element.style.display = "block";
  element.style.visibility = "visible";

  try {
    const html2canvas = await getHtml2Canvas();

    const sanitizeClone = (clonedDoc) => {
      try {
        const styleNodes = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
        styleNodes.forEach((node) => node.remove());

        if (clonedDoc.documentElement) {
          clonedDoc.documentElement.removeAttribute("class");
        }

        const clonedReport = clonedDoc.querySelector('#assessment-print-report') ||
                             clonedDoc.querySelector('[data-print-report="true"]');

        if (clonedReport) {
          clonedReport.style.position = "static";
          clonedReport.style.left = "0";
          clonedReport.style.top = "0";
          clonedReport.style.display = "block";
          clonedReport.style.visibility = "visible";
          clonedReport.style.margin = "0";
        }
      } catch (err) {
        console.warn("Notice: stylesheet sanitization in canvas clone skipped:", err);
      }
    };

    // Standard ISO A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Check if the report has explicit multi-page containers
    const pageNodes = Array.from(element.querySelectorAll('[data-report-page="true"]'));

    if (pageNodes.length > 1) {
      // High-precision per-page rendering: each page rendered individually to its own A4 page
      for (let i = 0; i < pageNodes.length; i++) {
        if (i > 0) pdf.addPage();
        const pageCanvas = await html2canvas(pageNodes[i], {
          scale: options.scale || 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: options.windowWidth || 850,
          imageTimeout: 15000,
          onclone: sanitizeClone,
          ...options.html2canvas
        });

        const pImgData = pageCanvas.toDataURL("image/png");
        const pImgHeight = (pageCanvas.height * pdfWidth) / pageCanvas.width;
        const scaleFactor = Math.min(1, (pdfHeight - 4) / pImgHeight);
        const fittedW = pdfWidth * scaleFactor;
        const fittedH = pImgHeight * scaleFactor;
        const xOffset = (pdfWidth - fittedW) / 2;
        pdf.addImage(pImgData, "PNG", xOffset, 2, fittedW, fittedH, undefined, "FAST");
      }
    } else {
      // Single canvas flow
      const canvas = await html2canvas(element, {
        scale: options.scale || 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: options.windowWidth || 850,
        imageTimeout: 15000,
        onclone: sanitizeClone,
        ...options.html2canvas
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      if (imgHeight <= pdfHeight * 1.15) {
        const scaleFactor = (pdfHeight - 4) / Math.max(imgHeight, pdfHeight);
        const fittedWidth = imgWidth * scaleFactor;
        const fittedHeight = imgHeight * scaleFactor;
        const xOffset = (pdfWidth - fittedWidth) / 2;
        pdf.addImage(imgData, "PNG", xOffset, 2, fittedWidth, fittedHeight, undefined, "FAST");
      } else {
        let heightLeft = imgHeight;
        let page = 0;
        while (heightLeft > 3) {
          if (page > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, -(page * pdfHeight), imgWidth, imgHeight, undefined, "FAST");
          heightLeft -= pdfHeight;
          page++;
        }
      }
    }

    if (options.action === "print") {
      pdf.autoPrint();
      const blobUrl = pdf.output("bloburl");
      let printWindow = null;
      try {
        printWindow = window.open(blobUrl, "_blank");
      } catch (e) {
        console.warn("window.open blocked, falling back to iframe print", e);
      }

      if (!printWindow || printWindow.closed || typeof printWindow.closed === "undefined") {
        // Fallback: use an invisible iframe to trigger the native browser print dialog
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (err) {
              console.warn("Iframe print invocation failed", err);
            }
          }, 300);
        };
      }
      return { success: true, printed: true };
    }

    pdf.save(filename);
    return { success: true, filename };
  } catch (error) {
    console.error("Client-side PDF generation error:", error);
    throw error;
  } finally {
    element.style.display = originalDisplay;
    element.style.visibility = originalVisibility;
  }
}

/**
 * Convenience helper to render and directly print the report using browser print
 */
export async function printClientReport(element, options = {}) {
  return generateClientPdf(element, "MediConnect_Health_Report.pdf", { ...options, action: "print" });
}
