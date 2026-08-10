"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill-new/dist/quill.snow.css";
import "./RichTextEditor.css"; // We will add some custom styles to match the dark theme

// Dynamically import react-quill-new to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>,
});

export default function RichTextEditor({ value, onChange, placeholder }) {
  // Customizing toolbar options
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        ["link", "image", "video"],
        ["clean"], // remove formatting button
      ],
    }),
    []
  );

  return (
    <div className="rich-text-editor-wrapper">
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder || "Write your content here..."}
        className="bg-white dark:bg-gray-700 dark:text-white rounded-xl overflow-hidden border dark:border-gray-600"
      />
    </div>
  );
}
