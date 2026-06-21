import {
  pgTable,
  serial,
  text,
  doublePrecision,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

/**
 * Canonical database schema. This is the single source of truth — the old PHP
 * app assumed these tables existed but committed no DDL anywhere.
 *
 * Notes:
 *  - `doublePrecision` (float8), never `numeric` — node-postgres returns
 *    `numeric` as strings, which would break the frontend's float arithmetic
 *    (color interpolation, lat/lon math).
 *  - `timestamptz` (withTimezone) serializes to ISO-8601, which the browser's
 *    `new Date(...)` parses reliably across engines.
 */

export const drivingTimeCache = pgTable('driving_time_cache', {
  // "slat_slon_dlat_dlon" with 6 decimals each (see frontend getCacheKey)
  cacheKey: text('cache_key').primaryKey(),
  // driving time in minutes
  duration: doublePrecision('duration').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export const mapRequests = pgTable('map_requests', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().default('My Map'),
  centerLat: doublePrecision('center_lat').notNull(),
  centerLon: doublePrecision('center_lon').notNull(),
  destLat: doublePrecision('dest_lat').notNull(),
  destLon: doublePrecision('dest_lon').notNull(),
  radius: integer('radius').notNull(),
  hexSize: doublePrecision('hex_size').notNull().default(0.4),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

/** A single point of interest returned by the Overpass query. */
export interface Poi {
  lat: number;
  lon: number;
  category: string;
  name?: string;
  /** OSM website / contact:website tag, if present. */
  website?: string;
  /** OSM opening_hours tag (raw OSM syntax), if present. */
  openingHours?: string;
}

/**
 * Cached Overpass POI results, keyed by rounded bounding box + sorted category
 * list. Mirrors the driving-time cache pattern: the expensive external call is
 * cached, repeated identical queries are served from Postgres.
 */
export const poiCache = pgTable('poi_cache', {
  cacheKey: text('cache_key').primaryKey(),
  data: jsonb('data').$type<Poi[]>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

/** Per-commune asking-price series; `apartment`/`house` align to the shared
 *  `years` array (null = no data that year, e.g. too few offers or a commune
 *  that no longer exists after a merger). Prices are €/m². */
export interface CommunePriceSeries {
  name: string;
  apartment: (number | null)[];
  house: (number | null)[];
}

/** National real-estate price dataset, parsed from the Observatoire de
 *  l'Habitat retrospective "prix annoncés" workbooks (data.public.lu, CC0). */
export interface LuPriceData {
  years: number[];
  communes: CommunePriceSeries[];
  source: string;
  fetchedAt: string; // ISO timestamp of the parse
}

/**
 * Cached real-estate price data. Like the POI cache, the expensive external
 * fetch+parse is cached in Postgres; the national series is a single row.
 */
export const realEstateCache = pgTable('real_estate_cache', {
  cacheKey: text('cache_key').primaryKey(),
  data: jsonb('data').$type<LuPriceData>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export type MapRequest = typeof mapRequests.$inferSelect;
export type NewMapRequest = typeof mapRequests.$inferInsert;
