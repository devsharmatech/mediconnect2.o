import { FaClock, FaArrowLeft, FaBell } from "react-icons/fa";
import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Hero */}
      <div className="bg-[#0067A1] px-6 py-10 md:px-10 md:py-12 text-center text-white">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <FaClock className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
          Coming Soon
        </h1>
        <p className="mt-2 text-sm md:text-base text-white/90 max-w-2xl mx-auto">
          We are working hard to bring this feature to you. Stay tuned for updates.
        </p>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/website" className="inline-flex items-center text-sm text-[#0067A1] hover:underline mb-8">
          <FaArrowLeft className="mr-2 h-3 w-3" />
          Back to Home
        </Link>

        <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 shadow-sm">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-[#0067A1]/10 mb-6">
              <FaBell className="h-10 w-10 text-[#0067A1]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              This Feature is Under Development
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              MediConnect.fit is being introduced in phases. This feature is currently under development and will be available soon. We appreciate your patience as we work to bring you the best possible healthcare experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/website/services"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#0067A1] text-white rounded-lg font-medium hover:bg-[#0067A1]/90 transition-colors"
              >
                Explore Available Services
              </Link>
              <Link
                href="/website"
                className="inline-flex items-center justify-center px-6 py-3 border border-[#0067A1] text-[#0067A1] rounded-lg font-medium hover:bg-[#0067A1]/5 transition-colors"
              >
                Go to Home
              </Link>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Have questions? Contact us at{" "}
            <a href="mailto:support@mediconnect.fit" className="text-[#0067A1] hover:underline">
              support@mediconnect.fit
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
