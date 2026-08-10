"use client";

import "@/app/website-globals.css";
import PatientDashboardLayout from "@/components/public-site/dashboard/PatientDashboardLayout";

export default function AppointmentsLayout({ children }) {
  return <PatientDashboardLayout>{children}</PatientDashboardLayout>;
}
