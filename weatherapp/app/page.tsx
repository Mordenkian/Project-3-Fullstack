"use client";

import React, { useState, useEffect } from "react";
import { getUserId } from "@/lib/getUserId";
import axios from "axios";

interface WeatherData {
  temperature: number;
  conditionText: string;
  conditionIcon: string;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
}

interface SavedCity {
  _id: string;
  name: string;
  userId: string;
  lat?: number; // Optional latitude for current location
  lon?: number; // Optional longitude for current location
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
        const fetchCurrentLocation = new Promise<SavedCity>((resolve) => {
          if (!navigator.geolocation) {
            // Geolocation not supported, resolve with default
            return resolve({ _id: "current-location", name: "New York", userId: "-1" });
          }

          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const { latitude, longitude } = position.coords;
                // Reverse geocode to get city name from coordinates
                const geoResponse = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const address = geoResponse.data.address;
                const city = address.city || 
                             address.town || 
                             address.village || 
                             address.county || 
                             "New York";
                resolve({ _id: "current-location", name: city, userId: "-1", lat: latitude, lon: longitude });
              } catch (error) {
                console.error("Reverse geocoding failed, using default.", error);
                resolve({ _id: "current-location", name: "New York", userId: "-1" });
              }
            },
            (error) => {
              // User denied permission or another error occurred
              console.warn(`Geolocation error (${error.code}): ${error.message}`);
              resolve({ _id: "current-location", name: "New York", userId: "-1" });
            }
          );
        });

        // Fetch user's saved cities from our database
        const fetchSavedCities = axios.get(`/api/cities/${id}`);

        // Wait for both fetches to complete
        const [currentLocation, savedCitiesResponse] = await Promise.all([
          fetchCurrentLocation,
          fetchSavedCities,
        ]);

        setSavedCities([currentLocation, ...savedCitiesResponse.data]);
      } catch (error) {
        console.error("Could not load initial data:", error);
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
        // Use lat/lon for current location if available, otherwise use city name
        const query = city.lat && city.lon ? `${city.lat},${city.lon}` : city.name;
        const response = await axios.get(`/api/weather?q=${query}`);

        const { temp_c, condition, feelslike_c, humidity, wind_kph } = response.data.current;

        setWeatherData((prev) => ({
          ...prev,
          [city._id]: {
            temperature: temp_c,
            conditionText: condition.text,
            conditionIcon: condition.icon,
            feelsLike: feelslike_c,
            humidity: humidity,
            windSpeed: wind_kph,
          },
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
            {(() => {
              const currentCityId = savedCities[index]._id;
              const currentWeatherData = weatherData[currentCityId];

              if (currentWeatherData === undefined) {
                return <div className="w-48 h-48 flex items-center justify-center"><p>Loading...</p></div>;
              }

              if (currentWeatherData === null) {
                return <div className="w-48 h-48 flex flex-col items-center justify-center"><h2 className="text-2xl font-semibold text-gray-800 truncate w-full">{savedCities[index].name}</h2><p>N/A</p></div>;
              }

              return (
                <div className="flex flex-col items-center w-48">
                  <div className="flex items-center justify-center gap-x-2 w-full min-h-[56px]">
                    {savedCities[index]._id === "current-location" && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-500 flex-shrink-0">
                        <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.1.4-.27.61-.474l.21-.203a.5.5 0 0 0-.753-.664l-.21.203c-.21.204-.423.375-.61.475a5.741 5.741 0 0 0-.281.14l-.018.008-.006.003Z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                      </svg>
                    )}
                    <h2 className="text-2xl font-semibold text-gray-800 break-words">{savedCities[index].name}</h2>
                  </div>
                  <img src={currentWeatherData.conditionIcon} alt={currentWeatherData.conditionText} className="w-16 h-16" />
                  <p className="text-gray-600 -mt-2">{currentWeatherData.conditionText}</p>
                  <p className="text-6xl font-bold text-blue-600 mt-2">{Math.round(currentWeatherData.temperature)}°C</p>
                  <div className="text-xs text-gray-500 mt-4 grid grid-cols-3 gap-x-4">
                    <p>Feels like: {Math.round(currentWeatherData.feelsLike)}°</p>
                    <p>Humidity: {currentWeatherData.humidity}%</p>
                    <p>Wind: {Math.round(currentWeatherData.windSpeed)} kph</p>
                  </div>
                </div>
              );
            })()}
            <button onClick={handleNext} className="text-2xl font-bold text-blue-500 hover:text-blue-700 transition">➡</button>
          </div>
        ) : (
          <p className="text-gray-600 mt-4">No saved locations. Add one on the 'My Saved Places' page!</p>
        )}
      </div>
    </main>
  );
}
