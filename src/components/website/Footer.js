import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-gray-300 uppercase mb-4">
              Legal
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link
                  href="/website/privacy"
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/website/terms"
                  className="hover:text-white transition-colors"
                >
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link
                  href="/website/telemedicine-disclaimer"
                  className="hover:text-white transition-colors"
                >
                  Telemedicine Consent
                </Link>
              </li>
              <li>
                <a
                  href="/iso-certifications.pdf"
                  className="hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ISO Certifications (PDF)
                </a>
              </li>
            </ul>
          </div>

          {/* Compliance */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-gray-300 uppercase mb-4">
              Compliance
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-3">
              Information Security and Quality Management processes aligned with
              ISO/IEC 27001:2022 and ISO 9001:2015 standards.
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              ABDM / ABHA enabled services are available where applicable.
            </p>
          </div>

          {/* Grievance Redressal */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-gray-300 uppercase mb-4">
              Grievance Redressal
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              <span className="block font-semibold text-gray-200">
                Grievance Officer
              </span>
              Name: Mrs. Seema
              <br />
              Email: info@mediconnect.fit
              <br />
              Response Time: Within 24–48 working hours
            </p>
          </div>

          {/* Legal Entity & Medical Disclaimer */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-gray-300 uppercase mb-4">
              Legal Entity
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-3">
              MediConnect.fit Private Limited
              <br />
              New Delhi, India
            </p>
          </div>
        </div>
        <div className="text-center mb-3 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h4 className="text-sm font-semibold text-gray-200 mb-1">
            Medical Disclaimer
          </h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Medical consultations on MediConnect.fit are provided by registered
            medical practitioners in accordance with applicable Indian laws and
            professional guidelines. MediConnect.fit facilitates access to
            healthcare services and does not substitute in-person clinical
            examination where such examination is medically necessary.
          </p>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-xs text-gray-500">
            © 2026 MediConnect.fit Private Limited. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
