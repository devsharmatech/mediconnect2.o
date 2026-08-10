"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaHeartbeat, FaArrowLeft } from "react-icons/fa";
import Link from "next/link";
import AnimateIn from "@/components/ui/animations/AnimateIn";

export default function SupportiveToolDetail() {
  const { slug } = useParams();
  const router = useRouter();
  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchToolData() {
      try {
        const res = await fetch("/api/cms/supportive-tools");
        const json = await res.json();
        if (json.success && json.data) {
          const found = json.data.find(t => t.slug === slug && t.status === "active");
          if (found) {
            setTool(found);
          } else {
            // Not found, go back
            router.push("/website/services");
          }
        }
      } catch (err) {
        console.error("Failed to load tool", err);
      } finally {
        setLoading(false);
      }
    }
    if (slug) {
      fetchToolData();
    }
  }, [slug, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0067A1] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tool) return null;

  return (
    <div className="min-h-screen bg-[#F6F8FA]">
      {/* Hero Section */}
      <div className="bg-[#0067A1] px-6 py-12 md:px-10 md:py-20 text-center text-white relative flex flex-col items-center">
        <div className="absolute top-6 left-6 md:top-10 md:left-10 z-10">
          <Link href="/website/services" className="inline-flex items-center text-white/80 hover:text-white transition group">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 mr-3">
              <FaArrowLeft />
            </div>
            <span className="font-medium hidden sm:inline">Back to Services</span>
          </Link>
        </div>
        
        {tool.image ? (
            <div className="mb-6 rounded-2xl overflow-hidden shadow-2xl relative w-full max-w-2xl h-64 md:h-80 border-4 border-white/10">
                <img src={tool.image} alt={tool.title} className="w-full h-full object-cover" />
            </div>
        ) : (
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 shadow-lg">
                <FaHeartbeat className="h-10 w-10 text-white" />
            </div>
        )}
        
        <h1 className="text-3xl md:text-5xl font-bold mb-4 max-w-4xl tracking-tight">
          {tool.title}
        </h1>
        <p className="mt-2 text-lg md:text-xl text-white/80 max-w-2xl mx-auto font-light">
          {tool.description}
        </p>
      </div>

      {/* Content Section */}
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-10 mb-20">
        <AnimateIn delay={200} className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-14 min-h-[400px]">
            {tool.detailed_content ? (
                <div 
                  className="prose prose-lg md:prose-xl max-w-none text-gray-700
                             prose-headings:text-[#003358] prose-headings:font-bold
                             prose-a:text-[#0067A1] prose-a:font-medium hover:prose-a:underline
                             prose-p:leading-relaxed prose-li:marker:text-[#0067A1]
                             prose-img:rounded-xl prose-img:shadow-md"
                  dangerouslySetInnerHTML={{ __html: tool.detailed_content }} 
                />
            ) : (
                <div className="text-center py-20">
                   <div className="inline-flex w-24 h-24 bg-gray-50 rounded-full items-center justify-center mb-6">
                      <FaHeartbeat className="w-10 h-10 text-gray-300" />
                   </div>
                   <h3 className="text-2xl font-bold text-gray-800 mb-2">More Information Coming Soon</h3>
                   <p className="text-gray-500 max-w-md mx-auto">Detailed information about {tool.title} is currently being prepared by our team.</p>
                </div>
            )}
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}
