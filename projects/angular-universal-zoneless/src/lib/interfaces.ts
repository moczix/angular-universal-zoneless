import { NgZone, StaticProvider } from '@angular/core';


export interface BootstrapOptions {
  ngZone?: NgZone | 'zone.js' | 'noop';
  ngZoneEventCoalescing?: boolean;
}

export interface PlatformOptions {
  document?: string;
  url?: string;
  extraProviders?: StaticProvider[];
}