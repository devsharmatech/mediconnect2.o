import { FaExclamationCircle, FaArrowLeft, FaEnvelope } from "react-icons/fa";
import Link from "next/link";

export default function GrievanceRedressalPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Header */}
      <div className="bg-[#0067A1] px-6 py-10 md:px-10 md:py-12 text-center text-white">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <FaExclamationCircle className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
          Grievance Redressal
        </h1>
        <p className="mt-2 text-sm md:text-base text-white/80 max-w-2xl mx-auto">
          MediConnect.fit - Grievance Redressal Mechanism
        </p>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            href="/website"
            className="inline-flex items-center text-sm text-[#0067A1] hover:underline mb-8"
          >
            <FaArrowLeft className="mr-2 h-3 w-3" />
            Back to Home
          </Link>

          {/* Main content */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="prose prose-sm max-w-none text-gray-600">
              <p className="text-base leading-relaxed mb-8">
                MediConnect.fit is committed to addressing user concerns in a fair, transparent, and timely manner. If you have any complaints, grievances, or concerns related to the platform or services, you may contact the Grievance Officer using the details below.
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Grievance Officer Details</h2>
              <div className="bg-[#0067A1]/5 rounded-xl p-6 mb-6">
                <p className="text-sm mb-2"><span className="font-medium text-gray-700">Designation:</span> Grievance Officer</p>
                <div className="flex items-center gap-2 mt-3">
                  <FaEnvelope className="h-4 w-4 text-[#0067A1]" />
                  <a href="mailto:info@mediconnect.fit" className="text-[#0067A1] font-medium hover:underline">
                    info@mediconnect.fit
                  </a>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Response Timeline</h2>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  All grievances will be acknowledged and addressed within <span className="font-semibold">48 to 72 working hours</span>.
                </p>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Scope of Grievances</h2>
              <p className="text-sm mb-3">Grievances may include issues related to:</p>
              <ul className="space-y-3 list-disc list-inside text-sm">
                <li>Platform functionality</li>
                <li>Appointment scheduling</li>
                <li>Payments and refunds</li>
                <li>Data privacy concerns</li>
              </ul>

              <div className="bg-[#F6F8FA] border border-gray-200 rounded-xl p-4 mt-6">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Note:</span> Clinical decisions or medical advice provided by doctors fall under the professional responsibility of the respective medical practitioner.
                </p>
              </div>
            </div>
          </div>

          {/* Related links */}
          <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Related Policies</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/website/privacy" className="text-sm text-[#0067A1] hover:underline">Privacy Policy</Link>
              <Link href="/website/terms" className="text-sm text-[#0067A1] hover:underline">Terms & Conditions</Link>
              <Link href="/website/telemedicine-policy" className="text-sm text-[#0067A1] hover:underline">Telemedicine Policy</Link>
              <Link href="/website/refund-policy" className="text-sm text-[#0067A1] hover:underline">Refund Policy</Link>
            </div>
          </div>

          {/* Support note */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Support Hours: 9:00 AM - 9:00 PM (All Days)</p>
            <p className="mt-1">Email: info@mediconnect.fit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
