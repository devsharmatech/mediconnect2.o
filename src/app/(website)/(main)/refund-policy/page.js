"use client";

import { useState, useEffect } from "react";
import { FaFileInvoiceDollar } from "react-icons/fa";
import { ContentShimmer } from "@/components/public-site/ui/LoadingStates";

export default function RefundPolicyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPolicy() {
      try {
        const res = await fetch("/api/cms/legal?type=refund_policy");
        const json = await res.json();
        if (json.success && json.data) {
           setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch refund policy", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPolicy();
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      <div className="mb-2 md:mb-4 bg-[#0067A1] px-6 py-10 md:px-10 md:py-12 text-center text-white">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <FaFileInvoiceDollar className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
          {data?.title || "Refund & Cancellation Policy"}
        </h1>
        <p className="text-xs md:text-sm text-white/80">MediConnect.fit</p>
        <p className="text-xs md:text-sm text-white/80">
           Last Updated: {data?.updated_at ? new Date(data.updated_at).toLocaleDateString() : "10 February 2026"}
        </p>
      </div>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-8 text-sm text-gray-800 leading-relaxed">
        {loading ? (
             <ContentShimmer lines={8} />
        ) : data && data.content ? (
             <div className="max-w-none prose prose-sm sm:prose-base break-words prose-p:my-2 prose-headings:my-4 prose-ul:my-2 prose-li:my-0 text-gray-800 [&_*]:!bg-transparent" dangerouslySetInnerHTML={{ __html: data.content }} />
        ) : (
                <div className="prose prose-sm max-w-none text-gray-600">
                 <p className="text-base leading-relaxed mb-8">
                   This policy outlines the terms under which refunds or cancellations may be processed for consultations booked through MediConnect.fit.
                 </p>

                 <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Consultation Fees</h2>
                 <ul className="space-y-3 list-disc list-inside text-sm">
                   <li>All consultation fees are clearly displayed before booking.</li>
                   <li>Fees may vary depending on the doctor, consultation type, or duration.</li>
                 </ul>

                 <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Cancellations</h2>
                 <ul className="space-y-3 list-disc list-inside text-sm">
                   <li>Patients may cancel a scheduled consultation within the time window specified during booking.</li>
                   <li>Late cancellations or no-shows may not be eligible for a refund.</li>
                 </ul>

                 <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Refund Eligibility</h2>
                 <p className="text-sm mb-3">Refunds may be considered under the following circumstances:</p>
                 <ul className="space-y-3 list-disc list-inside text-sm">
                   <li>Consultation could not be delivered due to technical issues attributable to the platform.</li>
                   <li>Doctor was unavailable and the consultation could not be rescheduled.</li>
                 </ul>
                 <div className="bg-[#F6F8FA] border border-gray-200 rounded-xl p-4 mt-4">
                   <p className="text-sm text-gray-700">
                     Refunds are not guaranteed for dissatisfaction with medical advice or outcomes.
                   </p>
                 </div>

                 <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Refund Processing</h2>
                 <ul className="space-y-3 list-disc list-inside text-sm">
                   <li>Approved refunds will be processed using the original payment method.</li>
                   <li>Refund timelines may vary depending on the payment provider and banking channels.</li>
                 </ul>

                 <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Final Authority</h2>
                 <p className="text-sm leading-relaxed">
                   MediConnect.fit reserves the right to make the final decision regarding refunds, in accordance with this policy and applicable laws.
                 </p>
               </div>
        )}
      </main>
    </div>
  );
}
