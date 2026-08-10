"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHeartbeat, FaBookOpen, FaVideo, FaCalendarAlt, FaExternalLinkAlt, FaTimes, FaArrowRight } from "react-icons/fa";
import Link from "next/link";
import { HiSparkles } from "react-icons/hi2";

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

  const SectionHeading = ({ icon: Icon, title, description, colorClass }) => (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h2>
      </div>
      {description && <p className="text-gray-500 font-medium ml-15">{description}</p>}
    </div>
  );

  const ResourceCard = ({ item }) => (
    <Link href={`/website/resources/${item.slug}`} className="group h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-teal-200 transition-all duration-300 overflow-hidden">
      {item.image && (
         <div className="h-48 overflow-hidden relative">
           <img src={item.image} alt={item.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
         </div>
      )}
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-3">
           <span className="px-3 py-1 bg-teal-50 text-[#0067A1] text-xs font-bold uppercase tracking-wider rounded-md">
             {item.type.replace('_', ' ')}
           </span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#0067A1] transition-colors line-clamp-2">{item.title}</h3>
        {/* Strip HTML to show excerpt */}
        <p className="text-gray-500 mb-6 flex-grow line-clamp-3 text-sm leading-relaxed" 
           dangerouslySetInnerHTML={{ __html: item.content?.replace(/<[^>]+>/g, '').substring(0, 150) + '...' }}
        />
        <div className="flex items-center text-[#0067A1] font-semibold text-sm group-hover:translate-x-1 transition-transform">
          Read Guide <FaArrowRight className="ml-2 w-3 h-3" />
        </div>
      </div>
    </Link>
  );

  const NewsCard = ({ article, onClick }) => {
    return (
      <div onClick={onClick} className="group flex gap-4 p-4 rounded-2xl border border-transparent transition-all duration-300 items-start hover:bg-white hover:shadow-lg hover:border-gray-100 cursor-pointer">
        <div className="w-20 h-20 shrink-0 rounded-xl flex items-center justify-center bg-[#0067A1]/10 text-[#0067A1]">
          <FaHeartbeat className="w-8 h-8"/>
        </div>
        <div className="flex-1 min-w-0 py-1">
           <div className="flex items-center gap-2 text-xs text-[#0067A1] font-semibold mb-1">
             <FaCalendarAlt className="text-[#0067A1]/60" />
             <span className="text-gray-600">
                {new Date(article.news_date || article.publishedAt || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
             </span>
             <span className="text-gray-300">•</span>
             <span className="text-[#0067A1] truncate">{article.category || (typeof article.source === 'object' ? article.source?.name : article.source) || "News"}</span>
           </div>
           <h4 className="text-base font-bold text-gray-900 group-hover:text-[#0067A1] line-clamp-2 mb-1 leading-snug">
             {article.title}
           </h4>
           <p className="text-gray-500 text-sm line-clamp-2">{article.summary}</p>
        </div>
      </div>
    );
  };

  const [selectedNews, setSelectedNews] = useState(null);

  // Body scroll lock and Esc key handler
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

  return (
    <div className="min-h-screen bg-[#F6F8FA] pb-20">
      {/* Hero Banner */}
      <div className="bg-[#0067A1] px-6 py-10 md:px-10 md:py-14 text-center text-white">
        <div className="container mx-auto max-w-4xl flex flex-col items-center">
          {headerData?.title && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              <HiSparkles className="h-4 w-4 text-emerald-300" />
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-teal-100 uppercase">
                {headerData.title}
              </span>
            </div>
          )}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
            {headerData?.heading || "Health Guides & Updates"}
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/90 max-w-2xl mx-auto">
            {headerData?.subheading || "Access expert guides, understand your telemedicine options, and stay informed with the latest medical news."}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        
        {loading ? (
             <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
               <div className="w-10 h-10 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
               <p className="mt-4 text-gray-500 font-medium tracking-wide">Loading resources...</p>
             </div>
        ) : (
          <div className="space-y-10">
            
            {/* Guides Section */}
            {(resources.guide.length > 0 || resources.article.length > 0) && (
              <section className="bg-white rounded-2xl shadow-sm p-6 md:p-10 border border-gray-100">
                <SectionHeading 
                   icon={FaBookOpen} 
                   title="Patient Guides" 
                   description="Step-by-step guides on preparing for consultations, understanding lab reports, and knowing when to see a doctor."
                   colorClass="bg-[#0067A1]/10 text-[#0067A1]"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resources.guide.map(item => <ResourceCard key={item.id} item={item} />)}
                  {resources.article.map(item => <ResourceCard key={item.id} item={item} />)}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Telemedicine & Health Updates (Left col) */}
              <div className="lg:col-span-7 space-y-8">
                {resources.telemedicine_info.length > 0 && (
                  <section className="bg-white rounded-2xl shadow-sm p-6 md:p-10 border border-gray-100">
                    <SectionHeading 
                       icon={FaVideo} 
                       title="Telemedicine Info" 
                       description="Clear explanations on how our virtual consultations work."
                       colorClass="bg-[#0067A1]/10 text-[#0067A1]"
                    />
                    <div className="grid grid-cols-1 gap-6">
                      {resources.telemedicine_info.map(item => <ResourceCard key={item.id} item={item} />)}
                    </div>
                  </section>
                )}

                {resources.health_update.length > 0 && (
                  <section className="bg-[#0067A1]/5 rounded-2xl shadow-sm p-6 md:p-10 border border-[#0067A1]/10">
                    <SectionHeading 
                       icon={FaHeartbeat} 
                       title="Preventive Health Updates" 
                       description="Important preventive care information curated by our experts."
                       colorClass="bg-white text-[#0067A1] shadow-sm"
                    />
                    <div className="grid grid-cols-1 gap-6">
                      {resources.health_update.map(item => <ResourceCard key={item.id} item={item} />)}
                    </div>
                  </section>
                )}
              </div>

              {/* Live Medical News (Right col) */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px] md:h-[800px] sticky top-24">
                  <div className="p-6 pb-4 border-b border-gray-100 bg-[#F6F8FA]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-[#0067A1]/10 text-[#0067A1] flex items-center justify-center">
                        <FaHeartbeat className="w-5 h-5" />
                      </div>
                      <span className="px-3 py-1 bg-[#0067A1]/10 text-[#0067A1] font-bold text-xs uppercase tracking-wider rounded-full flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#0067A1] animate-pulse"></span>
                        Live Feed
                      </span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 mt-4">Medical News Updates</h2>
                    <p className="text-gray-500 text-sm font-medium mt-1">Top stories of the last 15 days</p>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                     {newsLoading ? (
                       <div className="flex flex-col items-center justify-center py-20">
                         <div className="w-8 h-8 border-3 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
                         <p className="mt-4 text-sm text-gray-500">Loading daily news...</p>
                       </div>
                     ) : news.length > 0 ? (
                       <div className="flex flex-col gap-1">
                         {news.map((n, i) => <NewsCard key={i} article={n} onClick={() => setSelectedNews(n)} />)}
                       </div>
                     ) : (
                       <div className="text-center py-20 text-gray-500">No news feeds currently available.</div>
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
              <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedNews(null)}>
                  <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl relative max-h-[90vh]"
                  >
                      {/* Modal Header */}
                      <div className="p-5 sm:p-6 border-b border-gray-100 bg-[#F6F8FA] flex items-start justify-between shrink-0">
                          <div className="pr-8">
                              <div className="flex items-center gap-3 mb-2">
                                  <span className="px-3 py-1 text-xs font-bold tracking-wide uppercase bg-[#0067A1]/10 text-[#0067A1] rounded-full">
                                      {selectedNews.category || (typeof selectedNews.source === 'object' ? selectedNews.source?.name : selectedNews.source) || "News"}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                      {new Date(selectedNews.news_date || selectedNews.publishedAt || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                              </div>
                              <h2 className="text-xl sm:text-2xl font-bold text-[#003358] leading-tight">
                                  {selectedNews.title}
                              </h2>
                          </div>
                          <button
                              suppressHydrationWarning
                              onClick={() => setSelectedNews(null)}
                              className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shrink-0"
                          >
                              <FaTimes className="w-4 h-4" />
                          </button>
                      </div>

                      {/* Modal Body (Scrollable) */}
                      <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white">
                          <div className="text-gray-600 leading-relaxed text-sm sm:text-base">
                              {(selectedNews.content || selectedNews.summary)
                                  .split('\n')
                                  .filter(line => line.trim())
                                  .map((line, i) => {
                                      const trimmed = line.trim();
                                      
                                      // Helper to handle bold text **
                                      const formatText = (text) => {
                                          return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-bold">$1</strong>');
                                      };

                                      // Markdown headings (### or ##)
                                      if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
                                          const headingText = trimmed.replace(/^#+\s/, '');
                                          return (
                                              <h3 key={i} className="text-base sm:text-lg font-bold text-[#003358] mt-4 mb-2 flex items-center gap-2">
                                                  <span className="w-1 h-4 bg-[#0067A1] rounded-full inline-block"></span>
                                                  {headingText}
                                              </h3>
                                          );
                                      }
                                      
                                      // Markdown bullet point
                                      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                                          return (
                                              <div key={i} className="flex items-start gap-3 ml-2 mb-3">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0067A1] mt-2 flex-shrink-0"></span>
                                                  <div className="text-gray-600 flex-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatText(trimmed.replace(/^[-*]\s/, '')) }} />
                                              </div>
                                          );
                                      }
                                      
                                      // Regular paragraph
                                      return (
                                          <p key={i} className="text-gray-600 mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatText(trimmed) }} />
                                      );
                                  })}
                          </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="p-4 sm:p-5 border-t border-gray-100 bg-[#F6F8FA] flex items-center justify-between shrink-0">
                          <p className="text-xs text-gray-400 italic">
                              Curated for informational purposes.
                          </p>
                          <div className="flex gap-4 items-center">
                              {selectedNews.url && selectedNews.url !== "#" && (
                                <a href={selectedNews.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#0067A1] flex items-center hover:underline">
                                   Read Full Story <FaExternalLinkAlt className="ml-1 w-3 h-3" />
                                </a>
                              )}
                              <button
                                  onClick={() => setSelectedNews(null)}
                                  className="px-5 py-2 bg-[#0067A1] text-white text-sm font-semibold rounded-lg hover:bg-[#073834] transition-colors"
                              >
                                  Close
                              </button>
                          </div>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #d1d5db;
        }
      `}</style>
    </div>
  );
}
