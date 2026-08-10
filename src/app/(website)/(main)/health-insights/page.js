import { FaChartLine, FaArrowLeft, FaClock } from "react-icons/fa";
import Link from "next/link";

export default function HealthInsightsPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Header */}
      <div className="bg-[#0067A1] px-6 py-10 md:px-10 md:py-12 text-center text-white">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <FaChartLine className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
          Health Insights
        </h1>
        <p className="mt-2 text-sm md:text-base text-white/80 max-w-2xl mx-auto">
          Simple summaries to support doctor-led decisions.
        </p>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
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
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <FaClock className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-amber-700">Under Development</span>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              What are Health Insights?
            </h2>
            
            <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
              <p>
                Health Insights provide simple summaries of your health information to help you understand your reports and support conversations with your doctor.
              </p>
              
              <p>
                These insights are informational and do not replace professional medical advice. Your doctor makes all clinical decisions based on your individual needs.
              </p>

              <div className="bg-[#F6F8FA] rounded-xl p-4 mt-6">
                <p className="text-xs text-gray-500 mb-2 uppercase font-semibold">How It Helps</p>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>- Understand your lab reports better</li>
                  <li>- Track health trends over time</li>
                  <li>- Prepare questions for your doctor</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-4">This feature is coming soon.</p>
              <Link
                href="/website/doctors"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg bg-[#0067A1] text-white hover:bg-[#004F7C]"
              >
                Book a Consultation Now
              </Link>
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
