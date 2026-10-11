import jsPDF from "jspdf";
import { MEDICONNECT_LOGO_BASE64, DOCTOR_CADUCEUS_BASE64 } from "./prescriptionAssets.js";

/**
 * Dynamically loads html2canvas-pro (with support for modern CSS colors/properties)
 * or falls back to html2canvas.
 */
let cachedCanvasLib = null;
async function getCanvasLib() {
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
 * Pre-processes an image to ensure it is a base64 Data URI so html2canvas
 * can render it instantly without CORS or network failure.
 */
async function toBase64DataUrl(src) {
  if (!src || src.startsWith("data:")) return src;
  if (src.includes("real-logo.png") || src.includes("logo.png")) {
    return MEDICONNECT_LOGO_BASE64;
  }
  if (src.includes("dr.png")) {
    return DOCTOR_CADUCEUS_BASE64;
  }

  // 1. Try fetching via proxy or direct to convert cleanly to Data URL (bypassing CORS canvas tainting)
  try {
    const fetchUrl = src.startsWith("http")
      ? `/api/common/image-proxy?url=${encodeURIComponent(src)}`
      : src;
    const res = await fetch(fetchUrl);
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (dataUrl && typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
        return dataUrl;
      }
    }
  } catch {
    // Continue to canvas fallback
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 100;
          canvas.height = img.naturalHeight || img.height || 100;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    } catch {
      resolve(src);
    }
  });
}

/**
 * Normalizes all images inside a DOM element to guaranteed Base64 Data URLs
 */
async function prepareElementImages(el) {
  if (!el) return;
  const images = Array.from(el.querySelectorAll("img"));
  await Promise.all(
    images.map(async (img) => {
      const currentSrc = img.getAttribute("src") || "";
      const isLogo = currentSrc.includes("real-logo.png") || img.alt?.includes("Logo") || img.alt === "Hospital Logo";
      const isDr = currentSrc.includes("dr.png") || img.alt?.includes("Doctor Icon") || img.alt === "dr";

      if (isLogo) {
        img.src = MEDICONNECT_LOGO_BASE64;
        img.style.width = "56px";
        img.style.height = "56px";
        img.style.maxWidth = "56px";
        img.style.maxHeight = "56px";
        img.style.objectFit = "contain";
        img.width = 56;
        img.height = 56;
      } else if (isDr) {
        img.src = DOCTOR_CADUCEUS_BASE64;
        img.style.width = "56px";
        img.style.height = "56px";
        img.style.maxWidth = "56px";
        img.style.maxHeight = "56px";
        img.style.objectFit = "contain";
        img.width = 56;
        img.height = 56;
      } else if (!currentSrc.startsWith("data:") && currentSrc) {
        const b64 = await toBase64DataUrl(currentSrc);
        if (b64 && b64.startsWith("data:")) {
          img.src = b64;
        }
      }
    })
  );
}

/**
 * Renders the printable prescription DOM element onto a high-resolution HTML Canvas
 */
export async function renderPrescriptionToCanvas(element) {
  if (!element) {
    throw new Error("Target prescription element was not found.");
  }

  // Pre-load images inside element to Base64
  await prepareElementImages(element);

  const html2canvas = await getCanvasLib();

  const canvas = await html2canvas(element, {
    scale: 2.2, // Retina resolution (~300 DPI) for crisp text & borders
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
    imageTimeout: 15000,
    windowWidth: 794,
    onclone: (clonedDoc) => {
      // 1. Strip any outer border, shadow, and rounded corners from the printable element
      const printArea =
        clonedDoc.getElementById("rx-preview-print-area") ||
        clonedDoc.getElementById("rx-print-area");
      if (printArea) {
        printArea.style.setProperty("border", "none", "important");
        printArea.style.setProperty("box-shadow", "none", "important");
        printArea.style.setProperty("border-radius", "0px", "important");
        printArea.style.setProperty("margin", "0", "important");
        printArea.style.setProperty("outline", "none", "important");
        printArea.style.setProperty("width", "794px", "important");
        printArea.style.setProperty("min-width", "794px", "important");
        printArea.style.setProperty("max-width", "794px", "important");
        printArea.classList.remove(
          "shadow-lg", "shadow-xl", "shadow-2xl", "shadow-md", "shadow-sm", "shadow", "shadow-xs",
          "border", "border-slate-200/90", "border-slate-200", "border-gray-200",
          "rounded-lg", "rounded-xl", "rounded-md", "rounded-2xl", "rounded-none", "rounded"
        );
      }

      // 2. Ensure all images in clone have absolute base64 sources and strict sizing
      const clonedImages = clonedDoc.querySelectorAll("img");
      clonedImages.forEach((img) => {
        const src = img.getAttribute("src") || "";
        const isLogo = src.includes("real-logo.png") || img.alt?.includes("Logo");
        const isDr = src.includes("dr.png") || img.alt?.includes("Doctor Icon") || img.alt === "dr";
        if (isLogo) {
          img.src = MEDICONNECT_LOGO_BASE64;
          img.style.width = "60px";
          img.style.height = "60px";
          img.style.maxWidth = "60px";
          img.style.maxHeight = "60px";
          img.style.objectFit = "contain";
          img.width = 60;
          img.height = 60;
        } else if (isDr) {
          img.src = DOCTOR_CADUCEUS_BASE64;
          img.style.width = "60px";
          img.style.height = "60px";
          img.style.maxWidth = "60px";
          img.style.maxHeight = "60px";
          img.style.objectFit = "contain";
          img.width = 60;
          img.height = 60;
        }
      });
    },
  });

  return canvas;
}

/**
 * Builds a professional jsPDF document from the rendered canvas
 */
export async function createPrescriptionJsPdf(element) {
  const canvas = await renderPrescriptionToCanvas(element);
  const imgData = canvas.toDataURL("image/png", 1.0);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pdfWidth = 210;
  const pdfHeight = 297;
  // Natural full-bleed A4 layout (element internal padding creates the natural print margins, eliminating box-in-box double borders)
  const contentWidth = pdfWidth; // 210 mm
  const contentHeight = (canvas.height * contentWidth) / canvas.width;

  // Single page fit (prescriptions comfortably scale slightly to fit on 1 single standard A4 page)
  const maxSinglePageHeight = pdfHeight * 1.25;
  if (contentHeight <= maxSinglePageHeight) {
    // Fits on a single page! Scale cleanly to fit printable area
    const scaleFactor = Math.min(1, pdfHeight / contentHeight);
    const fittedW = contentWidth * scaleFactor;
    const fittedH = contentHeight * scaleFactor;
    const xOffset = (pdfWidth - fittedW) / 2;
    pdf.addImage(imgData, "PNG", xOffset, 0, fittedW, fittedH, undefined, "FAST");
  } else {
    // Multi-page handling for very extensive prescriptions
    let heightLeft = contentHeight;
    let page = 0;
    while (heightLeft > 5) {
      if (page > 0) pdf.addPage("a4", "p");
      const yOffset = -page * pdfHeight;
      pdf.addImage(imgData, "PNG", 0, yOffset, contentWidth, contentHeight, undefined, "FAST");
      heightLeft -= pdfHeight;
      page++;
    }
  }

  return pdf;
}

/**
 * Downloads the prescription directly as a PDF file and opens it in a new tab without window.print()
 */
export async function exportPrescriptionPdf(element, filename = "Prescription.pdf", shouldOpen = true) {
  const pdf = await createPrescriptionJsPdf(element);
  
  // 1. Direct download to user's device
  pdf.save(filename);

  // 2. Open clean PDF document in a tab for instant viewing (no annoying window.print() popup)
  let blobUrl = null;
  if (shouldOpen) {
    try {
      blobUrl = pdf.output("bloburl");
      window.open(blobUrl, "_blank");
    } catch (e) {
      console.warn("Could not open PDF in new tab, file downloaded directly", e);
    }
  }

  return { success: true, filename, blobUrl };
}

/**
 * Direct PDF download and viewer (replaces browser window.print with direct PDF generation)
 */
export async function printPrescriptionPdf(element, title = "Medical Prescription") {
  const filename = `${title.replace(/\s+/g, "_")}.pdf`;
  return exportPrescriptionPdf(element, filename, true);
}

