import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { redis } from '../config/redis';
import { TooManyRequestsError } from '../utils/errors';

// General API rate limiter: 100 requests per minute per IP
const generalLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:general',
  points: 100,
  duration: 60,
});

// Login rate limiter: 20 attempts per 15 minutes per IP
const loginLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:login',
  points: 20,
  duration: 60 * 15,
  insuranceLimiter: new RateLimiterMemory({
    points: 20,
    duration: 60 * 15,
  }),
});

export function rateLimit(req: Request, _res: Response, next: NextFunction) {
  generalLimiter
    .consume(req.ip ?? 'unknown')
    .then(() => next())
    .catch(() => next(new TooManyRequestsError()));
}

export function loginRateLimit(req: Request, _res: Response, next: NextFunction) {
  loginLimiter
    .consume(req.ip ?? 'unknown')
    .then(() => next())
    .catch(() => next(new TooManyRequestsError('Too many login attempts. Try again in 15 minutes.')));
}
