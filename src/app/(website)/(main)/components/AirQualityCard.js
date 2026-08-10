'use client';

import React from 'react';
import { FaSync, FaInfoCircle, FaShieldAlt } from 'react-icons/fa';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const AirQualityCard = ({ 
  location = 'Location', 
  aqi = 0, 
  status = 'Loading...', 
  onRefresh = () => {}, 
  onDetails = () => {}, 
  onInsurance = () => {} 
}) => {
  const getAqiColor = (aqiValue) => {
    const val = Number(aqiValue);
    if (val <= 50) return '#10B981';   // Green (Good)
    if (val <= 100) return '#F59E0B';  // Yellow (Moderate)
    if (val <= 200) return '#F97316';  // Orange (Unhealthy)
    if (val <= 300) return '#EF4444';  // Red (Very Unhealthy)
    return '#8B5CF6';                  // Purple (Hazardous)
  };

  const currentAqi = Number(aqi) || 0;
  const fillColor = getAqiColor(currentAqi);

  const chartData = [
    { name: 'AQI', value: Math.min(currentAqi / 10, 100), fill: fillColor }
  ];

  return (
    <div className="bg-white rounded-2xl p-4 w-full max-w-sm border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 font-sans">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-sm font-medium text-gray-500">AIR QUALITY INDEX</h2>
          <p className="text-xs text-gray-400">{location}</p>
        </div>
        <button 
          onClick={onRefresh}
          className="text-gray-400 hover:text-gray-600 p-1"
          title="Refresh"
        >
          <FaSync className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-between">
        {/* AQI Value */}
        <div className="w-24 h-24 relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              innerRadius="70%" 
              outerRadius="90%" 
              barSize={8}
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis 
                type="number" 
                domain={[0, 100]} 
                angleAxisId={0} 
                tick={false} 
              />
              <RadialBar
                background
                dataKey="value"
                cornerRadius={4}
                className="fill-current"
              />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: fillColor, fontSize: '1.25rem', fontWeight: 'bold' }}
              >
                {currentAqi}
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        {/* Status */}
        <div className="flex-1 pl-4">
          <p className="text-sm text-gray-600 mb-2">{status}</p>
          <div className="flex space-x-2">
            <button
              onClick={onDetails}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Details
            </button>
            <button
              onClick={onInsurance}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Insurance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirQualityCard;