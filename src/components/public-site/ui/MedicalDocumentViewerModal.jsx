"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FaTimes,
  FaDownload,
  FaFilePdf,
  FaFileImage,
  FaFileAlt,
  FaSearchPlus,
  FaSearchMinus,
  FaRedo,
  FaShieldAlt,
} from "react-icons/fa";
import PdfJsViewer from "@/components/public-site/ui/PdfJsViewer";

export default function MedicalDocumentViewerModal({
  isOpen,
  onClose,
  doc,
}) {
  const [imageZoom, setImageZoom] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  if (!isOpen || !doc || !mounted || typeof document === "undefined") return null;

  const docUrl = doc.document_url || doc.report_url || doc.url || "";
  const docName =
    doc.document_name ||
    doc.test_name ||
    doc.test_type ||
    doc.name ||
    "Medical Document";

  const isDocPdf = Boolean(
    doc.mime_type?.includes("pdf") ||
    docUrl.toLowerCase().includes(".pdf") ||
    docUrl.startsWith("/api/prescriptions/")
  );

  const isDocImage = Boolean(
    doc.mime_type?.startsWith("image/") ||
    docUrl.match(/\.(jpeg|jpg|png|webp|gif|bmp)(\?.*)?$/i)
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-white sm:bg-slate-950/80 sm:backdrop-blur-xs flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 md:p-6 overflow-hidden"
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}
    >
      {/* Backdrop */}
      <div
        className="hidden sm:block absolute inset-0 bg-transparent transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full h-full flex-1 sm:flex-initial sm:h-[88vh] sm:max-h-[88vh] sm:max-w-5xl bg-white rounded-none sm:rounded-xl shadow-none sm:shadow-2xl flex flex-col overflow-hidden border-0 sm:border sm:border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                isDocPdf
                  ? "bg-rose-50 text-rose-600 border-rose-200"
                  : isDocImage
                  ? "bg-purple-50 text-purple-600 border-purple-200"
                  : "bg-sky-50 text-[#0067A1] border-sky-200"
              }`}
            >
              {isDocPdf ? (
                <FaFilePdf className="w-4 h-4" />
              ) : isDocImage ? (
                <FaFileImage className="w-4 h-4" />
              ) : (
                <FaFileAlt className="w-4 h-4" />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-xs sm:text-base font-bold text-slate-900 truncate max-w-[200px] xs:max-w-[280px] sm:max-w-md">
                {docName}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                <span className="font-mono uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold border border-slate-200/60">
                  {isDocPdf ? "PDF Document" : isDocImage ? "Medical Image" : "Document"}
                </span>
                {doc.created_at && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] truncate">
                      {new Date(doc.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isDocImage && docUrl && (
              <a
                href={docUrl}
                download={docName || "document"}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                <FaDownload className="w-3 h-3 text-[#0067A1]" />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close viewer"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Viewer Body */}
        <div className="flex-1 overflow-hidden flex flex-col relative min-h-0 bg-slate-100">
          {isDocImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4 relative select-none bg-slate-900">
              {/* Image Zoom Toolbar */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg p-1 z-10 shadow-lg">
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.max(0.5, z - 0.25))}
                  className="w-7 h-7 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <FaSearchMinus className="w-3 h-3" />
                </button>
                <span className="text-[11px] font-mono text-slate-300 px-1 font-semibold">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.min(3, z + 0.25))}
                  className="w-7 h-7 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <FaSearchPlus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageZoom(1)}
                  className="w-7 h-7 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Reset Zoom"
                >
                  <FaRedo className="w-2.5 h-2.5" />
                </button>
              </div>

              <img
                src={docUrl}
                alt={docName}
                className="max-w-full max-h-full object-contain transition-transform duration-150 rounded shadow-2xl"
                style={{ transform: `scale(${imageZoom})` }}
              />
            </div>
          ) : isDocPdf ? (
            <div className="w-full h-full flex flex-col overflow-hidden bg-slate-100">
              <PdfJsViewer url={docUrl} fileName={docName} />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col overflow-hidden bg-white">
              <iframe
                src={docUrl}
                title={docName}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0 mt-auto pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold truncate mr-2">
            <FaShieldAlt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">
              Verified Medical Record · MediConnect Digital Health
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-colors cursor-pointer shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
