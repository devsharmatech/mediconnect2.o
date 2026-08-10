"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FaArrowLeft, FaCalendarAlt, FaShareAlt, FaHeartbeat } from "react-icons/fa";
import Link from "next/link";

export default function ResourceDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    if (slug) fetchResource();
  }, [slug]);

  const fetchResource = async () => {
    try {
      const res = await fetch(`/api/cms/resources`);
      const result = await res.json();
      if (result.success && result.data) {
        const found = result.data.find(r => r.slug === slug);
        if (found) {
          setResource(found);
          // Get 3 related resources of the same type
          const relatedItems = result.data
            .filter(r => r.type === found.type && r.id !== found.id && r.status === "published")
            .slice(0, 3);
          setRelated(relatedItems);
        } else {
          router.push("/website/resources");
        }
      }
    } catch (err) {
      console.error("Failed to load resource:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!resource) return null;

  return (
    <main className="min-h-screen bg-[#F6F8FA] pb-20">
      {/* Hero Banner */}
      <div className="bg-[#0067A1] px-6 py-10 md:px-10 md:py-14 text-center text-white">
        <div className="container mx-auto max-w-4xl pt-4">
          <button 
             onClick={() => router.push('/website/resources')}
             className="mb-8 inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-semibold tracking-wide uppercase bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm"
          >
            <FaArrowLeft className="w-3.5 h-3.5" /> Back to Resources
          </button>
          
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="px-3 py-1 bg-white/10 border border-white/20 text-white/90 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm">
               {resource.type.replace('_', ' ')}
            </span>
            <span className="text-white/70 text-sm font-medium flex items-center gap-2">
               <FaCalendarAlt className="w-3.5 h-3.5" />
               {new Date(resource.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6">
            {resource.title}
          </h1>
          
          <div className="flex items-center justify-center mt-6">
             <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }} className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#0067A1] hover:bg-gray-100 rounded-xl font-bold text-sm shadow-sm transition-transform hover:scale-105 active:scale-95">
               <FaShareAlt className="w-4 h-4" /> Share Article
             </button>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Main Article Body */}
          <div className="lg:w-2/3">
            <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 lg:p-14">
               {resource.image && (
                 <div className="w-full h-[300px] md:h-[400px] mb-10 rounded-2xl overflow-hidden border border-gray-100">
                   <img src={resource.image} alt={resource.title} className="w-full h-full object-cover" />
                 </div>
               )}
               
               <div 
                 className="prose prose-emerald max-w-none break-words overflow-hidden w-full prose-headings:text-[#003358] prose-headings:font-bold prose-h1:text-4xl prose-h2:text-2xl prose-h2:md:text-3xl prose-h3:text-xl prose-p:text-gray-600 prose-p:leading-relaxed prose-a:text-[#0067A1] prose-a:break-all prose-img:rounded-xl"
                 dangerouslySetInnerHTML={{ __html: resource.content }}
               />
               
               <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#0067A1]/10 rounded-xl flex items-center justify-center text-[#0067A1]">
                      <FaHeartbeat className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">MediConnect Editorial Team</p>
                      <p className="text-xs text-gray-500">Verified Health Information</p>
                    </div>
                 </div>
               </div>
            </article>
          </div>
          
          {/* Related Articles Sidebar */}
          <div className="lg:w-1/3 space-y-8">
             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
               <h3 className="text-lg font-bold text-gray-900 mb-6 border-b pb-3 border-gray-100">Related Resources</h3>
               
               {related.length > 0 ? (
                 <div className="space-y-6">
                   {related.map(item => (
                     <Link key={item.id} href={`/website/resources/${item.slug}`} className="group block">
                       {item.image && (
                         <div className="w-full h-32 rounded-xl overflow-hidden mb-3 border border-gray-100">
                           <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt=""/>
                         </div>
                       )}
                       <h4 className="font-bold text-gray-900 group-hover:text-[#0067A1] transition-colors line-clamp-2 leading-tight mb-2">
                         {item.title}
                       </h4>
                       <p className="text-xs text-gray-500 flex items-center gap-1.5">
                         <FaCalendarAlt />
                         {new Date(item.created_at).toLocaleDateString()}
                       </p>
                     </Link>
                   ))}
                 </div>
               ) : (
                 <p className="text-sm text-gray-500">No related resources found.</p>
               )}
             </div>
          </div>
          
        </div>
      </div>
    </main>
  );
}
