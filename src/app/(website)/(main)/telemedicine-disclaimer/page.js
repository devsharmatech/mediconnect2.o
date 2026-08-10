import { FaStethoscope } from "react-icons/fa";

export default function TelemedicineDisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Page Header - match About page hero */}
      <div className="mb-2 md:mb-4 bg-[#0067A1] px-6 py-10 md:px-10 md:py-12 text-center text-white">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <FaStethoscope className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
          Telemedicine Consent
        </h1>
        <p className="text-xs md:text-sm text-white/80">MediConnect.fit</p>
      </div>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 text-sm text-gray-800 leading-relaxed">
        <p>
          By accessing or using telemedicine services on MediConnect.fit, you expressly consent to receive medical
          consultations through electronic and telecommunication technologies in accordance with the Telemedicine Practice
          Guidelines issued by the Government of India. You understand that telemedicine has inherent limitations and that
          the consulting medical practitioner may advise in-person evaluation, physical examination, or emergency care where
          clinically necessary. All teleconsultations are provided by registered medical practitioners exercising independent
          professional judgement. MediConnect.fit facilitates access to such consultations and does not influence clinical
          decisions.
        </p>
      </main>
    </div>
  );
}
