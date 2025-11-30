"use client";

import React, { useState, useEffect } from "react";
import { getUserId } from "@/lib/getUserId";
import axios from "axios";

interface WeatherData {
  temperature: number;
}

interface SavedCity {
  _id: string;
  name: string;
  userId: string;
}

export default function HomePage() {
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData | null>>({});
  const [savedCities, setSavedCities] = useState<SavedCity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = getUserId();
    setUserId(id);

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch user's current location based on IP
        const locationResponse = await axios.get(`https://ipapi.co/json/`);
        const currentLocation: SavedCity = {
          _id: "current-location",
          name: locationResponse.data.city,
          userId: "-1",
        };

        // Fetch user's saved cities from our database
        const savedCitiesResponse = await axios.get(`/api/cities/${id}`);

        setSavedCities([currentLocation, ...savedCitiesResponse.data]);
      } catch (error) {
        console.error("Could not load initial city data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchWeatherForCity = async () => {
      if (savedCities.length === 0 || !savedCities[index]) return;

      const city = savedCities[index];
      if (weatherData[city._id]) return; // Don't re-fetch if we already have it

      try {
        const response = await axios.get(`/api/weather?q=${city.name}`);
        setWeatherData((prev) => ({
          ...prev,
          [city._id]: { temperature: response.data.current.temp_c },
        }));
      } catch (err) {
        console.error(`Could not fetch weather for ${city.name}:`, err);
        setWeatherData((prev) => ({ ...prev, [city._id]: null })); // Mark as failed
      }
    };

    fetchWeatherForCity();
  }, [index, savedCities, weatherData]);

  const handleNext = () => {
    if (savedCities.length === 0) return;
    setIndex((prevIndex) => (prevIndex + 1) % savedCities.length);
  };

  const handlePrev = () => {
    if (savedCities.length === 0) return;
    setIndex((prevIndex) => (prevIndex - 1 + savedCities.length) % savedCities.length);
  };

  return (
    <main className="flex flex-col items-center justify-center p-6 pt-20">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Weather</h1>
        {isLoading ? (
          <p>Loading locations...</p>
        ) : savedCities.length > 0 ? (
          <div className="flex items-center justify-between">
            <button onClick={handlePrev} className="text-2xl font-bold text-blue-500 hover:text-blue-700 transition">⬅</button>
            <div className="flex flex-col items-center w-40">
              <h2 className="text-2xl font-semibold text-gray-800 truncate w-full">{savedCities[index].name}</h2>
              <p className="text-gray-500 text-sm mt-1">Local Weather</p>
              <p className="text-6xl font-bold text-blue-600 mt-4">
                {weatherData[savedCities[index]._id] === undefined ? "..." : weatherData[savedCities[index]._id] === null ? "N/A" : `${weatherData[savedCities[index]._id]?.temperature}° C`}
              </p>
            </div>
            <button onClick={handleNext} className="text-2xl font-bold text-blue-500 hover:text-blue-700 transition">➡</button>
          </div>
        ) : (
          <p className="text-gray-600 mt-4">No saved locations. Add one on the 'My Saved Places' page!</p>
        )}
      </div>
    </main>
  );
}
