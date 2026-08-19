import { NextRequest, NextResponse } from "next/server";
import { rateLimitAuth } from "@/shared/lib/rate-limit-redis";

/**
 * Test endpoint for rate limiting
 * POST /api/test/rate-limit
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email as string;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Test rate limiting
    const rateLimitResult = await rateLimitAuth(email);

    if (!rateLimitResult.success) {
      // Upstash returns reset in milliseconds, convert to seconds for calculation
      const resetSeconds = Math.floor(rateLimitResult.reset / 1000);
      const nowSeconds = Math.floor(Date.now() / 1000);
      const minutesUntilReset = Math.ceil((resetSeconds - nowSeconds) / 60);
      const errorMessage = minutesUntilReset > 0 
        ? `Too many attempts. Try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`
        : "Too many attempts. Please try again later.";
      
      return NextResponse.json(
        {
          error: errorMessage,
          rateLimited: true,
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Rate limit check passed",
      remaining: rateLimitResult.remaining,
      reset: rateLimitResult.reset,
    });
  } catch (error) {
    console.error("Rate limit test error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

