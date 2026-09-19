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
export async function generateClientPdf(element, filename = "mediconnect-report.pdf", options = {}) {
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

    // High-resolution canvas rendering with Tailwind v4 lab/oklch color immunity
    const canvas = await html2canvas(element, {
      scale: options.scale || 2, // 2x DPI for crisp medical typography
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: options.windowWidth || 850,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        try {
          // Tailwind v4 global stylesheets inject modern lab() and oklch() color functions
          // which cause standard html2canvas parsers to throw "unsupported color function lab".
          // AssessmentPrintReport is 100% styled via inline CSS attributes and does not need
          // global stylesheets. Removing external/injected style tags in the cloned frame
          // prevents color parser crashes while preserving identical report rendering.
          const styleNodes = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          styleNodes.forEach((node) => node.remove());

          if (clonedDoc.documentElement) {
            clonedDoc.documentElement.removeAttribute("class");
          }

          // Locate the cloned report element and reset positioning to origin for clean canvas rendering
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
      },
      ...options.html2canvas
    });

    const imgData = canvas.toDataURL("image/png");
    
    // Standard ISO A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Scale image to fit A4 width
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // If document is near single-page height (within 15% of A4), auto-fit to 1 page so footer is never clipped or sliced
    if (imgHeight <= pdfHeight * 1.15) {
      const scaleFactor = (pdfHeight - 4) / Math.max(imgHeight, pdfHeight);
      const fittedWidth = imgWidth * scaleFactor;
      const fittedHeight = imgHeight * scaleFactor;
      const xOffset = (pdfWidth - fittedWidth) / 2;
      pdf.addImage(imgData, "PNG", xOffset, 2, fittedWidth, fittedHeight, undefined, "FAST");
    } else {
      // True multi-page handling with proper page offsets
      let heightLeft = imgHeight;
      let page = 0;
      while (heightLeft > 3) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -(page * pdfHeight), imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
        page++;
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
  return generateClientPdf(element, "mediconnect-report.pdf", { ...options, action: "print" });
}
