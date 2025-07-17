import type { Request } from 'express';
import type { SessionMetadata } from '../types/session-metadata.types';
import { IS_DEV_ENV } from './is-dev.util';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import DeviceDetector = require('device-detector-js');
import { lookup } from 'geoip-lite';
import * as countries from 'i18n-iso-countries';

// eslint-disable-next-line @typescript-eslint/no-require-imports
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

export function getSessionMetadata(
  req: Request,
  userAgent: string,
): SessionMetadata {
  let ip: string;

  if (IS_DEV_ENV) {
    ip = '173.166.164.121';
  } else {
    const cloudflareIP = req.headers['cf-connecting-ip'];
    if (cloudflareIP) {
      ip = Array.isArray(cloudflareIP) ? cloudflareIP[0] : cloudflareIP;
    } else if (req.headers['x-forwarded-for']) {
      const forwardedIP = req.headers['x-forwarded-for'];
      ip = typeof forwardedIP === 'string' ? forwardedIP.split(',')[0] : req.ip;
    } else {
      ip = req.ip;
    }
  }

  const location = lookup(ip);
  const device = new DeviceDetector().parse(userAgent);

  return {
    location: {
      country: countries.getName(location.country, 'en') || 'Unknown',
      city: location.city || 'Unknown',
      latitude: location.ll[0] || 0,
      longitude: location.ll[1] || 0,
    },
    device: {
      browser: device.client?.name || 'Unknown',
      os: device.os?.name || 'Unknown',
      type: device.device?.type || 'Unknown',
    },
    ip,
  };
}
