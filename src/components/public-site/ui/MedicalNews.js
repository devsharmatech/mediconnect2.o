"use client";

import { useEffect, useState } from "react";
import { FaClock, FaHeartbeat, FaTimes, FaChevronLeft, FaChevronRight, FaExternalLinkAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const MedicalNews = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await fetch("/api/medical-news");
                if (!res.ok) throw new Error("Failed to fetch");
                const data = await res.json();

                if (data.success && data.data?.items) {
                    setNews(data.data.items);
                } else {
                    setNews([]);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);


    if (loading) {
        return (
            <section className="py-8 bg-white border-y border-gray-100">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center items-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0067A1]"></div>
                    </div>
                </div>
            </section>
        );
    }

    if (error || news.length === 0) {
        return null;
    }

    return (
        <section className="py-8 lg:py-10 bg-white border-y border-gray-100 medical-news-section">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-1.5 bg-[#0067A1]/10 rounded-md text-[#0067A1]">
                                <FaHeartbeat className="w-4 h-4" />
                            </span>
                            <p className="text-xs font-semibold tracking-wide text-[#0067A1] uppercase">
                                Health Insights
                            </p>
                        </div>
                        <h2 className="text-3xl font-bold text-[#003358]">
                            Today's Top Medical News
                        </h2>
                        <p className="mt-2 text-gray-600 max-w-2xl">
                            Daily curated summaries of the latest in public health, nutrition, and medical research.
                        </p>
                    </div>

                    {/* Custom Navigation Buttons for Swiper */}
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <button
                                suppressHydrationWarning
                                className="custom-swiper-prev w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-[#0067A1] hover:text-white hover:border-[#0067A1] transition-all cursor-pointer z-10"
                                aria-label="Previous slide"
                            >
                                <FaChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                suppressHydrationWarning
                                className="custom-swiper-next w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-[#0067A1] hover:text-white hover:border-[#0067A1] transition-all cursor-pointer z-10"
                                aria-label="Next slide"
                            >
                                <FaChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="text-right hidden md:block border-l border-gray-200 pl-4 ml-2">
                            <p className="text-sm font-medium text-gray-500 flex items-center justify-end gap-2">
                                <FaClock className="w-4 h-4" />
                                Updated Daily
                            </p>
                        </div>
                    </div>
                </div>

                {/* Swiper Container */}
                <div className="relative min-h-[350px]">
                    <Swiper
                        modules={[Navigation, Pagination]}
                        spaceBetween={20}
                        slidesPerView={1}
                        navigation={{
                            prevEl: '.custom-swiper-prev',
                            nextEl: '.custom-swiper-next',
                        }}
                        pagination={{ clickable: true, dynamicBullets: true }}
                        grabCursor={true}
                        loop={true}
                        breakpoints={{
                            640: {
                                slidesPerView: 2,
                                spaceBetween: 24,
                            },
                            1024: {
                                slidesPerView: 3,
                                spaceBetween: 24,
                            },
                            1280: {
                                slidesPerView: 4,
                                spaceBetween: 24,
                            }
                        }}
                        className="pb-12 !overflow-visible sm:!overflow-hidden"
                    >
                        {news.map((item, index) => (
                            <SwiperSlide key={index} className="h-auto">
                                <div
                                    onClick={() => setSelectedNews(item)}
                                    className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-[#0067A1]/30 hover:shadow-lg transition-all flex flex-col h-full cursor-pointer min-h-[300px]"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase bg-gray-50 text-gray-600 rounded-full group-hover:bg-[#0067A1]/10 group-hover:text-[#0067A1] transition-colors">
                                            {item.category || "General"}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-[#003358] text-lg leading-tight mb-3 line-clamp-2 group-hover:text-[#0067A1] transition-colors">
                                        {item.title}
                                    </h3>

                                    <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-3 flex-grow">
                                        {item.summary}
                                    </p>

                                    <div className="pt-4 mt-auto border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                        <span className="font-medium text-[#0067A1] group-hover:underline flex items-center gap-1">
                                            Read More
                                        </span>
                                        <span>{new Date().toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>

            <AnimatePresence>
                {selectedNews && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedNews(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative"
                        >
                            <button
                                suppressHydrationWarning
                                onClick={() => setSelectedNews(null)}
                                className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"
                            >
                                <FaTimes className="text-gray-600" />
                            </button>

                            <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto pb-4">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="px-3 py-1 text-xs font-bold tracking-wide uppercase bg-[#0067A1]/10 text-[#0067A1] rounded-full">
                                        {selectedNews.category || (typeof selectedNews.source === 'object' ? selectedNews.source?.name : selectedNews.source) || "General"}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(selectedNews.news_date || selectedNews.publishedAt || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>

                                <h2 className="text-2xl font-bold text-[#003358] mb-4 leading-tight">
                                    {selectedNews.title}
                                </h2>

                                {/* Rich Content Rendering */}
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
                            <div className="p-4 sm:px-6 sm:py-4 border-t border-gray-100 bg-[#F6F8FA] flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
                                <p className="text-xs text-gray-400 italic text-center sm:text-left">
                                    Curated for informational purposes.
                                </p>
                                <div className="flex gap-4 items-center w-full sm:w-auto justify-between sm:justify-end">
                                    {selectedNews.url && selectedNews.url !== "#" && (
                                        <a
                                            href={selectedNews.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-semibold text-[#0067A1] flex items-center hover:underline"
                                        >
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

            {/* Custom Styles for Swiper Pagination to match theme */}
            <style jsx global>{`
                .medical-news-section .swiper-pagination-bullet-active {
                    background-color: #0067A1 !important;
                }
                .medical-news-section .swiper-pagination-bullet {
                    width: 8px;
                    height: 8px;
                }
                .medical-news-section .swiper {
                    padding-bottom: 50px !important;
                }
            `}</style>
        </section>
    );
};

export default MedicalNews;
