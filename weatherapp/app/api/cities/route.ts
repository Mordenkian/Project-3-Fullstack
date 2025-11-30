import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import City from "@/models/City";

/**
 * Handles POST requests to save a new city for a user.
 * @param req The Next.js request object.
 * @returns A Next.js response object with the saved city or an error.
 */
export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { name, userId } = await req.json();

    if (!name || !userId) {
      return NextResponse.json(
        { error: "City name and userId are required." },
        { status: 400 }
      );
    }

    const newCity = new City({ name, userId });
    const savedCity = await newCity.save();

    return NextResponse.json(savedCity, { status: 201 }); // 201 Created
  } catch (error: any) {
    // Handle duplicate key error (city already saved by the user)
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "This city has already been saved." },
        { status: 409 } // 409 Conflict is more appropriate than 400
      );
    }
    console.error("Failed to save city:", error);
    return NextResponse.json({ error: "Failed to save city." }, { status: 500 });
  }
}

/**
 * Handles DELETE requests to remove a saved city.
 * @param req The Next.js request object.
 * @returns A Next.js response object.
 */
export async function DELETE(req: NextRequest) {
  await dbConnect();

  try {
    const { cityId, userId } = await req.json();

    if (!userId || !cityId) {
      return NextResponse.json({ error: "userId and cityId are required." }, { status: 400 });
    }

    // Find and delete the city, ensuring the userId matches to prevent unauthorized deletions.
    const result = await City.findOneAndDelete({ _id: cityId, userId: userId });

    if (!result) {
      return NextResponse.json({ error: "City not found or user not authorized." }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete city." }, { status: 500 });
  }
}
