import { NextRequest, NextResponse } from "next/server";

/**
 * Handles GET requests to fetch weather data from WeatherAPI.com.
 * @param req The Next.js request object.
 * @returns A Next.js response object with the weather data or an error.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const city = searchParams.get("q");

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

  const url = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}`;

  try {
    const res = await fetch(url, {
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
