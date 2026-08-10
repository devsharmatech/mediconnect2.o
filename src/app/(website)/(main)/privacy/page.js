"use client";

import { useState, useEffect } from "react";
import { FaShieldAlt } from "react-icons/fa";
import { ContentShimmer } from "@/components/public-site/ui/LoadingStates";

export default function PrivacyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPolicy() {
      try {
        const res = await fetch("/api/cms/legal?type=privacy_policy");
        const json = await res.json();
        if (json.success && json.data) {
           setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch privacy policy", err);
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
          <FaShieldAlt className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
          {data?.title || "Privacy Policy"}
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
              <h2 className="font-semibold mb-2">1. Purpose and Scope</h2>
              <p className="mb-2">
                This Privacy Policy explains how MediConnect.fit Private Limited (“MediConnect.fit”, “we”, “our”, or “us”) collects,
                uses, stores, shares, and protects personal data and digital personal data, including sensitive personal health
                information, in compliance with:
              </p>
              <ul className="list-disc list-inside pl-1 mb-2">
                <li>The Digital Personal Data Protection Act, 2023</li>
                <li>Telemedicine Practice Guidelines (India)</li>
                <li>National Medical Commission (NMC) regulations</li>
                <li>Ayushman Bharat Digital Mission (ABDM) framework</li>
              </ul>
              <p className="mb-2">
                This Policy applies to all users accessing MediConnect.fit through the website, mobile applications, or assisted
                digital channels. MediConnect.fit operates as a consultation-first healthcare facilitation platform, designed to
                support ethical, structured, and responsible medical care.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">2. Nature of the Platform</h2>
              <p className="mb-2">MediConnect.fit facilitates access to healthcare services including:</p>
              <ul className="list-disc list-inside pl-1 mb-2">
                <li>Video medical and dental consultations</li>
                <li>In-clinic appointment scheduling</li>
                <li>Home visits, nursing services, and medical equipment facilitation</li>
                <li>Diagnostic laboratory services</li>
                <li>Pharmacy services</li>
                <li>ABDM / ABHA account creation and health record linkage</li>
                <li>Condition-focused care pathways such as CardioConnect and LungConnect</li>
              </ul>
              <p className="mb-2">
                All medical and dental consultations are provided by registered medical and dental practitioners licensed in India.
                MediConnect.fit does not provide medical diagnosis or treatment and does not interfere with clinical judgement.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">3. Data Fiduciary Status</h2>
              <p className="mb-2">
                For the purposes of the Digital Personal Data Protection Act, 2023, MediConnect.fit acts as a Data Fiduciary.
                Third parties engaged by MediConnect.fit act as Data Processors under contractual obligations requiring
                confidentiality, security, and lawful processing.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">4. Categories of Data Collected</h2>
              <p className="mb-2">
                MediConnect.fit may collect personal data, health data, ABDM / ABHA-related data, and limited technical data strictly
                for healthcare delivery, platform security, and compliance purposes, with user consent and in accordance with
                applicable law.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">5. Purpose of Processing</h2>
              <p className="mb-2">
                Personal and health data is processed only for lawful purposes including healthcare delivery, continuity of care,
                medical record maintenance, patient safety, quality assurance, and regulatory compliance. MediConnect.fit does not
                use personal or health data for advertising, profiling, or commercial exploitation.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">6. Consent Framework</h2>
              <p className="mb-2">
                Consent is obtained in accordance with the DPDP Act and Telemedicine Practice Guidelines. Withdrawal of consent may
                limit service availability but will not affect legally mandated medical record retention or ongoing medico-legal
                obligations.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">7. Confidentiality</h2>
              <p className="mb-2">
                Doctor–patient confidentiality is maintained in accordance with applicable law, professional ethics, and regulatory
                requirements.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">8. Information Security</h2>
              <p className="mb-2">
                MediConnect.fit maintains information security and quality management processes aligned with:
              </p>
              <ul className="list-disc list-inside pl-1 mb-2">
                <li>ISO/IEC 27001:2022</li>
                <li>ISO 9001:2015</li>
              </ul>
              <p className="mb-2">
                Reasonable technical and organisational safeguards are implemented to protect personal data.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">9. Data Sharing</h2>
              <p className="mb-2">
                Personal and health data may be shared only with authorised healthcare providers, diagnostic partners, pharmacies,
                nursing services, medical equipment providers, ABDM ecosystem participants (with consent), or regulatory
                authorities as required by law. MediConnect.fit does not sell or commercially exploit personal data.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">10. Data Retention</h2>
              <p className="mb-2">
                Data is retained only for the duration required for healthcare delivery, legal compliance, and medico-legal
                obligations, after which it is securely deleted or anonymised.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">11. User Rights</h2>
              <p className="mb-2">
                Users may exercise rights available under the DPDP Act, 2023, including access, correction, withdrawal of consent
                (where applicable), and grievance redressal.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">12. Grievance Redressal</h2>
              <p className="mb-2">Grievance Officer / Data Protection Contact</p>
              <p className="mb-2">Email: info@mediconnect.fit</p>
              <p className="mb-2">Address: MediConnect.fit Private Limited, New Delhi, India</p>
              <p className="mb-2">
                Grievances will be acknowledged and addressed within 24–48 working hours, in accordance with applicable law.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">13. Updates to This Policy</h2>
              <p className="mb-2">
                This Privacy Policy may be updated periodically. Continued use of the Platform constitutes acceptance of the
                updated Policy.
              </p>
            </section>

            <section>
              <h2 className="font-semibold mb-2">14. Governing Law and Jurisdiction</h2>
              <p>
                This Privacy Policy is governed by the laws of India. Courts located in India shall have exclusive jurisdiction.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
