"use client";

import { useState, useEffect } from "react";
import { FaFileContract } from "react-icons/fa";
import { ContentShimmer } from "@/components/public-site/ui/LoadingStates";

export default function TermsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPolicy() {
      try {
        const res = await fetch("/api/cms/legal?type=terms_of_use");
        const json = await res.json();
        if (json.success && json.data) {
           setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch terms", err);
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
          <FaFileContract className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
          {data?.title || "Terms of Use"}
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
             <>
               <section>
                 <h2 className="font-semibold mb-2">1. Acceptance of Terms</h2>
                 <p className="mb-2">
                   These Terms of Use govern access to and use of the MediConnect.fit website, mobile applications, and digital
                   platforms. The Platform is operated by MediConnect.fit Private Limited. By accessing or using the Platform, you
                   agree to be bound by these Terms, the Privacy Policy, and the Telemedicine Consent.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">2. Nature of the Platform</h2>
                 <p className="mb-2">
                   MediConnect.fit is a healthcare facilitation platform that enables access to healthcare services provided by
                   independent, licensed healthcare professionals. MediConnect.fit does not provide medical advice, diagnosis, or
                   treatment.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">3. No Emergency Use</h2>
                 <p className="mb-2">
                   The Platform is not intended for medical emergencies. Users must seek immediate in-person medical care or
                   emergency services when required.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">4. Medical Consultations</h2>
                 <p className="mb-2">
                   All consultations are provided by registered medical practitioners exercising independent professional judgement.
                   MediConnect.fit does not guarantee medical outcomes and does not interfere with clinical decision-making.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">5. User Responsibilities</h2>
                 <p className="mb-2">
                   Users agree to provide accurate information, use the Platform lawfully, and comply with professional
                   instructions.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">6. Payments and Appointments</h2>
                 <p className="mb-2">
                   MediConnect.fit may facilitate appointment scheduling and payment processing. Fees are determined by healthcare
                   providers. Availability is not guaranteed.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">7. Third-Party Providers</h2>
                 <p className="mb-2">
                   Healthcare providers operate independently. MediConnect.fit is not responsible for acts or omissions of
                   third-party providers.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">8. Data Protection</h2>
                 <p className="mb-2">
                   Personal data is handled in accordance with the Privacy Policy and applicable law.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">9. Intellectual Property</h2>
                 <p className="mb-2">
                   All Platform content is owned by or licensed to MediConnect.fit.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">10. Limitation of Liability</h2>
                 <p className="mb-2">
                   To the extent permitted by law, MediConnect.fit shall not be liable for clinical outcomes, indirect damages, or
                   service interruptions.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">11. Indemnity</h2>
                 <p className="mb-2">
                   Users agree to indemnify MediConnect.fit against claims arising from misuse of the Platform or violation of these
                   Terms.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">12. Suspension or Termination</h2>
                 <p className="mb-2">
                   Access may be suspended or terminated for violation of these Terms or legal requirements.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">13. Updates to Terms</h2>
                 <p className="mb-2">
                   These Terms may be updated periodically. Continued use constitutes acceptance.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">14. Governing Law and Jurisdiction</h2>
                 <p className="mb-2">
                   These Terms are governed by Indian law. Courts in India have exclusive jurisdiction.
                 </p>
               </section>

               <section>
                 <h2 className="font-semibold mb-2">15. Contact Information</h2>
                 <p className="mb-1">Grievance Officer</p>
                 <p className="mb-1">Email: info@mediconnect.fit</p>
                 <p className="mb-1">Address: MediConnect.fit Private Limited, New Delhi, India</p>
               </section>
             </>
        )}
      </main>
    </div>
  );
}
