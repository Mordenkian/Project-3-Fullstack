import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const apiKey = process.env.WEATHER_API_KEY;
  const url = `http://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${query}`;

  try {
    const response = await axios.get(url);
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching from Weather API:', error);
    return NextResponse.json({ error: 'Failed to fetch city suggestions' }, { status: 500 });
  }
}
