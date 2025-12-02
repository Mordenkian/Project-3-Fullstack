"use client";

import React, { useEffect } from "react";

// Define the types for the props, mirroring the data structure from the main page
interface HourData {
  time: string;
  temp_c: number;
  temp_f: number;
  condition: {
    icon: string;
    text: string;
  };
}

interface ForecastDay {
  date: string;
  day: {
    maxtemp_c: number;
    mintemp_c: number;
    maxtemp_f: number;
    mintemp_f: number;
    daily_chance_of_rain: number;
    maxwind_kph: number;
    maxwind_mph: number;
    condition: {
      icon: string;
      text: string;
    };
  };
  astro: {
    sunrise: string;
    sunset: string;
  };
  hour: HourData[];
}

interface DetailedForecastModalProps {
  dayData: ForecastDay;
  onClose: () => void;
  units: 'celsius' | 'fahrenheit';
}

export default function DetailedForecastModal({ dayData, onClose, units }: DetailedForecastModalProps) {
  // Stop propagation to prevent the modal from closing when clicking inside
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Accessibility: Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup the event listener when the component unmounts
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]); // Re-run effect if onClose changes

  const fullDate = new Date(`${dayData.date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });

  return (
    <div
      className="fixed inset-0 bg-white/75 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in"
      onClick={onClose} // Close modal when clicking on the backdrop
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg relative animate-fade-in-up"
        onClick={handleModalContentClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>

        {/* Header */}
        <h3
          id="modal-title"
          className="text-xl font-bold text-gray-800 mb-4"
        >
          {fullDate}
        </h3>

        {/* Summary */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b">
          <img src={dayData.day.condition.icon} alt={dayData.day.condition.text} className="w-16 h-16" />
          <div>
            <p className="text-3xl font-bold text-blue-600">
              {units === 'celsius' ? `${Math.round(dayData.day.maxtemp_c)}°/${Math.round(dayData.day.mintemp_c)}°` : `${Math.round(dayData.day.maxtemp_f)}°/${Math.round(dayData.day.mintemp_f)}°`}
            </p>
            <p className="text-gray-600">{dayData.day.condition.text}</p>
          </div>
          <div className="ml-auto text-sm text-gray-600 space-y-1 text-right">
            <p>Sunrise: {dayData.astro.sunrise}</p>
            <p>Sunset: {dayData.astro.sunset}</p>
            <p>Rain: {dayData.day.daily_chance_of_rain}%</p>
            <p>Wind: {units === 'celsius' ? `${Math.round(dayData.day.maxwind_kph)} kph` : `${Math.round(dayData.day.maxwind_mph)} mph`}</p>
          </div>
        </div>

        {/* Hourly Breakdown */}
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {dayData.hour.map((hour) => (
            <div key={hour.time} className="flex-shrink-0 flex flex-col items-center gap-y-1 p-2 rounded-lg bg-gray-50 w-20">
              <p className="text-xs font-medium text-gray-600">{new Date(hour.time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}</p>
              <img src={hour.condition.icon} alt={hour.condition.text} className="w-8 h-8" />
              <p className="text-sm font-bold text-gray-800">{units === 'celsius' ? `${Math.round(hour.temp_c)}°` : `${Math.round(hour.temp_f)}°`}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}