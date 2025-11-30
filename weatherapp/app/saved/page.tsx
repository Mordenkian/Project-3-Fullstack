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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputCity.trim() || !userId) return;

    try {
      const response = await axios.post("/api/cities", { name: inputCity, userId: userId });
      setSavedCities([...savedCities, response.data]); // Optimistically update UI
      setInputCity("");
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
    } catch (error) {
      console.error("Could not delete city:", error);
      alert("Failed to delete city.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">My Saved Places</h2>
      <form onSubmit={handleSave} className="flex gap-2 mb-6">
        <input type="text" value={inputCity} onChange={(e) => setInputCity(e.target.value)} placeholder="Enter city..." className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">Save</button>
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
