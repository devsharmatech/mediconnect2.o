"use client";

import { useState, useEffect } from "react";
import { FaFileAlt } from "react-icons/fa";
import { ContentShimmer } from "@/components/public-site/ui/LoadingStates";

export default function TelemedicinePolicyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPolicy() {
      try {
        const res = await fetch("/api/cms/legal?type=telemedicine_policy");
        const json = await res.json();
        if (json.success && json.data) {
           setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch telemedicine policy", err);
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
          <FaFileAlt className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
          {data?.title || "Telemedicine Policy"}
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
                 <p className="text-base leading-relaxed mb-6">
                   MediConnect.fit facilitates online medical consultations in accordance with the Telemedicine Practice Guidelines issued by the Government of India and the applicable regulations of the National Medical Commission (NMC).
                 </p>
                 <p className="text-base leading-relaxed mb-8">
                   This policy explains the scope, limitations, and responsibilities associated with teleconsultation services provided through the MediConnect.fit platform.
                 </p>

                 <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Nature of Teleconsultation Services</h2>
                 <ul className="space-y-3 list-disc list-inside text-sm">
                   <li>MediConnect.fit enables patients to consult registered medical practitioners using digital communication modes such as video, audio, or text-based interaction.</li>
                   <li>Medical advice, diagnosis, prescriptions, and follow-up recommendations are provided solely at the professional discretion of the consulting doctor.</li>
                   <li>MediConnect.fit does not interfere with or influence clinical decision-making.</li>
                 </ul>

                 <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Limitations of Telemedicine</h2>
                 <ul className="space-y-3 list-disc list-inside text-sm">
                   <li>Teleconsultation has inherent limitations and may not be suitable for all medical conditions.</li>
                   <li>Physical examination may be required for accurate diagnosis in certain cases.</li>
                   <li>Telemedicine services are not intended for medical emergencies.</li>
                 </ul>
                 <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
                   <p className="text-sm text-red-800 font-medium">
                     In case of an emergency, patients must seek immediate in-person medical care at the nearest hospital. Call 108 or 112 for emergency services.
                   </p>
                 </div>

                 <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Prescriptions & Medicines</h2>
                 <ul className="space-y-3 list-disc list-inside text-sm">
                   <li>Prescriptions are issued only after a valid doctor-patient consultation, in compliance with telemedicine guidelines.</li>
                   <li>Certain categories of medicines cannot be prescribed via teleconsultation as per Indian regulations.</li>
                   <li>The consulting doctor has the final authority to decide whether a prescription is appropriate.</li>
                 </ul>

                 <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Patient Consent & Responsibilities</h2>
                 <ul className="space-y-3 list-disc list-inside text-sm">
                   <li>Patients must provide accurate, complete, and truthful health information during consultations.</li>
                   <li>Explicit patient consent is mandatory before initiating any teleconsultation.</li>
                   <li>Patients acknowledge that teleconsultation is not a replacement for in-person care when clinically required.</li>
                 </ul>

                 <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Platform Role Disclaimer</h2>
                 <p className="text-sm leading-relaxed">
                   MediConnect.fit acts solely as a technology platform facilitating communication between patients and doctors. The platform does not guarantee medical outcomes, diagnoses, or treatment effectiveness.
                 </p>
               </div>
        )}
      </main>
    </div>
  );
}
