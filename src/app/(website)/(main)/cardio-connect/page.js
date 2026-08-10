"use client";

import React, { useState } from 'react';
import { ShieldCheck, QrCode, Play, Heart, Plus, Sparkles, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

const CardioDashboard = () => {
  // Form states
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");
  const [pulse, setPulse] = useState("72");
  const [logHistory, setLogHistory] = useState([
    { bp: "114/76", hr: "62 bpm", time: "Today, 10:30 AM" },
    { bp: "117/78", hr: "65 bpm", time: "Yesterday, 9:15 AM" },
    { bp: "119/79", hr: "68 bpm", time: "2 days ago, 6:00 PM" }
  ]);

  // Video modal state
  const [playingVideo, setPlayingVideo] = useState(false);

  // Sample blood pressure data
  const [bpChartData, setBpChartData] = useState({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Systolic BP',
        data: [125, 120, 118, 122, 119, 117, 114],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'white',
        pointBorderColor: 'rgb(239, 68, 68)',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Diastolic BP',
        data: [82, 80, 78, 81, 79, 77, 76],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'white',
        pointBorderColor: 'rgb(59, 130, 246)',
        pointBorderWidth: 2,
        pointRadius: 4,
      }
    ]
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { weight: 'bold' } }
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: { display: true, drawBorder: false }
      },
      x: {
        grid: { display: false, drawBorder: false }
      }
    }
  };

  const handleLogSubmit = (e) => {
    e.preventDefault();
    if (!systolic || !diastolic || !pulse) {
      toast.error("Please fill in all vitals fields");
      return;
    }
    const newLog = {
      bp: `${systolic}/${diastolic}`,
      hr: `${pulse} bpm`,
      time: "Just now"
    };
    setLogHistory([newLog, ...logHistory]);
    toast.success("Heart vitals logged successfully!");
    
    // Simulate updating chart data
    setBpChartData((prev) => ({
      ...prev,
      datasets: [
        {
          ...prev.datasets[0],
          data: [...prev.datasets[0].data.slice(1), Number(systolic)]
        },
        {
          ...prev.datasets[1],
          data: [...prev.datasets[1].data.slice(1), Number(diastolic)]
        }
      ]
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        {/* Header banner */}
        <header className="mb-8 bg-gradient-to-r from-[#0067A1] to-[#125f59] text-white rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <span className="bg-white/20 text-white font-bold text-xs uppercase px-3 py-1 rounded-full border border-white/20">Wellness Module</span>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-3 text-white">Cardio Connect</h1>
            <p className="text-white/80 mt-2 text-sm md:text-base max-w-xl">
              Track heart rate variability, log daily blood pressure readings, and learn strategies to build cardiorespiratory endurance.
            </p>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Heart Health Score Box */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                Heart Health Score
              </h3>
              <div className="relative flex justify-center items-center py-2">
                <div className="relative w-48 h-48">
                  <Doughnut
                    data={{
                      labels: ['Score', 'Remaining'],
                      datasets: [{
                        data: [85, 15],
                        backgroundColor: ['rgb(239, 68, 68)', 'rgb(241, 245, 249)'],
                        borderWidth: 0,
                        cutout: '80%',
                        borderRadius: 20,
                        spacing: 2,
                      }]
                    }}
                    options={{
                      responsive: true,
                      cutout: '80%',
                      rotation: -90,
                      circumference: 180,
                      plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                      }
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center top-8">
                    <span className="text-4xl font-extrabold text-slate-800">85</span>
                    <span className="text-xs text-slate-500">out of 100</span>
                    <div className="mt-2 px-3 py-0.5 bg-red-100 text-red-600 rounded-full text-xs font-semibold">
                      Good
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 mt-4 pt-4 border-t border-slate-50">
              {[
                { label: 'Resting HR', value: '62 bpm', change: '-4', positive: true },
                { label: 'Average HR', value: '76 bpm', change: '+6', positive: false },
                { label: 'HR Recovery', value: '19 drop', change: '+6', positive: true },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">{item.value}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {item.change} {item.positive ? '▲' : '▼'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blood Pressure Chart Section */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Blood Pressure Trends</h3>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">7 Day Avg: 114/76</span>
              </div>
              <div className="h-56 w-full relative">
                <Line data={bpChartData} options={chartOptions} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl">
                  <QrCode className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Assigned Cardiologist</p>
                  <p className="font-bold text-slate-700 text-sm">Dr. Ishan Bhatia</p>
                </div>
              </div>
              <div className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-bold border border-emerald-100">
                ★ 16% Health Improvement
              </div>
            </div>
          </div>

        </div>

        {/* Action Vitals Log & Video Guide Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Logger Form */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#0067A1]" />
              Log Daily Vitals
            </h3>
            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Systolic (mmHg)</label>
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 text-center font-bold text-lg text-slate-800"
                    placeholder="120"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Diastolic (mmHg)</label>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 text-center font-bold text-lg text-slate-800"
                    placeholder="80"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067A1]/30 text-center font-bold text-lg text-slate-800"
                    placeholder="72"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#0067A1] hover:bg-[#004F7C] text-white rounded-xl text-sm font-semibold transition-all shadow shadow-[#0067A1]/10 cursor-pointer"
              >
                Log Vitals
              </button>
            </form>

            <div className="mt-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Vitals Log History</h4>
              <div className="space-y-2">
                {logHistory.map((log, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-700">BP: {log.bp}</span>
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="text-slate-600">Pulse: {log.hr}</span>
                    </div>
                    <span className="text-slate-400 font-medium">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Restructured Video & Guide Block */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 fill-amber-100" />
                Educational Guide & Video
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Watch our short 5-minute training guide on how to perform home cardiovascular training and measure pulse recovery accurately.
              </p>

              {/* Video Thumbnail Mockup */}
              <div
                onClick={() => setPlayingVideo(true)}
                className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 cursor-pointer group shadow border border-slate-100"
              >
                <img
                  src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop"
                  alt="Cardio Walk Tutorial"
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/95 text-[#0067A1] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-6 h-6 fill-current ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-bold">
                  05:24 Mins
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex gap-2.5 items-start text-xs text-slate-600 bg-blue-50/50 p-3 rounded-xl border border-blue-100/30">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p>Cardiorespiratory training lowers resting heart rate by an average of 4-6 beats per minute in 30 days.</p>
              </div>
              <button
                onClick={() => setPlayingVideo(true)}
                className="w-full py-2.5 border border-[#0067A1] text-[#0067A1] hover:bg-[#0067A1]/5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                View Full Exercise Guide <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Video Overlay Modal */}
        {playingVideo && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl overflow-hidden max-w-2xl w-full border border-white/10 shadow-2xl relative">
              <button
                onClick={() => setPlayingVideo(false)}
                className="absolute top-4 right-4 text-white hover:text-slate-300 font-bold text-sm bg-white/10 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
              <div className="p-6 text-center text-white">
                <h3 className="text-xl font-bold mb-4">Cardio Exercise Training Video</h3>
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center relative mb-4">
                  <video
                    src="https://www.w3schools.com/html/mov_bbb.mp4"
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This demo video explains correct aerobic posture, BPM control targets, and safety metrics.
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="bg-white border border-yellow-200 rounded-2xl p-4 text-xs text-slate-500 leading-relaxed">
          <strong>⚠ Medical Disclaimer:</strong> Cardio Connect parameters represent simulated values for fitness assessment. In the event of chest pain, shortness of breath, or any physical discomfort, terminate exercise immediately and contact a qualified emergency medical provider.
        </section>

      </div>
    </div>
  );
};

export default CardioDashboard;
