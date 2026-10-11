"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaSearchPlus,
  FaSearchMinus,
  FaRedo,
  FaPrint,
  FaDownload,
  FaThLarge,
  FaExpand,
  FaSpinner,
  FaExclamationTriangle,
  FaFilePdf,
} from "react-icons/fa";

export default function PdfJsViewer({
  url,
  fileName = "Medical_Report.pdf",
  className = "",
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.15);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [pageInput, setPageInput] = useState("1");
  const [thumbnails, setThumbnails] = useState({});

  // 1. Ensure PDF.js engine is initialized
  const loadPdfJs = useCallback(async () => {
    if (typeof window === "undefined") return null;

    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      return window.pdfjsLib;
    }

    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src="/pdf.min.js"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
            resolve(window.pdfjsLib);
          } else {
            reject(new Error("pdfjsLib not available after script load"));
          }
        });
        existingScript.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.src = "/pdf.min.js";
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
          resolve(window.pdfjsLib);
        } else {
          reject(new Error("pdfjsLib failed to initialize"));
        }
      };
      script.onerror = () => reject(new Error("Failed to load PDF.js engine"));
      document.body.appendChild(script);
    });
  }, []);

  // 2. Fetch and load the PDF document
  useEffect(() => {
    let isCancelled = false;

    if (!url) {
      setError("No document URL provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setCurrentPage(1);
    setPageInput("1");
    setThumbnails({});

    async function loadDocument() {
      try {
        const pdfjs = await loadPdfJs();
        if (!pdfjs || isCancelled) return;

        let loadingTask;
        try {
          loadingTask = pdfjs.getDocument({
            url,
            cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
            cMapPacked: true,
          });
          const doc = await loadingTask.promise;
          if (!isCancelled) {
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setLoading(false);
            if (typeof window !== "undefined" && window.innerWidth < 640) {
              doc.getPage(1).then((p) => {
                const vp = p.getViewport({ scale: 1.0 });
                const avail = Math.max(260, window.innerWidth - 20);
                const fit = +(avail / vp.width).toFixed(2);
                setScale(Math.max(0.45, Math.min(1.2, fit)));
              }).catch(() => {});
            }
          }
        } catch (initialErr) {
          // If direct load failed (CORS), retry through proxy
          console.warn("Direct PDF load failed, falling back to internal proxy:", initialErr);
          const proxyUrl = `/api/common/image-proxy?url=${encodeURIComponent(url)}`;
          loadingTask = pdfjs.getDocument({
            url: proxyUrl,
            cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
            cMapPacked: true,
          });
          const doc = await loadingTask.promise;
          if (!isCancelled) {
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setLoading(false);
            if (typeof window !== "undefined" && window.innerWidth < 640) {
              doc.getPage(1).then((p) => {
                const vp = p.getViewport({ scale: 1.0 });
                const avail = Math.max(260, window.innerWidth - 20);
                const fit = +(avail / vp.width).toFixed(2);
                setScale(Math.max(0.45, Math.min(1.2, fit)));
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("PDF.js loading error:", err);
          setError(err.message || "Failed to load PDF document");
          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [url, loadPdfJs]);

  // 3. Render the current page onto the canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    setRendering(true);

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {
        // ignore
      }
      renderTaskRef.current = null;
    }

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale, rotation });

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: ctx,
          viewport,
          transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : null,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!isCancelled) {
          setRendering(false);
        }
      } catch (err) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("PDF.js render error:", err);
        }
        if (!isCancelled) {
          setRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [pdfDoc, currentPage, scale, rotation]);

  // 4. Generate thumbnail for page preview
  const renderThumbnail = useCallback(
    async (pageNum) => {
      if (!pdfDoc || thumbnails[pageNum]) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.22 });
        const thumbCanvas = document.createElement("canvas");
        thumbCanvas.width = viewport.width;
        thumbCanvas.height = viewport.height;
        const ctx = thumbCanvas.getContext("2d");

        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = thumbCanvas.toDataURL("image/jpeg", 0.75);

        setThumbnails((prev) => ({ ...prev, [pageNum]: dataUrl }));
      } catch (err) {
        console.warn("Failed to render thumbnail for page", pageNum, err);
      }
    },
    [pdfDoc, thumbnails]
  );

  useEffect(() => {
    if (showThumbnails && pdfDoc && numPages > 0) {
      for (let i = 1; i <= Math.min(numPages, 12); i++) {
        renderThumbnail(i);
      }
    }
  }, [showThumbnails, pdfDoc, numPages, renderThumbnail]);

  // Page Navigation Handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      const p = currentPage - 1;
      setCurrentPage(p);
      setPageInput(String(p));
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const p = currentPage + 1;
      setCurrentPage(p);
      setPageInput(String(p));
    }
  };

  const handlePageInputCommit = (e) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
      setCurrentPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Zoom Handlers
  const handleZoomIn = () => setScale((s) => Math.min(2.8, +(s + 0.15).toFixed(2)));
  const handleZoomOut = () => setScale((s) => Math.max(0.55, +(s - 0.15).toFixed(2)));
  const handleFitWidth = () => {
    if (!containerRef.current || !pdfDoc) return;
    const availableWidth = containerRef.current.clientWidth - (showThumbnails ? 200 : 64);
    pdfDoc.getPage(currentPage).then((page) => {
      const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
      const fitScale = +(availableWidth / unscaledViewport.width).toFixed(2);
      setScale(Math.max(0.65, Math.min(2.2, fitScale)));
    });
  };

  // Rotate Handler
  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  // Print Handler
  const handlePrint = () => {
    if (typeof window === "undefined" || !url) return;
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.focus();
      printWindow.onload = () => {
        try {
          printWindow.print();
        } catch (e) {
          // ignore
        }
      };
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col bg-slate-100 select-none overflow-hidden relative ${className}`}
    >
      {/* Medical-Grade PDF Toolbar (Light & Clean) */}
      <div className="bg-slate-50 border-b border-slate-200/90 px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between gap-1 sm:gap-2 shrink-0 text-slate-700 z-20 shadow-2xs overflow-x-auto">
        {/* Left: Thumbnails Toggle & Page Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {numPages > 1 && (
            <button
              type="button"
              onClick={() => setShowThumbnails((v) => !v)}
              className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-xs hover:shadow-sm ${
                showThumbnails
                  ? "bg-[#0067A1] text-white border-[#0067A1]"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              }`}
              title="Toggle Thumbnails"
            >
              <FaThLarge className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Page Counter & Stepper */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={handlePrevPage}
              className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Previous Page"
            >
              <FaChevronLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>

            <form onSubmit={handlePageInputCommit} className="flex items-center">
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={handlePageInputCommit}
                disabled={loading || numPages <= 1}
                className="w-7 sm:w-9 text-center text-xs font-bold bg-slate-50 text-slate-900 border border-slate-200 rounded py-0.5 outline-none focus:border-[#0067A1] focus:bg-white"
              />
              <span className="text-[11px] sm:text-xs text-slate-500 px-0.5 sm:px-1 font-semibold">
                / {numPages || 1}
              </span>
            </form>

            <button
              type="button"
              disabled={currentPage >= numPages || loading}
              onClick={handleNextPage}
              className="p-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Next Page"
            >
              <FaChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
          </div>
        </div>

        {/* Center: Zoom & View Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs shrink-0">
          <button
            type="button"
            disabled={loading || scale <= 0.55}
            onClick={handleZoomOut}
            className="p-1 sm:p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <FaSearchMinus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </button>

          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-800 px-1 sm:px-1.5 min-w-[38px] sm:min-w-[44px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            disabled={loading || scale >= 2.8}
            onClick={handleZoomIn}
            className="p-1 sm:p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <FaSearchPlus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </button>

          <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

          <button
            type="button"
            disabled={loading}
            onClick={handleFitWidth}
            className="p-1 sm:p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fit Width"
          >
            <FaExpand className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleRotate}
            className="p-1 sm:p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Rotate Page"
          >
            <FaRedo className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </button>
        </div>

        {/* Right: Actions (Print & Download) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
            title="Print PDF"
          >
            <FaPrint className="w-3 h-3 text-slate-500" />
            <span>Print</span>
          </button>

          <a
            href={url}
            download={fileName}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#0067A1] hover:bg-[#005282] text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
            title="Download PDF"
          >
            <FaDownload className="w-3 h-3" />
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Thumbnails Sidebar */}
        {showThumbnails && numPages > 1 && (
          <div className="w-36 sm:w-44 bg-slate-50 border-r border-slate-200 overflow-y-auto p-2.5 space-y-3 shrink-0 select-none z-10 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
              Pages ({numPages})
            </p>
            {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
              <div
                key={p}
                onClick={() => {
                  setCurrentPage(p);
                  setPageInput(String(p));
                }}
                className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-lg border transition-all cursor-pointer ${
                  currentPage === p
                    ? "bg-[#0067A1]/10 border-[#0067A1] text-[#0067A1] ring-1 ring-[#0067A1]"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="w-full aspect-[1/1.4] bg-white rounded overflow-hidden flex items-center justify-center border border-slate-200 shadow-2xs">
                  {thumbnails[p] ? (
                    <img
                      src={thumbnails[p]}
                      alt={`Page ${p}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <FaFilePdf className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <span className="text-[10px] font-bold">Page {p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Canvas PDF Viewer Body (starts at top, smooth scroll) */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-1.5 sm:p-6 bg-slate-200/70 relative">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-600 my-auto py-12">
              <FaSpinner className="w-8 h-8 animate-spin text-[#0067A1]" />
              <p className="text-xs font-semibold tracking-wide">
                Loading PDF document with PDF.js...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-white border border-rose-200 rounded-xl p-6 text-center max-w-sm text-slate-700 space-y-3 shadow-md my-auto">
              <FaExclamationTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">
                  Unable to display PDF
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
              </div>
              <div className="pt-2 flex justify-center">
                <a
                  href={url}
                  download={fileName}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0067A1] hover:bg-[#005282] text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all"
                >
                  <FaDownload className="w-3.5 h-3.5" />
                  <span>Download File Directly</span>
                </a>
              </div>
            </div>
          )}

          {/* Canvas Sheet */}
          <div
            className={`transition-opacity duration-200 ${
              loading || error ? "hidden" : "block"
            }`}
          >
            <div className="relative shadow-xl rounded-sm overflow-hidden bg-white border border-slate-300/80 my-1">
              {rendering && (
                <div className="absolute inset-0 bg-white/40 backdrop-blur-2xs flex items-center justify-center z-10 transition-opacity">
                  <FaSpinner className="w-6 h-6 animate-spin text-[#0067A1]" />
                </div>
              )}
              <canvas ref={canvasRef} className="block mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
