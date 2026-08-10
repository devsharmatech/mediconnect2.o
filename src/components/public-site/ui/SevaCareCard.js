'use client';

const SevaCareCard = () => {
  return (
    <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm">
      <div className="space-y-3">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#0067A1]/5 text-[#0067A1]">
          GOVERNMENT SCHEME
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-[#003358]">Ayushman Bharat - SevaCare</h3>
        <p className="text-sm leading-relaxed text-gray-700">
          OPD consultations, lab tests and medicines for eligible BPL families under
          Ayushman Bharat. Access a network of verified doctors through mediconnect.fit&apos;s partners.
        </p>
        <button className="mt-2 inline-flex items-center gap-2 bg-[#0067A1] text-white hover:bg-[#004F7C] font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm">
          Check Your Eligibility
          <span className="text-lg">→</span>
        </button>
      </div>
    </div>
  );
};

export default SevaCareCard;
