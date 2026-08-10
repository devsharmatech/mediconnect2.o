"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronDown, FaSearch, FaQuestionCircle } from "react-icons/fa";
import Link from "next/link";
import { HiSparkles } from "react-icons/hi2";

export default function FaqsPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [openId, setOpenId] = useState(null);
  const [headerData, setHeaderData] = useState(null);

  useEffect(() => {
    fetchData();
    fetchHeader();
  }, []);

  const fetchHeader = async () => {
    try {
      const res = await fetch("/api/cms/section-headers?page=faqs");
      const result = await res.json();
      if (result.success && result.data) {
        setHeaderData(result.data);
      }
    } catch (err) {
      console.error("Failed to load header", err);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cms/faqs");
      const result = await res.json();
      if (result.success) {
        // Sort by display order, filter out inactive
        const filtered = (result.data || [])
          .filter(f => f.status === "active")
          .sort((a, b) => a.display_order - b.display_order);
        setFaqs(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch FAQs", err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories
  const categories = ["All", ...new Set(faqs.map(f => f.category || "General"))];

  // Filter FAQs based on search and category
  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || (faq.category || "General") === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Banner */}
      <div className="bg-[#0067A1] px-6 py-10 md:px-10 md:py-14 text-center text-white">
        <div className="container mx-auto max-w-full flex flex-col items-center">
          {headerData?.title && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              <HiSparkles className="h-4 w-4 text-emerald-300" />
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-teal-100 uppercase">
                {headerData.title}
              </span>
            </div>
          )}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
            {headerData?.heading || "Frequently Asked Questions"}
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/90 max-w-2xl mx-auto">
            {headerData?.subheading || "Find answers to common questions about mediconnect.fit, our services, doctors, and lab tests."}
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mt-8 relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <FaSearch className="h-4 w-4 text-gray-400 group-focus-within:text-[#0067A1] transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3 md:py-4 border-none rounded-xl leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0067A1] text-sm shadow-sm transition-all"
              placeholder="Search for an answer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-10">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-10 h-10 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-medium tracking-wide">Loading answers...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10 border border-gray-100">

            {/* Category Filter */}
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-10 pb-6 border-b border-gray-100">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeCategory === cat
                      ? "bg-[#0067A1] text-white shadow-md shadow-[#0067A1]/20 transform scale-105"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* FAQ List */}
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-16">
                <FaQuestionCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-500">We couldn't find any FAQs matching your search.</p>
                <button
                  onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
                  className="mt-6 text-[#0067A1] font-semibold hover:underline"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFaqs.map((faq) => (
                  <div
                    key={faq.id}
                    className={`border rounded-xl overflow-hidden transition-all duration-300 ${openId === faq.id ? 'border-[#0067A1] bg-[#0067A1]/5' : 'border-gray-200 hover:border-[#0067A1]/30 bg-white'}`}
                  >
                    <button
                      className="w-full px-6 py-5 text-left focus:outline-none flex justify-between items-center group"
                      onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                    >
                      <span className={`font-bold text-lg pr-8 transition-colors ${openId === faq.id ? 'text-[#0067A1]' : 'text-gray-900 group-hover:text-[#0067A1]'}`}>
                        {faq.question}
                      </span>
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${openId === faq.id ? 'bg-[#0067A1] text-white rotate-180' : 'bg-gray-100 text-gray-500 group-hover:bg-teal-100 group-hover:text-[#0067A1]'}`}>
                        <FaChevronDown className="w-4 h-4" />
                      </div>
                    </button>
                    <AnimatePresence>
                      {openId === faq.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100 pt-4 mt-2">
                            {faq.answer.split('\n').map((line, i) => (
                              <p key={i} className="mb-2 last:mb-0">{line}</p>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}

            {/* Contact CTA */}
            <div className="mt-16 bg-[#F6F8FA] rounded-2xl p-8 border border-gray-200 text-center relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">Still have questions?</h3>
                <p className="text-gray-600 mb-6 max-w-xl mx-auto text-sm md:text-base">Can't find the answer you're looking for? Our friendly team is here to help you out.</p>
                <Link href="/website/contact" className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#0067A1] text-white font-semibold rounded-xl hover:bg-[#004F7C] transition-all text-sm shadow-sm hover:shadow-md">
                  Contact Support
                </Link>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
