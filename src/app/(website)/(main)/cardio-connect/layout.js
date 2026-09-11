"use client";

import "@/app/website-globals.css";
import PatientDashboardLayout from "@/components/public-site/dashboard/PatientDashboardLayout";

export default function CardioConnectLayout({ children }) {
  return <PatientDashboardLayout>{children}</PatientDashboardLayout>;
}
