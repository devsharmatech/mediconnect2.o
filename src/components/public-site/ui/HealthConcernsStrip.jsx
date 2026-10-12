"use client";

import React from "react";
import Link from "next/link";
import { 
  FaHeartbeat, 
  FaLungs, 
  FaWeight, 
  FaTooth, 
  FaBacteria, 
  FaBrain, 
  FaTint, 
  FaChevronRight 
} from "react-icons/fa";
import { 
  GiStomach, 
  GiHairStrands, 
  GiDrop, 
  GiDna2 
} from "react-icons/gi";
import { MdBloodtype, MdOutlineSick } from "react-icons/md";

const concerns = [
  { name: "Hair & Skin", icon: GiHairStrands, link: "/doctors?specialty=Dermatology" },
  { name: "Thyroid", icon: GiDna2, link: "/doctors?specialty=Endocrinology" },
  { name: "PCOS", icon: FaHeartbeat, link: "/doctors?specialty=Gynaecology" },
  { name: "Weight Management", icon: FaWeight, link: "/doctors?specialty=Endocrinology" },
  { name: "Diabetes", icon: GiDrop, link: "/doctors?specialty=Endocrinology" },
  { name: "Blood Pressure", icon: MdBloodtype, link: "/doctors?specialty=Cardiology" },
  { name: "Digestive Health", icon: GiStomach, link: "/doctors?specialty=Gastroenterology" },
  { name: "Respiratory", icon: FaLungs, link: "/doctors?specialty=Pulmonology" },
  { name: "Dental", icon: FaTooth, link: "/doctors?specialty=General Physician" },
  { name: "Fatigue", icon: FaBrain, link: "/doctors?specialty=General Physician" },
  { name: "General Symptoms", icon: MdOutlineSick, link: "/doctors?specialty=General Physician" },
];

export default function HealthConcernsStrip() {
  return (
    <section className="w-full bg-[#F7FAFC] py-8 sm:py-10 border-b border-[#DCE6EB]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0B3A5B] tracking-tight">
              What health concern are you looking to address?
            </h2>
            <p className="text-xs sm:text-sm text-[#607580] mt-1">
              Find the right care pathways, specialists and services for your health needs.
            </p>
          </div>
          <Link 
            href="/doctors" 
            className="inline-flex items-center text-xs sm:text-sm font-semibold text-[#1677A8] hover:text-[#0B3A5B] transition-colors shrink-0"
          >
            <span>View all health concerns</span>
            <FaChevronRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-3 sm:gap-3.5">
          {concerns.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.link}
                className="group flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-[#DCE6EB] hover:border-[#1677A8] hover:shadow-xs transition-all text-center"
              >
                <div className="w-10 h-10 rounded-full bg-[#F7FAFC] group-hover:bg-[#1677A8]/10 text-[#1677A8] flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-105">
                  <Icon className="w-5 h-5 text-[#1677A8]" />
                </div>
                <span className="text-[11px] font-semibold text-[#18303D] group-hover:text-[#1677A8] transition-colors leading-tight">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
