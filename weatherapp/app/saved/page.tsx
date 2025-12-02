"use client";

import React, { useState, useEffect, type FormEvent } from "react";
import { getUserId } from "@/lib/getUserId";
import axios from "axios";

interface SavedCity {
  _id: string;
  name: string;
  userId: string;
}

export default function SavedLocationsPage() {
  const [inputCity, setInputCity] = useState("");
  const [savedCities, setSavedCities] = useState<SavedCity[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch cities when the component mounts and userId is available
  useEffect(() => {
    const id = getUserId();
    setUserId(id);

    const fetchCities = async () => {
      if (!id) return;
      try {
        const response = await axios.get(`/api/cities/${id}`);
        setSavedCities(response.data);
      } catch (error) {
        console.error("Could not load cities:", error);
      }
    };

    fetchCities();
  }, []);

  // Effect for autocomplete with debouncing
  useEffect(() => {
    if (!inputCity.trim()) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        // We can use our own API route as a proxy if we want to hide the key,
        // but for simplicity, we'll assume the weather API has a search endpoint we can hit.
        // Let's create a new API route for this.
        const response = await axios.get(`/api/search-cities?q=${inputCity}`);
        setSuggestions(response.data);
      } catch (error) {
        console.error("Could not fetch city suggestions:", error);
        setSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchSuggestions();
    }, 300); // Wait for 300ms after user stops typing

    return () => clearTimeout(debounceTimer); // Cleanup timer
  }, [inputCity]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputCity.trim() || !userId) return;

    try {
      const response = await axios.post("/api/cities", { name: inputCity, userId: userId });
      setSavedCities([...savedCities, response.data]); // Optimistically update UI
      setInputCity("");
      setSuggestions([]);
      sessionStorage.setItem('citiesChanged', 'true'); // Set flag for home page
    } catch (error) {
      console.error("Could not save city:", error);
      alert("Failed to save city. It might already be saved.");
    }
  };

  const handleDelete = async (cityId: string) => {
    if (!userId) return;
    try {
      await axios.delete(`/api/cities`, { data: { cityId, userId } });
      setSavedCities(savedCities.filter((city) => city._id !== cityId)); // Optimistically update UI
      sessionStorage.setItem('citiesChanged', 'true'); // Set flag for home page
    } catch (error) {
      console.error("Could not delete city:", error);
      alert("Failed to delete city.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Manage Places</h2>
      <form onSubmit={handleSave} className="relative flex gap-2 mb-6">
        <div className="flex-grow">
          <label htmlFor="city-input" className="sr-only">
            Enter city
          </label>
          <input
            id="city-input"
            type="text" value={inputCity} onChange={(e) => setInputCity(e.target.value)} placeholder="Enter city..."
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.id}
                  onClick={() => {
                    setInputCity(suggestion.name); // Use only the city name for saving
                    setSuggestions([]);
                  }}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                >{`${suggestion.name}, ${suggestion.region}, ${suggestion.country}`}</li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">Add</button>
      </form>
      <ul className="space-y-3">
        {savedCities.map((city) => (
          <li key={city._id} className="flex justify-between items-center p-3 bg-gray-100 rounded-md">
            <span className="text-gray-700">{city.name}</span>
            <button onClick={() => handleDelete(city._id)} className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 text-sm">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
