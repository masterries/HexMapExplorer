CREATE TABLE "driving_time_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"duration" double precision NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "map_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'My Map' NOT NULL,
	"center_lat" double precision NOT NULL,
	"center_lon" double precision NOT NULL,
	"dest_lat" double precision NOT NULL,
	"dest_lon" double precision NOT NULL,
	"radius" integer NOT NULL,
	"hex_size" double precision DEFAULT 0.4 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
