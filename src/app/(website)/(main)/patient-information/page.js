export default function PatientInformationPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-gray-100 bg-[#F6F8FA]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-wide text-[#0067A1] uppercase mb-3">
              Patient Information
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
              Helpful Information for Patients and Families
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              This page explains how to use mediconnect.fit safely and meaningfully as a patient or caregiver.
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">1. Getting Started</h2>
            <p className="text-gray-600 leading-relaxed">
              You can use mediconnect.fit to consult doctors, book services, and manage health records. You may create an
              account using your mobile number and basic details.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Keep your contact details up to date so that doctors and service providers can reach you if needed.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Before a Consultation</h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li>Make a simple list of your current symptoms and how long they have been present.</li>
              <li>Keep your current medicines, previous prescriptions, and reports handy.</li>
              <li>Ensure you are in a quiet, well-lit place with a stable internet connection.</li>
            </ul>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div className="space-y-4 order-2 lg:order-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">2. During a Consultation</h2>
            <p className="text-gray-600 leading-relaxed">
              Share your symptoms, history, and concerns openly. Ask questions if you do not understand something.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Doctors may advise medicines, tests, or follow-up visits based on their clinical judgement and the information
              available.
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative">
              <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">3. After a Consultation</h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li>Review your prescription and instructions carefully in the app.</li>
                  <li>Book any suggested tests or follow-up appointments within the suggested timeframe.</li>
                  <li>Contact support if you face issues with reports, medicines, or scheduling.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-200 pt-10 lg:pt-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">4. Safe Use of Services</h2>
              <p className="text-gray-600 leading-relaxed">
                mediconnect.fit is not an emergency service. For serious or sudden symptoms, please visit the nearest
                hospital or call local emergency services immediately.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                For questions related to using the platform as a patient, you can reach our support team at
                <span className="font-medium"> support@mediconnect.fit</span>.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
