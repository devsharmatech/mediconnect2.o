"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  Plus,
  RefreshCw,
  User,
  Phone,
  Mail,
  Calendar,
  Settings,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Star,
  Award,
  Building,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  FileText,
  Shield,
  CreditCard,
  BadgeCheck,
  Clock4,
  Upload,
  X,
  Store,
  Package,
  Receipt,
  ShieldCheck,
  FileCheck,
  Banknote,
  ExternalLink,
  QrCode,
  Heart,
  Activity,
  Pill,
  Ambulance,
  Bed,
  HeartPulse,
  Hospital,
  Syringe,
  Thermometer,
  Users,
  Home,
  Car,
  Plane,
  Globe,
  ShieldOff,
  Zap,
  Crown,
  Baby,
  School,
  GraduationCap,
} from "lucide-react";

// Terms and Conditions Modal Component for Insurance
function TermsModal({ isOpen, onClose, onAccept }) {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    setAccepted(true);
    onAccept();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <FileText className="w-5 h-5 text-gray-700 dark:text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Insurance Terms & Conditions
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Please read and accept the terms to continue
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50 dark:bg-gray-800">
          <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Insurance Provider Agreement
              </h4>
              <div className="space-y-3">
                <p>
                  <strong>1. Provider Information & Verification</strong>
                  <br />
                  By registering, you confirm that all provided insurance
                  details are accurate: - Valid insurance licenses and
                  certifications - Proper registration documents - Financial
                  stability proofs - Claim settlement history
                </p>

                <p>
                  <strong>2. Service Standards</strong>
                  <br />
                  Registered providers must maintain: - Transparent policy terms
                  - Fair claim settlement processes - Customer support services
                  - Regulatory compliance - Financial transparency
                </p>

                <p>
                  <strong>3. Policy Management</strong>
                  <br />
                  Commitment to: - Clear policy documentation - Fair premium
                  calculations - Transparent exclusions - Quick claim processing
                  - Customer data protection
                </p>
                <p>
                  <strong>4. Legal Compliance</strong>
                  <br />
                  Agreement to comply with: - Insurance Regulatory Authority
                  guidelines - Financial compliance requirements - Data
                  protection laws - Consumer protection regulations
                </p>

                <p>
                  <strong>5. Claim Settlement</strong>
                  <br />
                  Must maintain: - Fair claim assessment - Timely settlements -
                  Transparent processes - Proper documentation - Customer
                  communication
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">
                    Important Insurance Notice
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                    By accepting these terms, you certify that your insurance
                    company meets all regulatory standards and maintains proper
                    licenses. Regular audits may be conducted to verify
                    compliance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="accept-terms"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700"
              />
              <label
                htmlFor="accept-terms"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                I have read and accept the Terms & Conditions
              </label>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={!accepted}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Coverage Features Input Component
function CoverageFeaturesInput({ features, onChange }) {
  const [newFeature, setNewFeature] = useState("");

  const commonFeatures = [
    "Hospitalization Coverage",
    "ICU Charges",
    "Pre-hospitalization Expenses",
    "Post-hospitalization Expenses",
    "Day Care Procedures",
    "Domiciliary Treatment",
    "Ambulance Cover",
    "Organ Donor Expenses",
    "Health Check-ups",
    "Maternity Cover",
    "New Born Baby Cover",
    "Vaccination Cover",
    "Mental Health Cover",
    "Ayush Treatment",
    "Ophthalmic Treatment",
    "Dental Treatment",
    "Critical Illness Cover",
    "Personal Accident Cover",
    "COVID-19 Coverage",
    "Telemedicine Consultations",
  ];

  const addFeature = () => {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      const updatedFeatures = [...features, newFeature.trim()];
      onChange(updatedFeatures);
      setNewFeature("");
    }
  };

  const removeFeature = (index) => {
    const updatedFeatures = features.filter((_, i) => i !== index);
    onChange(updatedFeatures);
  };

  const addCommonFeature = (feature) => {
    if (!features.includes(feature)) {
      const updatedFeatures = [...features, feature];
      onChange(updatedFeatures);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add coverage feature"
          value={newFeature}
          onChange={(e) => setNewFeature(e.target.value)}
          onKeyPress={(e) =>
            e.key === "Enter" && (e.preventDefault(), addFeature())
          }
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <button
          type="button"
          onClick={addFeature}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200"
        >
          Add
        </button>
      </div>

      {/* Common Features */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Common Coverage Features
        </p>
        <div className="flex flex-wrap gap-2">
          {commonFeatures.map((feature) => (
            <button
              key={feature}
              type="button"
              onClick={() => addCommonFeature(feature)}
              disabled={features.includes(feature)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {feature}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Features */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Selected Features ({features.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 px-3 py-1 bg-teal-100 dark:bg-[#003358] text-[#004F7C] dark:text-teal-300 rounded-full text-sm"
            >
              <span>{feature}</span>
              <button
                type="button"
                onClick={() => removeFeature(index)}
                className="text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {features.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No features added
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Exclusions Input Component
function ExclusionsInput({ exclusions, onChange }) {
  const [newExclusion, setNewExclusion] = useState("");

  const commonExclusions = [
    "Pre-existing conditions",
    "Cosmetic surgery",
    "Dental treatments (unless due to accident)",
    "Hearing aids and glasses",
    "HIV/AIDS treatment",
    "Addiction treatment",
    "Suicide attempts",
    "War and nuclear risks",
    "Adventure sports injuries",
    "Maternity (if not covered)",
    "Infertility treatment",
    "Weight control programs",
    "Experimental treatments",
    "Routine health check-ups",
    "Congenital diseases",
  ];

  const addExclusion = () => {
    if (newExclusion.trim() && !exclusions.includes(newExclusion.trim())) {
      const updatedExclusions = [...exclusions, newExclusion.trim()];
      onChange(updatedExclusions);
      setNewExclusion("");
    }
  };

  const removeExclusion = (index) => {
    const updatedExclusions = exclusions.filter((_, i) => i !== index);
    onChange(updatedExclusions);
  };

  const addCommonExclusion = (exclusion) => {
    if (!exclusions.includes(exclusion)) {
      const updatedExclusions = [...exclusions, exclusion];
      onChange(updatedExclusions);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add exclusion"
          value={newExclusion}
          onChange={(e) => setNewExclusion(e.target.value)}
          onKeyPress={(e) =>
            e.key === "Enter" && (e.preventDefault(), addExclusion())
          }
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <button
          type="button"
          onClick={addExclusion}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200"
        >
          Add
        </button>
      </div>

      {/* Common Exclusions */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Common Exclusions
        </p>
        <div className="flex flex-wrap gap-2">
          {commonExclusions.map((exclusion) => (
            <button
              key={exclusion}
              type="button"
              onClick={() => addCommonExclusion(exclusion)}
              disabled={exclusions.includes(exclusion)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {exclusion}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Exclusions */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Selected Exclusions ({exclusions.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {exclusions.map((exclusion, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 rounded-full text-sm"
            >
              <span>{exclusion}</span>
              <button
                type="button"
                onClick={() => removeExclusion(index)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {exclusions.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No exclusions added
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Insurance Provider Modal Component
function InsuranceProviderModal({ isOpen, onClose, provider, onSave }) {
  const [formData, setFormData] = useState({
    provider_name: "",
    description: "",
    contact_email: "",
    contact_phone: "",
    website_url: "",
    logo_url: "",
    is_active: true,
    rating: 0,
    total_reviews: 0,
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    if (provider) {
      setFormData({
        provider_name: provider.provider_name || "",
        description: provider.description || "",
        contact_email: provider.contact_email || "",
        contact_phone: provider.contact_phone || "",
        website_url: provider.website_url || "",
        logo_url: provider.logo_url || "",
        is_active: provider.is_active !== undefined ? provider.is_active : true,
        rating: provider.rating || 0,
        total_reviews: provider.total_reviews || 0,
      });
    } else {
      setFormData({
        provider_name: "",
        description: "",
        contact_email: "",
        contact_phone: "",
        website_url: "",
        logo_url: "",
        is_active: true,
        rating: 0,
        total_reviews: 0,
      });
    }
  }, [provider, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
      toast.success(
        provider
          ? "Insurance provider updated successfully!"
          : "Insurance provider added successfully!"
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Shield className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Provider Basic Information
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Provider Name *
          </label>
          <input
            type="text"
            value={formData.provider_name}
            onChange={(e) => handleInputChange("provider_name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="ABC Insurance Company"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contact Email *
          </label>
          <input
            type="email"
            value={formData.contact_email}
            onChange={(e) => handleInputChange("contact_email", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="contact@abcinsurance.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contact Phone *
          </label>
          <input
            type="text"
            value={formData.contact_phone}
            onChange={(e) => handleInputChange("contact_phone", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="+1 234 567 8900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Website URL
          </label>
          <input
            type="url"
            value={formData.website_url}
            onChange={(e) => handleInputChange("website_url", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="https://abcinsurance.com"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Brief description about the insurance provider..."
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Settings className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Additional Information
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Logo URL
          </label>
          <input
            type="url"
            value={formData.logo_url}
            onChange={(e) => handleInputChange("logo_url", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="https://abcinsurance.com/logo.png"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Initial Rating
          </label>
          <input
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={formData.rating}
            onChange={(e) =>
              handleInputChange("rating", parseFloat(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Total Reviews
          </label>
          <input
            type="number"
            min="0"
            value={formData.total_reviews}
            onChange={(e) =>
              handleInputChange("total_reviews", parseInt(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
          <input
            type="checkbox"
            id="is-active"
            checked={formData.is_active}
            onChange={(e) => handleInputChange("is_active", e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700"
          />
          <label
            htmlFor="is-active"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Active Provider
          </label>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-black">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {provider
                    ? "Update Insurance Provider"
                    : "Add New Insurance Provider"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  {provider
                    ? "Update insurance provider information"
                    : "Add a new insurance provider to the system"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mt-4">
              {[1, 2].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                      step === stepNum
                        ? "bg-black text-white shadow-sm"
                        : step > stepNum
                        ? "bg-gray-600 text-white shadow-sm"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {stepNum}
                  </div>
                  {stepNum < 2 && (
                    <div
                      className={`w-12 h-1 mx-2 transition-all duration-300 ${
                        step > stepNum
                          ? "bg-gray-600"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50 dark:bg-gray-800">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex justify-between">
              <button
                onClick={() => step > 1 && setStep(step - 1)}
                disabled={step === 1}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Previous
              </button>

              {step < 2 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 shadow-sm"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : provider ? (
                    "Update Provider"
                  ) : (
                    "Add Provider"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleSubmit}
      />
    </>
  );
}

// Insurance Policy Modal Component
function InsurancePolicyModal({ isOpen, onClose, policy, providers, onSave }) {
  const [formData, setFormData] = useState({
    provider_id: "",
    policy_name: "",
    policy_type: "individual",
    description: "",
    sum_insured: 0,
    premium_amount: 0,
    premium_type: "annual",
    coverage_details: {},
    exclusions: [],
    waiting_period: 30,
    network_hospitals: [],
    cashless_facility: true,
    room_rent_limit: 0,
    co_payment: 0,
    claim_settlement_ratio: 0,
    min_age: 0,
    max_age: 100,
    pre_existing_conditions_waiting_period: 24,
    is_active: true,
    features: [],
    documents_required: [],
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const policyTypes = [
    { value: "individual", label: "Individual", icon: User },
    { value: "family", label: "Family Floater", icon: Users },
    { value: "senior_citizen", label: "Senior Citizen", icon: GraduationCap },
    { value: "critical_illness", label: "Critical Illness", icon: HeartPulse },
    { value: "top_up", label: "Top-up", icon: Zap },
    { value: "super_top_up", label: "Super Top-up", icon: Crown },
    { value: "maternity", label: "Maternity", icon: Baby },
    { value: "group", label: "Group Insurance", icon: Users },
  ];

  const premiumTypes = [
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "half_yearly", label: "Half Yearly" },
    { value: "annual", label: "Annual" },
  ];

  const documentsRequired = [
    "Aadhaar Card",
    "PAN Card",
    "Passport Size Photo",
    "Age Proof",
    "Address Proof",
    "Income Proof",
    "Medical Reports",
    "Bank Details",
  ];

  useEffect(() => {
    if (policy) {
      const parsedFeatures = Array.isArray(policy.features)
        ? policy.features
        : typeof policy.features === "string"
        ? JSON.parse(policy.features)
        : [];

      const parsedExclusions = Array.isArray(policy.exclusions)
        ? policy.exclusions
        : typeof policy.exclusions === "string"
        ? JSON.parse(policy.exclusions)
        : [];

      const parsedDocuments = Array.isArray(policy.documents_required)
        ? policy.documents_required
        : typeof policy.documents_required === "string"
        ? JSON.parse(policy.documents_required)
        : [];

      setFormData({
        provider_id: policy.provider_id || "",
        policy_name: policy.policy_name || "",
        policy_type: policy.policy_type || "individual",
        description: policy.description || "",
        sum_insured: policy.sum_insured || 0,
        premium_amount: policy.premium_amount || 0,
        premium_type: policy.premium_type || "annual",
        coverage_details: policy.coverage_details || {},
        exclusions: parsedExclusions,
        waiting_period: policy.waiting_period || 30,
        network_hospitals: policy.network_hospitals || [],
        cashless_facility:
          policy.cashless_facility !== undefined
            ? policy.cashless_facility
            : true,
        room_rent_limit: policy.room_rent_limit || 0,
        co_payment: policy.co_payment || 0,
        claim_settlement_ratio: policy.claim_settlement_ratio || 0,
        min_age: policy.min_age || 0,
        max_age: policy.max_age || 100,
        pre_existing_conditions_waiting_period:
          policy.pre_existing_conditions_waiting_period || 24,
        is_active: policy.is_active !== undefined ? policy.is_active : true,
        features: parsedFeatures,
        documents_required: parsedDocuments,
      });
    } else {
      setFormData({
        provider_id: "",
        policy_name: "",
        policy_type: "individual",
        description: "",
        sum_insured: 0,
        premium_amount: 0,
        premium_type: "annual",
        coverage_details: {},
        exclusions: [],
        waiting_period: 30,
        network_hospitals: [],
        cashless_facility: true,
        room_rent_limit: 0,
        co_payment: 0,
        claim_settlement_ratio: 0,
        min_age: 0,
        max_age: 100,
        pre_existing_conditions_waiting_period: 24,
        is_active: true,
        features: [],
        documents_required: [],
      });
    }
  }, [policy, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFeaturesChange = (newFeatures) => {
    setFormData((prev) => ({
      ...prev,
      features: newFeatures,
    }));
  };

  const handleExclusionsChange = (newExclusions) => {
    setFormData((prev) => ({
      ...prev,
      exclusions: newExclusions,
    }));
  };

  const handleDocumentsChange = (document, checked) => {
    setFormData((prev) => ({
      ...prev,
      documents_required: checked
        ? [...prev.documents_required, document]
        : prev.documents_required.filter((doc) => doc !== document),
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
      toast.success(
        policy
          ? "Insurance policy updated successfully!"
          : "Insurance policy added successfully!"
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <FileText className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Policy Basic Information
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Insurance Provider *
          </label>
          <select
            value={formData.provider_id}
            onChange={(e) => handleInputChange("provider_id", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="">Select Provider</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.provider_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Policy Name *
          </label>
          <input
            type="text"
            value={formData.policy_name}
            onChange={(e) => handleInputChange("policy_name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Health Shield Gold"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Policy Type *
          </label>
          <select
            value={formData.policy_type}
            onChange={(e) => handleInputChange("policy_type", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          >
            {policyTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Premium Type *
          </label>
          <select
            value={formData.premium_type}
            onChange={(e) => handleInputChange("premium_type", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          >
            {premiumTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sum Insured (₹) *
          </label>
          <input
            type="number"
            value={formData.sum_insured}
            onChange={(e) =>
              handleInputChange("sum_insured", parseFloat(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="500000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Premium Amount (₹) *
          </label>
          <input
            type="number"
            value={formData.premium_amount}
            onChange={(e) =>
              handleInputChange("premium_amount", parseFloat(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="15000"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Policy Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
            placeholder="Detailed description of the policy coverage and benefits..."
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <ShieldCheck className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Coverage & Features
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Coverage Features *
          </label>
          <CoverageFeaturesInput
            features={formData.features}
            onChange={handleFeaturesChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Policy Exclusions
          </label>
          <ExclusionsInput
            exclusions={formData.exclusions}
            onChange={handleExclusionsChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Waiting Period (days)
          </label>
          <input
            type="number"
            value={formData.waiting_period}
            onChange={(e) =>
              handleInputChange("waiting_period", parseInt(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Pre-existing Conditions Waiting Period (months)
          </label>
          <input
            type="number"
            value={formData.pre_existing_conditions_waiting_period}
            onChange={(e) =>
              handleInputChange(
                "pre_existing_conditions_waiting_period",
                parseInt(e.target.value)
              )
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Settings className="w-5 h-5 text-gray-700 dark:text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Policy Details & Requirements
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Minimum Age
          </label>
          <input
            type="number"
            value={formData.min_age}
            onChange={(e) =>
              handleInputChange("min_age", parseInt(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Maximum Age
          </label>
          <input
            type="number"
            value={formData.max_age}
            onChange={(e) =>
              handleInputChange("max_age", parseInt(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Room Rent Limit (₹)
          </label>
          <input
            type="number"
            value={formData.room_rent_limit}
            onChange={(e) =>
              handleInputChange("room_rent_limit", parseFloat(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Co-payment (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={formData.co_payment}
            onChange={(e) =>
              handleInputChange("co_payment", parseFloat(e.target.value))
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Claim Settlement Ratio (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={formData.claim_settlement_ratio}
            onChange={(e) =>
              handleInputChange(
                "claim_settlement_ratio",
                parseFloat(e.target.value)
              )
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
          <input
            type="checkbox"
            id="cashless-facility"
            checked={formData.cashless_facility}
            onChange={(e) =>
              handleInputChange("cashless_facility", e.target.checked)
            }
            className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700"
          />
          <label
            htmlFor="cashless-facility"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Cashless Facility Available
          </label>
        </div>

        <div className="flex items-center space-x-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
          <input
            type="checkbox"
            id="is-active"
            checked={formData.is_active}
            onChange={(e) => handleInputChange("is_active", e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700"
          />
          <label
            htmlFor="is-active"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Active Policy
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Documents Required
        </label>
        <div className="grid grid-cols-2 gap-2">
          {documentsRequired.map((doc) => (
            <div key={doc} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={`doc-${doc}`}
                checked={formData.documents_required.includes(doc)}
                onChange={(e) => handleDocumentsChange(doc, e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700"
              />
              <label
                htmlFor={`doc-${doc}`}
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                {doc}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-black">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {policy
                  ? "Update Insurance Policy"
                  : "Add New Insurance Policy"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {policy
                  ? "Update insurance policy information"
                  : "Add a new insurance policy to the system"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    step === stepNum
                      ? "bg-black text-white shadow-sm"
                      : step > stepNum
                      ? "bg-gray-600 text-white shadow-sm"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`w-12 h-1 mx-2 transition-all duration-300 ${
                      step > stepNum
                        ? "bg-gray-600"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50 dark:bg-gray-800">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex justify-between">
            <button
              onClick={() => step > 1 && setStep(step - 1)}
              disabled={step === 1}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Previous
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-sm"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 shadow-sm"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : policy ? (
                  "Update Policy"
                ) : (
                  "Add Policy"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Policy Details Modal Component
function PolicyDetailsModal({ policy, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!isOpen || !policy) {
    return null;
  }

  const getPolicyTypeLabel = (type) => {
    const types = {
      individual: "Individual",
      family: "Family Floater",
      senior_citizen: "Senior Citizen",
      critical_illness: "Critical Illness",
      top_up: "Top-up",
      super_top_up: "Super Top-up",
      maternity: "Maternity",
      group: "Group Insurance",
    };
    return types[type] || type;
  };

  const getPremiumTypeLabel = (type) => {
    const types = {
      monthly: "Monthly",
      quarterly: "Quarterly",
      half_yearly: "Half Yearly",
      annual: "Annual",
    };
    return types[type] || type;
  };

  const parsedFeatures = Array.isArray(policy.features)
    ? policy.features
    : typeof policy.features === "string"
    ? JSON.parse(policy.features)
    : [];

  const parsedExclusions = Array.isArray(policy.exclusions)
    ? policy.exclusions
    : typeof policy.exclusions === "string"
    ? JSON.parse(policy.exclusions)
    : [];

  const parsedDocuments = Array.isArray(policy.documents_required)
    ? policy.documents_required
    : typeof policy.documents_required === "string"
    ? JSON.parse(policy.documents_required)
    : [];

  const renderOverviewContent = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Policy Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <FileText className="w-5 h-5 text-gray-700 dark:text-white" />
            </div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Policy Information
            </h5>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Policy Name
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {policy.policy_name}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Policy Type
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {getPolicyTypeLabel(policy.policy_type)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Sum Insured
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                ₹{policy.sum_insured?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Premium
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                ₹{policy.premium_amount?.toLocaleString()} (
                {getPremiumTypeLabel(policy.premium_type)})
              </span>
            </div>
          </div>
        </div>

        {/* Age & Coverage */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <User className="w-5 h-5 text-gray-700 dark:text-white" />
            </div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Age & Coverage
            </h5>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Minimum Age
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {policy.min_age} years
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Maximum Age
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {policy.max_age} years
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {policy.cashless_facility && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                  <CheckCircle size={12} className="mr-1" />
                  Cashless
                </span>
              )}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 dark:bg-[#003358] text-[#004F7C] dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                <Clock size={12} className="mr-1" />
                Waiting: {policy.waiting_period} days
              </span>
              {policy.co_payment > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                  <DollarSign size={12} className="mr-1" />
                  Co-pay: {policy.co_payment}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Claim Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Award className="w-5 h-5 text-gray-700 dark:text-white" />
            </div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              Claim Information
            </h5>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Claim Settlement Ratio
              </p>
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full"
                    style={{ width: `${policy.claim_settlement_ratio || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {policy.claim_settlement_ratio || 0}%
                </span>
              </div>
            </div>
            {policy.room_rent_limit > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Room Rent Limit
                </span>
                <span className="text-sm text-gray-900 dark:text-white font-medium">
                  ₹{policy.room_rent_limit?.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Provider Information */}
        {policy.health_insurance_providers && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Building className="w-5 h-5 text-gray-700 dark:text-white" />
              </div>
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                Insurance Provider
              </h5>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                {policy.health_insurance_providers.logo_url ? (
                  <img
                    className="h-10 w-10 rounded-lg object-cover"
                    src={policy.health_insurance_providers.logo_url}
                    alt={policy.health_insurance_providers.provider_name}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Building className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {policy.health_insurance_providers.provider_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {policy.health_insurance_providers.contact_email}
                  </p>
                </div>
              </div>
              {policy.health_insurance_providers.website_url && (
                <a
                  href={policy.health_insurance_providers.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-300"
                >
                  <ExternalLink size={14} className="mr-1" />
                  Visit Website
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderFeaturesContent = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-gray-700 dark:text-white" />
          </div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Coverage Features & Exclusions
          </h5>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Coverage Features */}
          <div>
            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Coverage Features ({parsedFeatures.length})
            </h6>
            <div className="space-y-2">
              {parsedFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-900 dark:text-white">
                    {feature}
                  </span>
                </div>
              ))}
              {parsedFeatures.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No features listed
                </p>
              )}
            </div>
          </div>

          {/* Exclusions */}
          <div>
            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Exclusions ({parsedExclusions.length})
            </h6>
            <div className="space-y-2">
              {parsedExclusions.map((exclusion, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-900 dark:text-white">
                    {exclusion}
                  </span>
                </div>
              ))}
              {parsedExclusions.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No exclusions listed
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocumentsContent = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <FileCheck className="w-5 h-5 text-gray-700 dark:text-white" />
          </div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Required Documents
          </h5>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parsedDocuments.map((doc, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <FileText className="w-5 h-5 text-teal-500" />
              <span className="text-sm text-gray-900 dark:text-white">
                {doc}
              </span>
            </div>
          ))}
          {parsedDocuments.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 col-span-2">
              No documents required
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6 pb-0 border-b rounded-t-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <Shield className="w-8 h-8 text-gray-700 dark:text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Policy Details
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Complete insurance policy information
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                activeTab === "overview"
                  ? "bg-black text-white border border-black"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Eye size={16} />
                <span>Overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("features")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                activeTab === "features"
                  ? "bg-black text-white border border-black"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <ShieldCheck size={16} />
                <span>Features</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                activeTab === "documents"
                  ? "bg-black text-white border border-black"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText size={16} />
                <span>Documents</span>
              </div>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[70vh]">
          {/* Policy Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                {policy.health_insurance_providers?.logo_url ? (
                  <img
                    className="h-24 w-24 rounded-xl object-cover shadow-xl border-4 border-gray-300 dark:border-gray-700"
                    src={policy.health_insurance_providers.logo_url}
                    alt={policy.health_insurance_providers.provider_name}
                  />
                ) : (
                  <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-[#0067A1] to-[#004F7C] dark:from-[#004F7C] dark:to-[#003358] flex items-center justify-center text-white font-bold text-2xl shadow-xl border-4 border-gray-300 dark:border-gray-700">
                    <Shield className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {policy.policy_name}
                </h4>
                <p className="text-lg text-gray-700 dark:text-gray-300 font-semibold mb-3">
                  {policy.health_insurance_providers?.provider_name ||
                    "Unknown Provider"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 dark:bg-[#003358] text-[#004F7C] dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    <Shield size={14} className="mr-1" />
                    {getPolicyTypeLabel(policy.policy_type)}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                    <DollarSign size={14} className="mr-1" />
                    Sum: ₹{policy.sum_insured?.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-teal-100 dark:bg-[#003358] text-[#004F7C] dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    <CreditCard size={14} className="mr-1" />
                    Premium: ₹{policy.premium_amount?.toLocaleString()}
                  </span>
                  {policy.is_active ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                      <CheckCircle size={14} className="mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                      <XCircle size={14} className="mr-1" />
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "overview" && renderOverviewContent()}
            {activeTab === "features" && renderFeaturesContent()}
            {activeTab === "documents" && renderDocumentsContent()}
          </div>
        </div>

        <div className="p-6 border-t rounded-b-2xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-500">
              Created:{" "}
              {policy.created_at
                ? new Date(policy.created_at).toLocaleDateString()
                : "N/A"}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HealthInsurancePage() {
  const [providers, setProviders] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewPolicy, setViewPolicy] = useState(null);
  const [editPolicy, setEditPolicy] = useState(null);
  const [editProvider, setEditProvider] = useState(null);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("policies");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Fetch insurance providers
  const fetchProviders = async () => {
    try {
      const response = await fetch("/api/insurance/providers");
      const result = await response.json();
      if (result.success) {
        setProviders(result.data.providers || []);
      }
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast.error("Failed to load insurance providers");
    }
  };

  // Fetch insurance policies
  const fetchPolicies = async (
    page = 1,
    search = searchTerm,
    type = typeFilter,
    provider = providerFilter
  ) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
        ...(search && { search }),
        ...(type !== "all" && { type }),
        ...(provider !== "all" && { provider_id: provider }),
      });

      const response = await fetch(`/api/insurance/policies?${params}`);
      const result = await response.json();

      if (result.success) {
        setPolicies(result.data.policies || []);
        setPagination({
          currentPage: result.data.pagination?.page || 1,
          totalPages: result.data.pagination?.totalPages || 1,
          totalItems: result.data.pagination?.total || 0,
          itemsPerPage: result.data.pagination?.limit || 10,
          hasNextPage:
            (result.data.pagination?.page || 1) <
            (result.data.pagination?.totalPages || 1),
          hasPrevPage: (result.data.pagination?.page || 1) > 1,
        });
      } else {
        toast.error(result.message || "Failed to fetch insurance policies");
      }
    } catch (error) {
      console.error("Error fetching policies:", error);
      toast.error("Failed to load insurance policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (activeTab === "policies") {
      fetchPolicies(
        pagination.currentPage,
        searchTerm,
        typeFilter,
        providerFilter
      );
    }
  }, [
    searchTerm,
    typeFilter,
    providerFilter,
    pagination.itemsPerPage,
    activeTab,
  ]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
      fetchPolicies(newPage);
    }
  };

  const handleItemsPerPageChange = (newLimit) => {
    const newPagination = {
      ...pagination,
      itemsPerPage: parseInt(newLimit),
      currentPage: 1,
    };
    setPagination(newPagination);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(
      1,
      pagination.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(
      pagination.totalPages,
      startPage + maxVisiblePages - 1
    );

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    if (selectedIds.length === 0) return toast.error("No policies selected!");

    try {
      // Implement bulk delete API call here
      toast.success("Policies deleted successfully!");
      setSelectedIds([]);
      fetchPolicies();
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleSaveProvider = async (formData) => {
    try {
      const url = editProvider
        ? `/api/insurance/providers/${editProvider.id}`
        : "/api/insurance/providers";
      const method = editProvider ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message);

      fetchProviders();
      setEditProvider(null);
      setProviderModalOpen(false);
    } catch (error) {
      throw error;
    }
  };

  const handleSavePolicy = async (formData) => {
    try {
      const url = editPolicy
        ? `/api/insurance/policies/${editPolicy.id}`
        : "/api/insurance/policies";
      const method = editPolicy ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.message);

      fetchPolicies();
      setEditPolicy(null);
      setPolicyModalOpen(false);
    } catch (error) {
      throw error;
    }
  };

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "I"
    );
  };

  const getPolicyTypeLabel = (type) => {
    const types = {
      individual: "Individual",
      family: "Family",
      senior_citizen: "Senior Citizen",
      critical_illness: "Critical Illness",
      top_up: "Top-up",
      super_top_up: "Super Top-up",
      maternity: "Maternity",
      group: "Group",
    };
    return types[type] || type;
  };

  const policyTypes = [
    { value: "all", label: "All Types" },
    { value: "individual", label: "Individual" },
    { value: "family", label: "Family Floater" },
    { value: "senior_citizen", label: "Senior Citizen" },
    { value: "critical_illness", label: "Critical Illness" },
    { value: "top_up", label: "Top-up" },
    { value: "super_top_up", label: "Super Top-up" },
    { value: "maternity", label: "Maternity" },
    { value: "group", label: "Group Insurance" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
    hover: {
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 400,
      },
    },
  };

  return (
    <>
      <main className="flex-1 overflow-auto relative z-0">
        <div className="p-2 md:p-4 bg-transparent">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 rounded-2xl to-gray-100 dark:from-gray-900 dark:to-gray-800 p-2 md:p-4 lg:p-6">
              {/* Header Section */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <motion.h4
                      className="text-4xl font-bold text-gray-900 dark:text-white mb-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      Health Insurance Management
                    </motion.h4>
                    <motion.p
                      className="text-gray-600 dark:text-gray-400 mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      Manage insurance providers and policies for users
                    </motion.p>
                  </div>
                  <div className="flex gap-3 mt-4 sm:mt-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setEditProvider(null);
                        setProviderModalOpen(true);
                      }}
                      className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all duration-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Plus size={18} className="mr-2" />
                      Add Provider
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setEditPolicy(null);
                        setPolicyModalOpen(true);
                      }}
                      className="flex items-center px-4 py-2 text-sm bg-black text-white font-semibold rounded-lg transition-all duration-300 cursor-pointer shadow-sm border border-gray-300 dark:border-gray-700 hover:bg-gray-800"
                    >
                      <Plus size={20} className="mr-2" />
                      Add Policy
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Tabs */}
              <motion.div
                className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setActiveTab("policies")}
                    className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                      activeTab === "policies"
                        ? "bg-black text-white border border-black"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <FileText size={18} />
                      <span>Insurance Policies</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("providers")}
                    className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                      activeTab === "providers"
                        ? "bg-black text-white border border-black"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Building size={18} />
                      <span>Insurance Providers</span>
                    </div>
                  </button>
                </div>
              </motion.div>

              {/* Stats Cards */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {[
                  {
                    label: "Total Policies",
                    value: policies.length,
                    icon: FileText,
                    color:
                      "from-[#0067A1] to-[#004F7C] dark:from-[#003358] dark:to-[#003358]",
                  },
                  {
                    label: "Active Policies",
                    value: policies.filter((p) => p.is_active).length,
                    icon: CheckCircle,
                    color:
                      "from-green-500 to-green-600 dark:from-green-800 dark:to-green-900",
                  },
                  {
                    label: "Insurance Providers",
                    value: providers.length,
                    icon: Building,
                    color:
                      "from-[#004F7C] to-[#003358] dark:from-[#003358] dark:to-[#003358]",
                  },
                  {
                    label: "Active Providers",
                    value: providers.filter((p) => p.is_active).length,
                    icon: ShieldCheck,
                    color:
                      "from-orange-500 to-orange-600 dark:from-orange-800 dark:to-orange-900",
                  },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    variants={cardVariants}
                    whileHover="hover"
                    className="bg-white dark:bg-gray-800/80 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700/50 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className={`p-3 bg-gradient-to-r ${stat.color} rounded-xl shadow-sm border border-gray-300 dark:border-gray-600`}
                      >
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {activeTab === "policies" && (
                <>
                  {/* Controls Section */}
                  <motion.div
                    className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6 mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Search Bar */}
                      <motion.div
                        className="relative flex-1 max-w-md"
                        whileFocus={{ scale: 1.02 }}
                      >
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                        <input
                          type="text"
                          placeholder="Search policies by name, provider, or type..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 cursor-text"
                        />
                      </motion.div>

                      {/* Filters and Actions */}
                      <div className="flex flex-wrap items-center gap-3">
                        <motion.select
                          whileFocus={{ scale: 1.05 }}
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 cursor-pointer"
                        >
                          {policyTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </motion.select>

                        <motion.select
                          whileFocus={{ scale: 1.05 }}
                          value={providerFilter}
                          onChange={(e) => setProviderFilter(e.target.value)}
                          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 cursor-pointer"
                        >
                          <option value="all">All Providers</option>
                          {providers.map((provider) => (
                            <option key={provider.id} value={provider.id}>
                              {provider.provider_name}
                            </option>
                          ))}
                        </motion.select>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => fetchPolicies(1)}
                          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300 cursor-pointer"
                        >
                          <Filter size={20} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => fetchPolicies(pagination.currentPage)}
                          disabled={loading}
                          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <RefreshCw
                            size={20}
                            className={loading ? "animate-spin" : ""}
                          />
                        </motion.button>
                      </div>
                    </div>

                    {/* Bulk Actions */}
                    <AnimatePresence>
                      {selectedIds.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center justify-between mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800/50"
                        >
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                            <span className="text-red-700 dark:text-red-300 font-medium">
                              {selectedIds.length} policy(s) selected
                            </span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setConfirmOpen(true)}
                              className="flex items-center px-3 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium rounded-lg transition-all duration-300 cursor-pointer text-sm"
                            >
                              <Trash2 size={16} className="mr-1" />
                              Delete Selected
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Policies Table */}
                  <motion.div
                    className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/50 overflow-hidden mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    {loading ? (
                      <motion.div
                        className="flex items-center justify-center py-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <RefreshCw size={32} className="text-gray-400" />
                        </motion.div>
                      </motion.div>
                    ) : policies.length === 0 ? (
                      <motion.div
                        className="text-center py-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No insurance policies found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-500 mb-4">
                          {searchTerm ||
                          typeFilter !== "all" ||
                          providerFilter !== "all"
                            ? "Try adjusting your search criteria"
                            : "Get started by adding your first insurance policy"}
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setEditPolicy(null);
                            setPolicyModalOpen(true);
                          }}
                          className="inline-flex items-center px-4 py-2 bg-black text-white font-medium rounded-lg transition-all duration-300 cursor-pointer border border-gray-300 dark:border-gray-700 hover:bg-gray-800"
                        >
                          <Plus size={20} className="mr-2" />
                          Add New Policy
                        </motion.button>
                      </motion.div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700/80 border-b border-gray-200 dark:border-gray-600">
                            <tr>
                              <th className="px-4 py-3 text-left">
                                <input
                                  type="checkbox"
                                  onChange={(e) =>
                                    setSelectedIds(
                                      e.target.checked
                                        ? policies.map((p) => p.id)
                                        : []
                                    )
                                  }
                                  checked={
                                    policies.length > 0 &&
                                    selectedIds.length === policies.length
                                  }
                                  className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700 cursor-pointer"
                                />
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Policy
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Provider
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Coverage
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Premium
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {policies.map((policy, index) => {
                              const parsedFeatures = Array.isArray(
                                policy.features
                              )
                                ? policy.features
                                : typeof policy.features === "string"
                                ? JSON.parse(policy.features)
                                : [];

                              return (
                                <motion.tr
                                  key={policy.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-300"
                                >
                                  <td className="px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.includes(policy.id)}
                                      onChange={() => toggleSelect(policy.id)}
                                      className="rounded border-gray-300 dark:border-gray-600 text-black focus:ring-black bg-white dark:bg-gray-700 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-10 w-10">
                                        {policy.health_insurance_providers
                                          ?.logo_url ? (
                                          <motion.img
                                            whileHover={{ scale: 1.1 }}
                                            className="h-10 w-10 rounded-lg object-cover shadow-sm"
                                            src={
                                              policy.health_insurance_providers
                                                .logo_url
                                            }
                                            alt=""
                                          />
                                        ) : (
                                          <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#0067A1] to-[#004F7C] dark:from-[#004F7C] dark:to-[#003358] flex items-center justify-center text-white font-medium text-sm shadow-sm"
                                          >
                                            <Shield className="w-5 h-5" />
                                          </motion.div>
                                        )}
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {policy.policy_name}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          {getPolicyTypeLabel(
                                            policy.policy_type
                                          )}{" "}
                                          • ₹
                                          {policy.sum_insured?.toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-sm text-gray-900 dark:text-white">
                                      {policy.health_insurance_providers
                                        ?.provider_name || "Unknown Provider"}
                                    </div>
                                    {policy.health_insurance_providers
                                      ?.contact_email && (
                                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                        {
                                          policy.health_insurance_providers
                                            .contact_email
                                        }
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-sm text-gray-900 dark:text-white">
                                      <div className="flex items-center space-x-4">
                                        <div className="flex items-center space-x-1">
                                          <User
                                            size={14}
                                            className="text-gray-500"
                                          />
                                          <span>
                                            Age: {policy.min_age}-
                                            {policy.max_age}
                                          </span>
                                        </div>
                                        {policy.cashless_facility && (
                                          <div className="flex items-center space-x-1">
                                            <CheckCircle
                                              size={14}
                                              className="text-green-500"
                                            />
                                            <span>Cashless</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center flex-wrap gap-1">
                                      {parsedFeatures.length > 0 && (
                                        <span className="text-gray-500">
                                          {parsedFeatures.length} features
                                        </span>
                                      )}
                                      {policy.co_payment > 0 && (
                                        <span className="text-orange-600 dark:text-orange-400">
                                          • Co-pay: {policy.co_payment}%
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-sm text-gray-900 dark:text-white font-medium">
                                      ₹{policy.premium_amount?.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                      {policy.premium_type}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        policy.is_active
                                          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
                                          : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                                      }`}
                                    >
                                      {policy.is_active ? "Active" : "Inactive"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => {
                                          setViewPolicy(policy);
                                          setDetailsModalOpen(true);
                                        }}
                                        className="p-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-all duration-300 cursor-pointer"
                                        title="View Details"
                                      >
                                        <Eye size={18} />
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                          setEditPolicy(policy);
                                          setPolicyModalOpen(true);
                                        }}
                                        className="p-2 text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-300 transition-all duration-300 cursor-pointer"
                                        title="Edit"
                                      >
                                        <Edit size={18} />
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => toggleSelect(policy.id)}
                                        className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-all duration-300 cursor-pointer"
                                        title="Delete"
                                      >
                                        <Trash2 size={18} />
                                      </motion.button>
                                    </div>
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                  {policies.length > 0 && (
                    <motion.div
                      className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                    >
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Showing{" "}
                          {(pagination.currentPage - 1) *
                            pagination.itemsPerPage +
                            1}{" "}
                          to{" "}
                          {Math.min(
                            pagination.currentPage * pagination.itemsPerPage,
                            pagination.totalItems
                          )}{" "}
                          of {pagination.totalItems} policies
                        </div>

                        <div className="flex items-center space-x-4">
                          {/* Items Per Page Selector */}
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <span>Show:</span>
                            <select
                              value={pagination.itemsPerPage}
                              onChange={(e) =>
                                handleItemsPerPageChange(
                                  parseInt(e.target.value)
                                )
                              }
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-black focus:border-transparent cursor-pointer"
                            >
                              <option value={5}>5</option>
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                            </select>
                            <span>per page</span>
                          </div>

                          {/* Pagination Controls */}
                          <div className="flex items-center space-x-1">
                            {/* First Page */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handlePageChange(1)}
                              disabled={!pagination.hasPrevPage}
                              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                            >
                              <ChevronsLeft size={16} />
                            </motion.button>

                            {/* Previous Page */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() =>
                                handlePageChange(pagination.currentPage - 1)
                              }
                              disabled={!pagination.hasPrevPage}
                              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                            >
                              <ChevronLeft size={16} />
                            </motion.button>

                            {/* Page Numbers */}
                            {getPageNumbers().map((pageNum) => (
                              <motion.button
                                key={pageNum}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-300 cursor-pointer ${
                                  pageNum === pagination.currentPage
                                    ? "bg-black border-transparent text-white shadow-sm"
                                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                                }`}
                              >
                                {pageNum}
                              </motion.button>
                            ))}

                            {/* Next Page */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() =>
                                handlePageChange(pagination.currentPage + 1)
                              }
                              disabled={!pagination.hasNextPage}
                              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                            >
                              <ChevronRight size={16} />
                            </motion.button>

                            {/* Last Page */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() =>
                                handlePageChange(pagination.totalPages)
                              }
                              disabled={!pagination.hasNextPage}
                              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all duration-300"
                            >
                              <ChevronsRight size={16} />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}

              {activeTab === "providers" && (
                <motion.div
                  className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700/50 overflow-hidden mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  {providers.length === 0 ? (
                    <motion.div
                      className="text-center py-12"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No insurance providers found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-500 mb-4">
                        Get started by adding your first insurance provider
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setEditProvider(null);
                          setProviderModalOpen(true);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-black text-white font-medium rounded-lg transition-all duration-300 cursor-pointer border border-gray-300 dark:border-gray-700 hover:bg-gray-800"
                      >
                        <Plus size={20} className="mr-2" />
                        Add New Provider
                      </motion.button>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                      {providers.map((provider, index) => (
                        <motion.div
                          key={provider.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300"
                        >
                          <div className="flex items-center space-x-4 mb-4">
                            {provider.logo_url ? (
                              <img
                                className="h-12 w-12 rounded-lg object-cover"
                                src={provider.logo_url}
                                alt={provider.provider_name}
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#0067A1] to-[#004F7C] flex items-center justify-center">
                                <Building className="w-6 h-6 text-white" />
                              </div>
                            )}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {provider.provider_name}
                              </h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {provider.rating || 0} (
                                  {provider.total_reviews || 0} reviews)
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                            {provider.description ||
                              "No description available."}
                          </p>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Mail className="w-4 h-4" />
                              <span>{provider.contact_email}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Phone className="w-4 h-4" />
                              <span>{provider.contact_phone}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                provider.is_active
                                  ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300"
                                  : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300"
                              }`}
                            >
                              {provider.is_active ? "Active" : "Inactive"}
                            </span>
                            <div className="flex space-x-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setEditProvider(provider);
                                  setProviderModalOpen(true);
                                }}
                                className="p-2 text-[#0067A1] dark:text-[#0080C6] hover:text-[#004F7C] dark:hover:text-teal-300 transition-all duration-300 cursor-pointer"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Insurance Provider Modal */}
      <InsuranceProviderModal
        isOpen={providerModalOpen}
        onClose={() => {
          setProviderModalOpen(false);
          setEditProvider(null);
        }}
        provider={editProvider}
        onSave={handleSaveProvider}
      />

      {/* Insurance Policy Modal */}
      <InsurancePolicyModal
        isOpen={policyModalOpen}
        onClose={() => {
          setPolicyModalOpen(false);
          setEditPolicy(null);
        }}
        policy={editPolicy}
        providers={providers}
        onSave={handleSavePolicy}
      />

      {/* Policy Details Modal */}
      <PolicyDetailsModal
        policy={viewPolicy}
        isOpen={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setViewPolicy(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md transform transition-all border border-gray-200 dark:border-gray-700"
            >
              <div className="p-6 text-center">
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Confirm Deletion
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete {selectedIds.length}{" "}
                  policy(s)? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setConfirmOpen(false)}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDelete}
                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg transition-all duration-300 font-medium cursor-pointer"
                  >
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
