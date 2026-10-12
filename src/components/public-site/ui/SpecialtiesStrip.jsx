"use client";

import React from "react";
import Link from "next/link";
import { 
  FaUserMd, 
  FaFemale, 
  FaBaby, 
  FaHeartbeat, 
  FaLungs, 
  FaBone, 
  FaBrain, 
  FaEllipsisH, 
  FaChevronRight 
} from "react-icons/fa";
import { 
  GiKidneys, 
  GiStomach, 
  GiDna2 
} from "react-icons/gi";
import { RiMentalHealthLine } from "react-icons/ri";

const specialties = [
  { name: "General Physician", icon: FaUserMd, link: "/doctors?specialty=General Physician" },
  { name: "Dermatology", icon: RiMentalHealthLine, link: "/doctors?specialty=Dermatology" },
  { name: "Gynaecology", icon: FaFemale, link: "/doctors?specialty=Gynaecology" },
  { name: "Pediatrics", icon: FaBaby, link: "/doctors?specialty=Pediatrics" },
  { name: "Cardiology", icon: FaHeartbeat, link: "/doctors?specialty=Cardiology" },
  { name: "Pulmonology", icon: FaLungs, link: "/doctors?specialty=Pulmonology" },
  { name: "Endocrinology", icon: GiDna2, link: "/doctors?specialty=Endocrinology" },
  { name: "Gastroenterology", icon: GiStomach, link: "/doctors?specialty=Gastroenterology" },
  { name: "Orthopedics", icon: FaBone, link: "/doctors?specialty=Orthopedics" },
  { name: "Neurology", icon: FaBrain, link: "/doctors?specialty=Neurology" },
  { name: "Urology", icon: GiKidneys, link: "/doctors?specialty=Urology" },
  { name: "More", icon: FaEllipsisH, link: "/doctors" },
];

export default function SpecialtiesStrip() {
  return (
    <section className="w-full bg-[#FFFFFF] py-8 sm:py-10 border-b border-[#DCE6EB]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0B3A5B] tracking-tight">
              Find the right healthcare professional
            </h2>
            <p className="text-xs sm:text-sm text-[#607580] mt-1">
              Consult top specialists for your specific health needs.
            </p>
          </div>
          <Link 
            href="/doctors" 
            className="inline-flex items-center text-xs sm:text-sm font-semibold text-[#1677A8] hover:text-[#0B3A5B] transition-colors shrink-0"
          >
            <span>View all specialties</span>
            <FaChevronRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3 sm:gap-3.5">
          {specialties.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.link}
                className="group flex flex-col items-center justify-center p-3 rounded-xl bg-[#F7FAFC] border border-[#DCE6EB] hover:border-[#1677A8] hover:bg-white hover:shadow-xs transition-all text-center"
              >
                <div className="w-10 h-10 rounded-full bg-white group-hover:bg-[#1677A8]/10 text-[#1677A8] border border-[#DCE6EB]/80 flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-105">
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
