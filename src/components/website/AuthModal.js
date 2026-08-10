'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, UserIcon, PhoneIcon, EnvelopeIcon, CameraIcon, MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline';

export default function AuthModal({ isOpen, onClose, userType }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    name: '',
    dob: '',
    address: '',
    image: null
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setFormData(prev => ({ ...prev, image: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', { userType, isLogin, ...formData });
    
    // Handle authentication logic here
    // After successful authentication, redirect to dashboard
    if (isLogin) {
      window.location.href = `/${userType}/dashboard`;
    } else {
      // Handle registration logic
      window.location.href = `/${userType}/dashboard`;
    }
  };

  const getUserTypeConfig = () => {
    const configs = {
      patient: { title: 'Patient', color: 'blue' },
      doctor: { title: 'Doctor', color: 'green' },
      lab: { title: 'Laboratory', color: 'orange' },
      chemist: { title: 'Chemist', color: 'purple' }
    };
    return configs[userType] || configs.patient;
  };

  const config = getUserTypeConfig();

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        gradient: 'from-[#0067A1] to-[#004F7C]',
        hover: 'from-blue-700 to-blue-800',
        text: 'text-[#0067A1]',
        border: 'border-blue-600'
      },
      green: {
        gradient: 'from-green-600 to-green-700',
        hover: 'from-green-700 to-green-800',
        text: 'text-green-600',
        border: 'border-green-600'
      },
      orange: {
        gradient: 'from-orange-600 to-orange-700',
        hover: 'from-orange-700 to-orange-800',
        text: 'text-orange-600',
        border: 'border-orange-600'
      },
      purple: {
        gradient: 'from-purple-600 to-purple-700',
        hover: 'from-purple-700 to-purple-800',
        text: 'text-purple-600',
        border: 'border-purple-600'
      }
    };
    return colors[color] || colors.blue;
  };

  const colorClasses = getColorClasses(config.color);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${colorClasses.gradient} p-6 text-white`}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">
                    {isLogin ? 'Welcome Back' : `Join as ${config.title}`}
                  </h2>
                  <p className="text-blue-100 mt-1">
                    {isLogin ? 'Sign in to your account' : `Create your ${config.title} account`}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-4 font-semibold text-center transition-colors ${
                  isLogin 
                    ? `${colorClasses.text} border-b-2 ${colorClasses.border}` 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-4 font-semibold text-center transition-colors ${
                  !isLogin 
                    ? `${colorClasses.text} border-b-2 ${colorClasses.border}` 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Register
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!isLogin && (
                <>
                  {/* Image Upload */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {formData.image ? (
                          <img 
                            src={URL.createObjectURL(formData.image)} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-[#0067A1] text-white p-1.5 rounded-full cursor-pointer hover:bg-[#004F7C] transition-colors">
                        <CameraIcon className="w-4 h-4" />
                        <input
                          type="file"
                          name="image"
                          accept="image/*"
                          onChange={handleInputChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <UserIcon className="w-4 h-4" />
                      <span>Full Name *</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required={!isLogin}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <PhoneIcon className="w-4 h-4" />
                      <span>Phone Number *</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <EnvelopeIcon className="w-4 h-4" />
                      <span>Email (Optional)</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your email address"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Date of Birth *</span>
                    </label>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleInputChange}
                      required={!isLogin}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <MapPinIcon className="w-4 h-4" />
                      <span>Address *</span>
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required={!isLogin}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      placeholder="Enter your complete address"
                    />
                  </div>
                </>
              )}

              {/* Login Form */}
              {isLogin && (
                <>
                  <div>
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                      <PhoneIcon className="w-4 h-4" />
                      <span>Phone Number *</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Password *
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter your password"
                    />
                  </div>
                </>
              )}

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className={`w-full bg-gradient-to-r ${colorClasses.gradient} text-white py-4 rounded-lg font-semibold hover:bg-gradient-to-r ${colorClasses.hover} transition-all duration-300 shadow-lg hover:shadow-xl`}
              >
                {isLogin ? 'Sign In' : `Create ${config.title} Account`}
              </motion.button>

              {/* Footer Text */}
              <p className="text-center text-gray-600 text-sm">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className={`${colorClasses.text} hover:${colorClasses.text.replace('600', '700')} font-semibold`}
                >
                  {isLogin ? 'Register here' : 'Login here'}
                </button>
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}