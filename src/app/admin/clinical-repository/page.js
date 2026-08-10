"use client";

import React, { useState, useEffect } from "react";
import { Database, FileText, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";

const formatTableName = (name) => {
  return name.replace(/^cr_/, '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function ClinicalRepositoryHub() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await fetch("/api/admin/clinical-repository");
        const json = await res.json();
        if (json.success) setTables(json.tables);
      } catch (e) {
        toast.error("Failed to load tables");
      }
      setLoading(false);
    };
    fetchTables();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/70 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#0067A1] rounded-2xl shadow-xl shadow-[#0067A1]/20">
              <Database className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Clinical AI Repository
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Central Hub for all Medical Knowledge and Routing Tables
              </p>
            </div>
          </div>
          <div className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
            <ShieldCheck className="text-emerald-600 w-4 h-4" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">DPDP Compliant Hub</span>
          </div>
        </div>

        {/* Dashboard Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-10 h-10 animate-spin text-[#0067A1]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tables.map(table => (
              <Link key={table} href={`/admin/clinical-repository/${table}`}>
                <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-[#0067A1]/5 hover:border-[#0067A1]/30 p-6 flex flex-col gap-4 cursor-pointer transition-all duration-300 h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -z-10 group-hover:bg-[#0067A1]/5 transition-colors"></div>
                  
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-slate-50 group-hover:bg-[#0067A1]/10 transition-colors">
                      <FileText className="w-6 h-6 text-slate-500 group-hover:text-[#0067A1] transition-colors" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#0067A1] transform group-hover:translate-x-1 transition-all" />
                  </div>
                  
                  <div className="mt-auto pt-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">
                      {table}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#0067A1] transition-colors leading-tight">
                      {formatTableName(table)}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
