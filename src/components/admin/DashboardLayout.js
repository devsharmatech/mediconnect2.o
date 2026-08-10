"use client";

import { Toaster } from "react-hot-toast";
import Sidebar from "@/components/admin/Sidebar";
import Navbar from "@/components/admin/Navbar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="p-4 flex-1">{children}</main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "white",
            color: "black",
          },
          success: {
            style: { background: "#22c55e", color: "white" },
          },
          error: {
            style: { background: "#ef4444", color: "white" },
          },
        }}
      />
    </div>
  );
}