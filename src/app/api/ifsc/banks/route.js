import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/razorpay/ifsc/master/src/banknames.json",
      {
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch bank names: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Convert object to array of { code, name } for easier mapping in frontend
    const banksArray = Object.entries(data).map(([code, name]) => ({
      code,
      name,
    }));

    // Sort alphabetically by bank name
    banksArray.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(banksArray);
  } catch (error) {
    console.error("Error in /api/ifsc/banks:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank list" },
      { status: 500 }
    );
  }
}
