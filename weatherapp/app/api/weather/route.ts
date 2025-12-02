import { NextRequest, NextResponse } from "next/server";

/**
 * Handles GET requests to fetch weather data from WeatherAPI.com.
 * @param req The Next.js request object.
 * @returns A Next.js response object with the weather data or an error.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const city = searchParams.get("q");
  const days = searchParams.get("days");
  const aqi = searchParams.get("aqi"); // Read the 'aqi' parameter from the request

  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Weather API key is not configured on the server." },
      { status: 500 }
    );
  }

  if (!city) {
    return NextResponse.json(
      { error: "City query parameter 'q' is required." },
      { status: 400 }
    );
  }

  // Use URLSearchParams for cleaner and safer URL construction
  const params = new URLSearchParams({
    key: apiKey,
    q: city,
    days: days || '1',
    aqi: aqi || 'no', // Use the 'aqi' param from the request, default to 'no'
    alerts: 'no',
  });

  try {
    const res = await fetch(`http://api.weatherapi.com/v1/forecast.json?${params.toString()}`, {
      next: { revalidate: 600 }, // Cache the response for 10 minutes
    });

    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
