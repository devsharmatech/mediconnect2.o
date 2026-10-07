"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InstantRequestRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/doctor/appointments");
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 border-4 border-[#0067A1]/20 border-t-[#0067A1] rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-gray-600">Redirecting to Doctor Appointments&hellip;</p>
    </div>
  );
}