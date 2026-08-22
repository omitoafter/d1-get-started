ALTER TABLE "omito_users" ADD COLUMN IF NOT EXISTS "admin_role" text DEFAULT 'member' NOT NULL;
ALTER TABLE "omito_users" ADD COLUMN IF NOT EXISTS "account_status" text DEFAULT 'active' NOT NULL;
ALTER TABLE "omito_users" ADD COLUMN IF NOT EXISTS "suspension_reason" text;
ALTER TABLE "omito_users" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp with time zone;

ALTER TABLE "omito_posts" ADD COLUMN IF NOT EXISTS "moderation_status" text DEFAULT 'visible' NOT NULL;
ALTER TABLE "omito_posts" ADD COLUMN IF NOT EXISTS "moderation_reason" text;
ALTER TABLE "omito_posts" ADD COLUMN IF NOT EXISTS "moderated_at" timestamp with time zone;

ALTER TABLE "omito_comments" ADD COLUMN IF NOT EXISTS "moderation_status" text DEFAULT 'visible' NOT NULL;
ALTER TABLE "omito_comments" ADD COLUMN IF NOT EXISTS "moderation_reason" text;
ALTER TABLE "omito_comments" ADD COLUMN IF NOT EXISTS "moderated_at" timestamp with time zone;

ALTER TABLE "omito_articles" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'published' NOT NULL;
ALTER TABLE "omito_articles" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "omito_banners" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "image_url" text NOT NULL,
  "destination_url" text NOT NULL,
  "placements" text DEFAULT 'room' NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "created_by_id" integer NOT NULL REFERENCES "omito_users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "omito_reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "reporter_id" integer REFERENCES "omito_users"("id"),
  "target_type" text NOT NULL,
  "target_id" integer NOT NULL,
  "reason" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "resolution" text,
  "resolved_by_id" integer REFERENCES "omito_users"("id"),
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "omito_admin_audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_id" integer REFERENCES "omito_users"("id"),
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" integer,
  "summary" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "omito_banner_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "banner_id" integer NOT NULL REFERENCES "omito_banners"("id"),
  "event_type" text NOT NULL,
  "visitor_id" text DEFAULT 'legacy' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "omito_banner_events_visitor_unique"
  ON "omito_banner_events" USING btree ("banner_id", "event_type", "visitor_id");