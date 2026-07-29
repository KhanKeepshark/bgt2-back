import type { Request } from 'express';
import type { SessionMetadata } from '../types/session-metadata.types';
import { IS_DEV_ENV } from './is-dev.util';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import DeviceDetector = require('device-detector-js');

const UNKNOWN_LOCATION = {
  country: 'Unknown',
  city: 'Unknown',
  latitude: 0,
  longitude: 0,
} as const;

function resolveClientIp(req: Request): string {
  if (IS_DEV_ENV) {
    return '173.166.164.121';
  }

  const cloudflareIP = req.headers['cf-connecting-ip'];
  if (cloudflareIP) {
    return Array.isArray(cloudflareIP) ? cloudflareIP[0] : cloudflareIP;
  }

  if (req.headers['x-forwarded-for']) {
    const forwardedIP = req.headers['x-forwarded-for'];
    return typeof forwardedIP === 'string' ? forwardedIP.split(',')[0] : req.ip;
  }

  return req.ip;
}

export function getSessionMetadata(
  req: Request,
  userAgent: string,
): SessionMetadata {
  const device = new DeviceDetector().parse(userAgent);

  return {
    location: UNKNOWN_LOCATION,
    device: {
      browser: device.client?.name || 'Unknown',
      os: device.os?.name || 'Unknown',
      type: device.device?.type || 'Unknown',
    },
    ip: resolveClientIp(req),
  };
}
