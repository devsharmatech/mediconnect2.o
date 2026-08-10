import React from 'react';
import { FaShieldAlt, FaInfoCircle } from 'react-icons/fa';

const ConsentForm = ({ onConsentChange, isConsented }) => {
    return (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm">
            <div className="flex items-start gap-3 mb-4">
                <FaShieldAlt className="text-[#0067A1] w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Data Sharing Consent</h4>
                    <p className="text-gray-600 text-xs leading-relaxed">
                        By linking your ABHA ID, you agree to share your health information with MediConnect.fit for the purpose of providing better healthcare services.
                    </p>
                </div>
            </div>

            <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2">
                    <FaInfoCircle className="text-blue-500 w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500">
                        <strong>Purpose:</strong> Care Coordination & Health Records Management
                    </p>
                </div>
                <div className="flex items-start gap-2">
                    <FaInfoCircle className="text-blue-500 w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500">
                        <strong>Scope:</strong> View Profile, View Health Records, Link Records
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                <input
                    type="checkbox"
                    id="consent-checkbox"
                    checked={isConsented}
                    onChange={(e) => onConsentChange(e.target.checked)}
                    className="w-4 h-4 text-[#0067A1] border-gray-300 rounded focus:ring-[#0067A1]"
                />
                <label htmlFor="consent-checkbox" className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                    I agree to the terms and authorize MediConnect to access my ABHA details.
                </label>
            </div>
        </div>
    );
};

export default ConsentForm;
