import { NextResponse } from "next/server";

// We keep a simple in-memory cache of branches by bank code
let branchCache = {}; // bankCode -> { data: parsedJSON, timestamp: number }
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let bankCode = searchParams.get("bank");

    if (!bankCode) {
      return NextResponse.json(
        { error: "Missing bank parameter" },
        { status: 400 }
      );
    }

    bankCode = bankCode.toUpperCase();
    const now = Date.now();

    let bankData = null;
    if (
      branchCache[bankCode] &&
      now - branchCache[bankCode].timestamp < CACHE_DURATION
    ) {
      bankData = branchCache[bankCode].data;
    } else {
      console.log(`Fetching branch dataset for ${bankCode} from Razorpay IFSC API...`);
      const response = await fetch(
        `https://raw.githubusercontent.com/razorpay/ifsc-api/master/data/${bankCode}.json`,
        {
          cache: "no-store", // We handle caching in memory to avoid Next.js 2MB cache limits
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // If bank code is not found, return empty array
          return NextResponse.json([]);
        }
        throw new Error(`Failed to fetch branch data: ${response.statusText}`);
      }

      bankData = await response.json();
      branchCache[bankCode] = {
        data: bankData,
        timestamp: now,
      };
      console.log(`Branch dataset for ${bankCode} cached successfully`);
    }

    const branches = [];
    
    // The dataset is an object where keys are IFSC codes and values are details objects:
    // { "HDFC0000001": { BANK: "HDFC Bank", IFSC: "HDFC0000001", BRANCH: "...", ... } }
    for (const [ifsc, details] of Object.entries(bankData)) {
      if (details) {
        branches.push({
          ifsc: ifsc,
          branch: details.BRANCH || "Unknown Branch",
          address: details.ADDRESS || "",
          city: details.CITY || "",
          state: details.STATE || "",
        });
      }
    }

    // Sort alphabetically by branch name
    branches.sort((a, b) => (a.branch || "").localeCompare(b.branch || ""));

    return NextResponse.json(branches);
  } catch (error) {
    console.error("Error in /api/ifsc/branches:", error);
    return NextResponse.json(
      { error: "Failed to fetch branches list" },
      { status: 500 }
    );
  }
}

