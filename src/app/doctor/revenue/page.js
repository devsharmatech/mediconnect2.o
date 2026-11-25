"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DoctorPaymentsPage from "../payments/page";

export default function DoctorRevenuePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/doctor/payments");
  }, [router]);

  return <DoctorPaymentsPage />;
}
