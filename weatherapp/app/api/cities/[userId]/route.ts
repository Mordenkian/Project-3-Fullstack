import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import City from "@/models/City";

// This forces the route to be rendered dynamically, disabling caching.
// This is crucial for ensuring the list of saved cities is always up-to-date.
export const dynamic = "force-dynamic";

/**
 * Handles GET requests to fetch all saved cities for a specific user.
 * @param req The Next.js request object.
 * @param params Contains the dynamic route parameters, e.g., { userId: '...' }.
 * @returns A Next.js response object with the list of cities or an error.
 */
export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ userId: string }> }
) {
  await dbConnect();

  try {
    // Await the params promise to resolve before accessing its properties
    const { userId } = await paramsPromise;
    const cities = await City.find({ userId: userId });
    return NextResponse.json(cities);
  } catch (error: any) {
    console.error("Failed to fetch cities:", error);
    return NextResponse.json(
      { error: "Failed to fetch cities." },
      { status: 500 }
    );
  }
}
