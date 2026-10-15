"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DoctorSettlementsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/finance/doctor-ledger");
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-gray-500">
      Redirecting to Finance Master &rarr; Doctor Ledger...
    </div>
  );
}
