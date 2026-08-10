"use client";

import { useState, useEffect, useRef } from "react";
import {
  FaTimes,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendar,
  FaHeart,
  FaVenusMars,
  FaCamera,
  FaEdit,
} from "react-icons/fa";

const EditProfileModal = ({ isOpen, onClose, userData, onSave }) => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    gender: "",
    blood_group: "",
    date_of_birth: "",
    address: "",
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && userData) {
      setFormData({
        full_name: userData.user.details.full_name || "",
        email: userData.user.details.email || "",
        phone_number: userData.user.phone_number || "",
        gender: userData.user.details.gender || "",
        blood_group: userData.user.details.blood_group || "",
        date_of_birth: userData.user.details.date_of_birth || "",
        address: userData.user.details.address || "",
      });
      setErrors({});
      setPreviewImage(null);
    }
  }, [isOpen, userData]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setFormData(prev => ({ ...prev, profile_picture_file: file, profile_picture_preview: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.gender) {
      newErrors.gender = "Gender is required";
    }

    if (!formData.date_of_birth) {
      newErrors.date_of_birth = "Date of birth is required";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave?.(formData);
      onClose();
    } catch (error) {
      console.error("Failed to save profile:", error);
      // Keep modal open on error so user can correct issues if any
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex h-full items-center justify-center p-4">
        <div
          className="relative flex flex-col w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-6 bg-[#0067A1]">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FaUser className="text-[#a7f3d0]" /> Edit Profile
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors duration-200 text-white/80 hover:text-white"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 bg-[#F8FAFC]">

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {/* Profile Picture Upload Placeholder */}
              <div className="flex justify-center mb-8">
                <div
                  className="relative group cursor-pointer"
                  onClick={handleImageClick}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center relative">
                    {previewImage ? (
                      <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : userData?.user?.profile_picture ? (
                      <img src={userData.user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-[#0067A1]">{formData.full_name?.charAt(0)}</span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <FaCamera className="text-white w-6 h-6" />
                  </div>
                  <div className="absolute bottom-0 right-0 bg-[#0067A1] text-white p-1.5 rounded-full border-2 border-white shadow-sm">
                    <FaEdit className="w-3 h-3" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <FormField
                    icon={FaUser}
                    label="Full Name"
                    name="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={handleChange}
                    error={errors.full_name}
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email */}
                <FormField
                  icon={FaEnvelope}
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  placeholder="Enter your email"
                />

                {/* Phone Number (Disabled) */}
                <FormField
                  icon={FaPhone}
                  label="Phone Number"
                  name="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={handleChange}
                  disabled
                  placeholder="Phone number"
                />

                {/* Gender */}
                <div className="space-y-2">
                  <label className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <FaVenusMars className="h-4 w-4 mr-2 text-[#0067A1]" />
                    Gender
                  </label>
                  <div className="relative">
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border ${errors.gender ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
                        } rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-transparent outline-none transition-all duration-200 appearance-none`}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                  </div>
                  {errors.gender && (
                    <p className="text-xs text-red-500 ml-1">{errors.gender}</p>
                  )}
                </div>

                {/* Blood Group */}
                <div className="space-y-2">
                  <label className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <FaHeart className="h-4 w-4 mr-2 text-red-500" />
                    Blood Group
                  </label>
                  <div className="relative">
                    <select
                      name="blood_group"
                      value={formData.blood_group}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-transparent outline-none transition-all duration-200 bg-white appearance-none"
                    >
                      <option value="">Select Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                  </div>
                </div>

                {/* Date of Birth */}
                <FormField
                  icon={FaCalendar}
                  label="Date of Birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  error={errors.date_of_birth}
                />

                {/* Address */}
                <div className="md:col-span-2 space-y-2">
                  <label className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <FaMapMarkerAlt className="h-4 w-4 mr-2 text-[#0067A1]" />
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={2}
                    className={`w-full px-4 py-3 border ${errors.address ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
                      } rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-transparent outline-none transition-all duration-200 resize-none`}
                    placeholder="Enter your address"
                  />
                  {errors.address && (
                    <p className="text-xs text-red-500 ml-1">{errors.address}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="shrink-0 flex items-center justify-end space-x-4 p-6 border-t border-gray-100 bg-white shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-10 relative">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-2.5 bg-[#0067A1] text-white font-semibold rounded-xl shadow-lg shadow-teal-100 hover:bg-[#004F7C] hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Helper component for form fields
const FormField = ({
  icon: Icon,
  label,
  name,
  type,
  value,
  onChange,
  error,
  disabled,
  placeholder,
}) => (
  <div className="space-y-2">
    <label className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
      <Icon className="h-4 w-4 mr-2 text-[#0067A1]" />
      {label}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full px-4 py-3 border ${error ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
        } rounded-xl focus:ring-2 focus:ring-[#0067A1] focus:border-transparent outline-none transition-all duration-200 ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed border-dashed" : ""
        }`}
    />
    {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
  </div>
);

export default EditProfileModal;
