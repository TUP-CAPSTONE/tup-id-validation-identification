import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Create rate limiters for different endpoints
export const rateLimiters = {
  // OSA accepting validation requests - 10 per minute
  acceptValidation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "ratelimit:accept",
  }),

  // QR code verification - 30 per minute (allows multiple scans)
  verifyQR: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "ratelimit:verify",
  }),

  // Complete validation - 20 per minute
  completeValidation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: "ratelimit:complete",
  }),

  // Email sending - 5 per minute (prevents spam)
  sendEmail: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "ratelimit:email",
  }),
}

// Helper function to check rate limit and return standardized response
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier)

  return {
    success,
    limit,
    remaining,
    reset,
  }
}

// Helper to create rate limit headers
export function createRateLimitHeaders(result: {
  limit: number
  remaining: number
  reset: number
}) {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  }
}