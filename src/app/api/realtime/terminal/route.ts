import { NextRequest } from "next/server";
import { auth } from "@/modules/identity/lib/auth";
import { Redis } from "@upstash/redis";
import type { RealtimeEvent } from "@/shared/lib/realtime-events";

export const runtime = "nodejs"; // Node.js runtime for persistent Redis connections
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CHANNEL_NAME = "axon:events";

/**
 * Get Redis client instance
 */
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({
    url,
    token,
  });
}

/**
 * Format Server-Sent Event message
 */
function formatSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const redis = getRedisClient();

  if (!redis) {
    // Fallback: return error or empty stream if Redis not configured
    return new Response(
      JSON.stringify({ error: "Realtime service unavailable" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          formatSSE({
            type: "connected",
            timestamp: new Date().toISOString(),
            userId,
          })
        )
      );

      console.log(`[Realtime SSE] User ${userId} connected to terminal stream`);

      // Poll Redis for new events (Upstash REST API doesn't support native pub/sub)
      const eventKey = `${CHANNEL_NAME}:${userId}`;
      let unsubscribe: (() => void) | null = null;
      let consecutiveEmptyPolls = 0;
      let isPolling = false; // Prevent concurrent polling
      let pollIntervalMs = 1000; // Start with 1 second (balance between UX and Redis usage)
      let pollInterval: NodeJS.Timeout | null = null;

      // Polling function
      const pollForEvents = async () => {
        // Prevent concurrent polling
        if (isPolling) {
          return;
        }

        try {
          isPolling = true;

          // First check if list has items (LLEN is cheaper than RPOP)
          const listLength = await redis.llen(eventKey);
          
          if (listLength === 0) {
            consecutiveEmptyPolls++;
            // Adaptive polling: increase interval if no events for a while
            if (consecutiveEmptyPolls > 10 && pollInterval) {
              pollIntervalMs = Math.min(pollIntervalMs * 1.5, 10000); // Max 10s
              clearInterval(pollInterval);
              pollInterval = setInterval(pollForEvents, pollIntervalMs);
            }
            return;
          }

          // Reset adaptive polling on events
          consecutiveEmptyPolls = 0;
          if (pollIntervalMs > 1000 && pollInterval) {
            pollIntervalMs = 1000; // Reset to base interval
            clearInterval(pollInterval);
            pollInterval = setInterval(pollForEvents, pollIntervalMs);
          }

          // Batch process: get up to 10 events at once using LRANGE + LTRIM
          // This is more efficient than multiple RPOP calls
          const events = await redis.lrange(eventKey, -10, -1); // Get last 10 items
          const countToRemove = Math.min(events.length, 10);
          
          if (countToRemove > 0) {
            // Remove processed events from the list
            await redis.ltrim(eventKey, 0, -(countToRemove + 1));
            
            // Process events in reverse order (newest first)
            for (const eventData of events.reverse()) {
              try {
                // Upstash Redis REST API automatically parses JSON, so eventData is already an object
                const event: RealtimeEvent = typeof eventData === 'string' 
                  ? JSON.parse(eventData) 
                  : (eventData as RealtimeEvent);
                
                // Only send events for this user (double-check)
                if (event.userId === userId) {
                  controller.enqueue(encoder.encode(formatSSE(event)));
                }
              } catch (parseError) {
                console.error("[Realtime SSE] Failed to parse event:", parseError, "EventData:", eventData);
              }
            }
          }
        } catch (error: any) {
          // Handle rate limit errors gracefully
          if (error?.message?.includes("max requests limit exceeded")) {
            console.error("[Realtime SSE] Redis rate limit exceeded, backing off");
            // Increase polling interval significantly on rate limit
            pollIntervalMs = Math.min(pollIntervalMs * 2, 30000); // Max 30s
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = setInterval(pollForEvents, pollIntervalMs);
            }
          } else {
            console.error("[Realtime SSE] Polling error:", error);
          }
        } finally {
          isPolling = false;
        }
      };

      try {
        // Start polling with initial interval
        pollInterval = setInterval(pollForEvents, pollIntervalMs);

        // Store unsubscribe function
        unsubscribe = () => {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        };

        // Keep-alive ping every 25 seconds
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(
              encoder.encode(
                formatSSE({
                  type: "keepalive",
                  timestamp: new Date().toISOString(),
                })
              )
            );
          } catch (error) {
            // Stream may be closed
            clearInterval(keepAlive);
          }
        }, 25000);
      } catch (error) {
        console.error("[Realtime SSE] Subscription error:", error);
        controller.close();
      }

      // Handle client disconnect
      req.signal?.addEventListener("abort", () => {
        if (unsubscribe) {
          unsubscribe();
        }
        try {
          controller.close();
        } catch (e) {
          // Stream may already be closed
        }
      });
    },
    cancel() {
      // Cleanup on cancel
      console.log(`[Realtime SSE] Stream cancelled for user ${userId}`);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "private, no-store, no-cache, no-transform, max-age=0",
      Pragma: "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

