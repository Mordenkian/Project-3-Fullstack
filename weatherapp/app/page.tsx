"use client";

import React, { useState, useEffect } from "react";
import { getUserId } from "@/lib/getUserId";
import DetailedForecastModal from "@/app/forecastmodal";
import axios from "axios";

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

interface WeatherData {
  temperature_c: number;
  temperature_f: number;
  conditionText: string;
  conditionIcon: string;
  feelsLike_c: number;
  feelsLike_f: number;
  humidity: number;
  windSpeed_kph: number;
  windSpeed_mph: number;
  forecast: ForecastDay[];
  hourlyForecast: HourData[];
  uv: number;
  aqi: number;
}

interface SavedCity {
  _id: string;
  name: string;
  userId: string;
  lat?: number; // Optional latitude for current location
  lon?: number; // Optional longitude for current location
}

interface WeatherAPIResponse {
  current: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string;
    };
    feelslike_c: number;
    feelslike_f: number;
    humidity: number;
    wind_kph: number;
    wind_mph: number;
    last_updated_epoch: number;
    uv: number;
    air_quality: {
      "us-epa-index": number;
    };
  };
  forecast: { forecastday: ForecastDay[] };
}

export default function HomePage() {
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData | null>>({});
  const [savedCities, setSavedCities] = useState<SavedCity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [units, setUnits] = useState<'celsius' | 'fahrenheit'>('celsius');
  const [index, setIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<ForecastDay | null>(null);

  // Effect to manage unit persistence in localStorage
  useEffect(() => {
    const savedUnits = localStorage.getItem('weather-app-units') as 'celsius' | 'fahrenheit' | null;
    if (savedUnits) {
      setUnits(savedUnits);
    }
  }, []);

  useEffect(() => {
    if (units) {
      localStorage.setItem('weather-app-units', units);
    }
  }, [units]);

  useEffect(() => {
    const id = getUserId();
    setUserId(id);

    const fetchInitialData = async () => {
      const citiesHaveChanged = sessionStorage.getItem('citiesChanged');

      // If we already have cities AND they haven't changed, skip the fetch.
      if (savedCities.length > 0 && !citiesHaveChanged) {
        setIsLoading(false);
        return;
      }

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

        // Reset state before setting new data, especially after a change
        setWeatherData({});
        setSavedCities([currentLocation, ...savedCitiesResponse.data]);

        // After a successful fetch, clear the flag so we don't refetch again
        if (citiesHaveChanged) sessionStorage.removeItem('citiesChanged');
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
        // Request 4 days of forecast data (today + next 3 days)
        const response = await axios.get<WeatherAPIResponse>(`/api/weather?q=${query}&days=4&aqi=yes`);

        // Safely destructure and provide fallbacks
        const { current, forecast } = response.data;

        if (!current || !forecast) {
          throw new Error("Invalid data structure from weather API");
        }

        const { temp_c, temp_f, condition, feelslike_c, feelslike_f, humidity, wind_kph, wind_mph, last_updated_epoch, uv, air_quality } = current;

        // Combine today's upcoming hours with tomorrow's hours for a full 24h forecast
        const todaysHours = forecast.forecastday[0]?.hour || [];
        const tomorrowsHours = forecast.forecastday[1]?.hour || [];

        const upcomingHoursToday = todaysHours.filter(hour => {
          const hourEpoch = new Date(hour.time).getTime() / 1000;
          return hourEpoch > last_updated_epoch;
        });

        const full24HourForecast = [...upcomingHoursToday, ...tomorrowsHours].slice(0, 24);

        // Keep the original forecast structure for the 3-day view
        const processedForecast = forecast.forecastday ?? [];

        setWeatherData((prev) => ({
          ...prev,
          [city._id]: {
            temperature_c: temp_c,
            temperature_f: temp_f,
            conditionText: condition.text,
            conditionIcon: condition.icon,
            feelsLike_c: feelslike_c,
            feelsLike_f: feelslike_f,
            humidity: humidity,
            windSpeed_kph: wind_kph,
            windSpeed_mph: wind_mph,
            forecast: processedForecast,
            hourlyForecast: full24HourForecast,
            uv: uv ?? 0, // Provide fallback for UV
            aqi: air_quality?.["us-epa-index"] ?? 0, // Safely access AQI and provide fallback
          },
        }));
      } catch (err) {
        console.error(`Could not fetch weather for ${city.name}:`, err);
        setWeatherData((prev) => ({ ...prev, [city._id]: null })); // Mark as failed
      }
    };

    fetchWeatherForCity();
  }, [index, savedCities]);

  const handleNext = () => {
    if (savedCities.length === 0) return;
    setIndex((prevIndex) => (prevIndex + 1) % savedCities.length);
  };

  const handlePrev = () => {
    if (savedCities.length === 0) return;
    setIndex((prevIndex) => (prevIndex - 1 + savedCities.length) % savedCities.length);
  };

  const getAqiInfo = (aqi: number): { text: string; color: string } => {
    if (aqi === 1) return { text: "Good", color: "bg-green-500" };
    if (aqi === 2) return { text: "Moderate", color: "bg-yellow-500" };
    if (aqi === 3) return { text: "Unhealthy for sensitive groups", color: "bg-orange-500" };
    if (aqi === 4) return { text: "Unhealthy", color: "bg-red-500" };
    if (aqi === 5) return { text: "Very Unhealthy", color: "bg-purple-500" };
    if (aqi >= 6) return { text: "Hazardous", color: "bg-maroon-500" }; // A custom color might be needed
    return { text: "Unknown", color: "bg-gray-400" };
  };

  const getUvInfo = (uv: number): string => {
    if (uv <= 2) return "Low"; if (uv <= 5) return "Moderate"; if (uv <= 7) return "High";
    if (uv <= 10) return "Very High"; return "Extreme";
  };

  return (
    <main className="flex flex-col items-center justify-center p-6 pt-20">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md md:max-w-2xl p-6 md:p-8 text-center">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Weather</h1>
          <div className="flex items-center border border-gray-300 rounded-full p-1 text-sm">
            <button
              onClick={() => setUnits('celsius')}
              className={`px-3 py-1 rounded-full transition-colors ${units === 'celsius' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
            >
              °C
            </button>
            <button
              onClick={() => setUnits('fahrenheit')}
              className={`px-3 py-1 rounded-full transition-colors ${units === 'fahrenheit' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
            >
              °F
            </button>
          </div>
        </div>
        {isLoading ? (
          <p>Loading locations...</p>
        ) : savedCities.length > 0 ? (
          <div className="flex items-center justify-between w-full">
            <button onClick={handlePrev} aria-label="Previous city" className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
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
                <div className="flex flex-col items-center flex-1 mx-4 min-w-0">
                  <div className="flex items-center justify-center gap-x-2 w-full min-h-[56px]">
                    {savedCities[index]._id === "current-location" && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-500 flex-shrink-0">
                        <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.1.4-.27.61-.474l.21-.203a.5.5 0 0 0-.753-.664l-.21.203c-.21.204-.423.375-.61.475a5.741 5.741 0 0 0-.281.14l-.018.008-.006.003Z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                      </svg>
                    )}
                    <h2 className="text-2xl font-semibold text-gray-800 break-words">{savedCities[index].name}</h2>
                  </div>
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 md:gap-x-8 items-center">
                    <div className="flex flex-col items-center">
                      <img src={currentWeatherData.conditionIcon} alt={currentWeatherData.conditionText} className="w-20 h-20" />
                      <p className="text-gray-600 -mt-2">{currentWeatherData.conditionText}</p>
                      <p className="text-6xl font-bold text-blue-600 mt-2">
                        {units === 'celsius'
                          ? `${Math.round(currentWeatherData.temperature_c)}°C`
                          : `${Math.round(currentWeatherData.temperature_f)}°F`}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600 mt-4 md:mt-0 space-y-2 text-center">
                      <p>Feels like: {units === 'celsius' ? Math.round(currentWeatherData.feelsLike_c) : Math.round(currentWeatherData.feelsLike_f)}°</p>
                      <p>Humidity: {currentWeatherData.humidity}%</p>
                      <p>Wind: {units === 'celsius' ? `${Math.round(currentWeatherData.windSpeed_kph)} kph` : `${Math.round(currentWeatherData.windSpeed_mph)} mph`}</p>
                      <p>UV Index: {currentWeatherData.uv} ({getUvInfo(currentWeatherData.uv)})</p>
                      <div className="flex items-center justify-center gap-x-2">
                        <span>AQI: {getAqiInfo(currentWeatherData.aqi).text}</span>
                        <span
                          className={`inline-block w-3 h-3 rounded-full ${getAqiInfo(currentWeatherData.aqi).color}`}
                        ></span>
                      </div>
                    </div>
                  </div>
                  {/* Hourly Forecast */}
                  <div className="w-full mt-6">
                    <div className="flex space-x-4 overflow-x-auto pb-2">
                      {currentWeatherData.hourlyForecast?.map((hourData) => (
                        <div key={hourData.time} className="flex-shrink-0 flex flex-col items-center gap-y-1 p-2 rounded-lg bg-gray-50">
                          <p className="text-xs font-medium text-gray-600">
                            {new Date(hourData.time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}
                          </p>
                          <img src={hourData.condition.icon} alt={hourData.condition.text} className="w-8 h-8" />
                          <p className="text-sm font-bold text-gray-800">
                            {units === 'celsius' ? `${Math.round(hourData.temp_c)}°` : `${Math.round(hourData.temp_f)}°`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 3-Day Forecast */}
                  <div className="border-t border-gray-200 w-full mt-6 pt-4">
                    <div className="flex justify-around text-sm">
                      {currentWeatherData.forecast?.slice(1, 3).map((day) => (
                        <button
                          key={day.date}
                          onClick={() => setSelectedDay(day)}
                          aria-label={`View detailed forecast for ${new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: 'long', timeZone: 'UTC' })}`}
                          className="flex flex-col items-center gap-y-1 p-2 rounded-lg hover:bg-gray-100 transition-colors w-full text-center"
                        >
                            <p className="font-semibold text-gray-600">
                              {new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en-US", { weekday: 'short', timeZone: 'UTC' })}
                            </p>
                            <img src={day.day.condition.icon} alt={day.day.condition.text} className="w-8 h-8" />
                            <p className="text-gray-800">
                              {units === 'celsius'
                                ? `${Math.round(day.day.maxtemp_c)}° / ${Math.round(day.day.mintemp_c)}°`
                                : `${Math.round(day.day.maxtemp_f)}° / ${Math.round(day.day.mintemp_f)}°`}
                            </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
            <button onClick={handleNext} aria-label="Next city" className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        ) : (
          <p className="text-gray-600 mt-4">No saved locations. Add one on the 'My Saved Places' page!</p>
        )}
      </div>

      {selectedDay && (
        <DetailedForecastModal
          dayData={selectedDay}
          onClose={() => setSelectedDay(null)}
          units={units}
        />
      )}
    </main>
  );
}
