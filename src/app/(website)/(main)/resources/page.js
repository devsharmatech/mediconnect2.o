"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHeartbeat, FaBookOpen, FaVideo, FaCalendarAlt, FaExternalLinkAlt, FaTimes, FaArrowRight } from "react-icons/fa";
import Link from "next/link";

export default function ResourcesPage() {
  const [resources, setResources] = useState({
    guide: [],
    telemedicine_info: [],
    health_update: [],
    article: []
  });
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [headerData, setHeaderData] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);

  useEffect(() => {
    fetchHeader();
    fetchResources();
    fetchNews();
  }, []);

  const fetchHeader = async () => {
    try {
      const res = await fetch("/api/cms/section-headers?page=resources");
      const result = await res.json();
      if (result.success && result.data) {
        setHeaderData(result.data);
      }
    } catch (err) {
      console.error("Failed to load header", err);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await fetch("/api/cms/resources");
      const result = await res.json();
      if (result.success) {
        const published = (result.data || []).filter(r => r.status === "published");
        const grouped = {
          guide: published.filter(r => r.type === "guide"),
          telemedicine_info: published.filter(r => r.type === "telemedicine_info"),
          health_update: published.filter(r => r.type === "health_update"),
          article: published.filter(r => r.type === "article"),
        };
        setResources(grouped);
      }
    } catch (err) {
      console.error("Failed to fetch resources", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNews = async () => {
    try {
      const res = await fetch("/api/medical-news");
      const result = await res.json();
      if (result.success && result.data?.items) {
        setNews(result.data.items);
      }
    } catch (err) {
      console.error("Failed to fetch internal medical news", err);
    } finally {
      setNewsLoading(false);
    }
  };

  // Body scroll lock and Esc key handler for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedNews(null);
    };

    if (selectedNews) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [selectedNews]);

  const SectionHeading = ({ icon: Icon, title, description }) => (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1.5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#F7FAFC] border border-[#DCE6EB] text-[#1677A8] shrink-0">
          <Icon className="w-5 h-5 text-[#1677A8]" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B3A5B]">{title}</h2>
      </div>
      {description && <p className="text-xs sm:text-sm text-[#607580] ml-13 leading-relaxed">{description}</p>}
    </div>
  );

  const ResourceCard = ({ item }) => (
    <Link 
      href={`/website/resources/${item.slug}`} 
      className="group h-full flex flex-col bg-white rounded-2xl border border-[#DCE6EB] shadow-2xs hover:shadow-xs hover:border-[#1677A8]/50 transition-all duration-200 overflow-hidden"
    >
      {item.image && (
        <div className="h-44 sm:h-48 overflow-hidden relative bg-[#F7FAFC] border-b border-[#DCE6EB]">
          <img 
            src={item.image} 
            alt={item.title} 
            className="w-full h-full object-cover transform group-hover:scale-103 transition-transform duration-300" 
          />
        </div>
      )}
      <div className="p-5 sm:p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="px-2.5 py-0.5 bg-[#E8F2F7] text-[#1677A8] text-[10px] font-bold uppercase tracking-wider rounded-md">
            {item.type.replace('_', ' ')}
          </span>
        </div>
        <h3 className="text-base sm:text-lg font-bold text-[#0B3A5B] mb-2 group-hover:text-[#1677A8] transition-colors line-clamp-2">
          {item.title}
        </h3>
        <p 
          className="text-xs text-[#607580] mb-5 flex-grow line-clamp-3 leading-relaxed" 
          dangerouslySetInnerHTML={{ __html: item.content?.replace(/<[^>]+>/g, '').substring(0, 140) + '...' }}
        />
        <div className="flex items-center text-[#1677A8] font-bold text-xs group-hover:translate-x-0.5 transition-transform mt-auto pt-3 border-t border-[#DCE6EB]/60">
          Read Guide <FaArrowRight className="ml-1.5 w-3 h-3" />
        </div>
      </div>
    </Link>
  );

  const NewsCard = ({ article, onClick }) => (
    <div 
      onClick={onClick} 
      className="group flex gap-3.5 p-3.5 rounded-xl border border-transparent hover:border-[#DCE6EB] hover:bg-[#F7FAFC] transition-all duration-200 items-start cursor-pointer"
    >
      <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-white border border-[#DCE6EB] text-[#1677A8] shadow-2xs">
        <FaHeartbeat className="w-5 h-5 text-[#1677A8]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[11px] text-[#1677A8] font-semibold mb-1">
          <FaCalendarAlt className="text-[#1677A8]/70 w-3 h-3" />
          <span className="text-[#607580]">
            {new Date(article.news_date || article.publishedAt || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="text-gray-300">•</span>
          <span className="text-[#1677A8] truncate">{article.category || (typeof article.source === 'object' ? article.source?.name : article.source) || "News"}</span>
        </div>
        <h4 className="text-xs sm:text-sm font-bold text-[#0B3A5B] group-hover:text-[#1677A8] line-clamp-2 mb-1 leading-snug">
          {article.title}
        </h4>
        <p className="text-[#607580] text-xs line-clamp-2 leading-relaxed">{article.summary}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-20 w-full overflow-x-hidden">
      {/* 1. HERO HEADER */}
      <section className="bg-[#F7FAFC] border-b border-[#DCE6EB] py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#1677A8] uppercase mb-2">
            {headerData?.title || "HEALTH GUIDES & MEDICAL BRIEFINGS"}
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-[#0B3A5B] tracking-tight mb-3">
            {headerData?.heading || "Health Guides & Updates"}
          </h1>
          <p className="text-sm sm:text-base text-[#607580] max-w-2xl mx-auto leading-relaxed">
            {headerData?.subheading || "Access expert guides, understand your telemedicine options, and stay informed with the latest medical news."}
          </p>
        </div>
      </section>

      {/* 2. MAIN CONTENT BODY */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#DCE6EB]">
            <div className="w-9 h-9 border-3 border-[#1677A8] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-semibold text-[#607580] tracking-wide">Loading resources...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Guides Section */}
            {(resources.guide.length > 0 || resources.article.length > 0) && (
              <section className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 border border-[#DCE6EB] shadow-2xs">
                <SectionHeading 
                  icon={FaBookOpen} 
                  title="Patient Guides" 
                  description="Step-by-step guides on preparing for consultations, understanding lab reports, and knowing when to see a doctor."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resources.guide.map(item => <ResourceCard key={item.id} item={item} />)}
                  {resources.article.map(item => <ResourceCard key={item.id} item={item} />)}
                </div>
              </section>
            )}

            {/* Telemedicine & Health Updates Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Telemedicine & Health Updates (Left col) */}
              <div className="lg:col-span-7 space-y-8">
                {resources.telemedicine_info.length > 0 && (
                  <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#DCE6EB] shadow-2xs">
                    <SectionHeading 
                      icon={FaVideo} 
                      title="Telemedicine Information" 
                      description="Clear explanations on how our virtual consultations work."
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {resources.telemedicine_info.map(item => <ResourceCard key={item.id} item={item} />)}
                    </div>
                  </section>
                )}

                {resources.health_update.length > 0 && (
                  <section className="bg-[#F7FAFC] rounded-3xl p-6 sm:p-8 border border-[#DCE6EB] shadow-2xs">
                    <SectionHeading 
                      icon={FaHeartbeat} 
                      title="Preventive Health Updates" 
                      description="Important preventive care information curated by our clinical team."
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {resources.health_update.map(item => <ResourceCard key={item.id} item={item} />)}
                    </div>
                  </section>
                )}
              </div>

              {/* Live Medical News Feed (Right col) */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-3xl border border-[#DCE6EB] shadow-2xs overflow-hidden flex flex-col h-[650px] sticky top-24">
                  <div className="p-5 border-b border-[#DCE6EB] bg-[#F7FAFC]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold tracking-widest text-[#1677A8] uppercase">
                        DAILY DIGEST
                      </span>
                      <span className="px-2.5 py-0.5 bg-[#1677A8]/10 text-[#1677A8] font-bold text-[10px] uppercase tracking-wider rounded-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1677A8] animate-pulse"></span>
                        Live
                      </span>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-[#0B3A5B]">Medical News Briefings</h3>
                    <p className="text-xs text-[#607580] mt-0.5">Curated summaries from medical research and journals</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {newsLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-7 h-7 border-3 border-[#1677A8] border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-3 text-xs text-[#607580]">Loading medical news...</p>
                      </div>
                    ) : news.length > 0 ? (
                      news.map((n, i) => <NewsCard key={i} article={n} onClick={() => setSelectedNews(n)} />)
                    ) : (
                      <div className="text-center py-20 text-xs text-[#607580]">No news feeds currently available.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* News Modal */}
      <AnimatePresence>
        {selectedNews && (
          <div 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" 
            onClick={() => setSelectedNews(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl relative max-h-[88vh] border border-[#DCE6EB]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-[#DCE6EB] bg-[#F7FAFC] flex items-start justify-between shrink-0">
                <div className="pr-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-[#E8F2F7] text-[#1677A8] rounded-md">
                      {selectedNews.category || (typeof selectedNews.source === 'object' ? selectedNews.source?.name : selectedNews.source) || "News"}
                    </span>
                    <span className="text-xs text-[#607580]">
                      {new Date(selectedNews.news_date || selectedNews.publishedAt || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#0B3A5B] leading-snug">
                    {selectedNews.title}
                  </h2>
                </div>
                <button
                  suppressHydrationWarning
                  onClick={() => setSelectedNews(null)}
                  className="w-9 h-9 bg-white border border-[#DCE6EB] rounded-full flex items-center justify-center text-[#607580] hover:text-[#0B3A5B] hover:bg-[#F7FAFC] transition-colors shrink-0 cursor-pointer shadow-2xs"
                  aria-label="Close modal"
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white">
                <div className="text-xs sm:text-sm text-[#18303D] leading-relaxed space-y-3">
                  {(selectedNews.content || selectedNews.summary)
                    .split('\n')
                    .filter(line => line.trim())
                    .map((line, i) => (
                      <p key={i} className="leading-relaxed">
                        {line.trim()}
                      </p>
                    ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-[#DCE6EB] bg-[#F7FAFC] flex items-center justify-between shrink-0">
                <p className="text-[11px] text-[#607580] italic">
                  Curated for medical knowledge and education.
                </p>
                <div className="flex gap-3 items-center">
                  {selectedNews.url && selectedNews.url !== "#" && (
                    <a 
                      href={selectedNews.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-bold text-[#1677A8] flex items-center hover:underline"
                    >
                      Read Full Article <FaExternalLinkAlt className="ml-1 w-2.5 h-2.5" />
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedNews(null)}
                    className="px-4 py-2 bg-[#0B3A5B] text-white text-xs font-bold rounded-xl hover:bg-[#1677A8] transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
