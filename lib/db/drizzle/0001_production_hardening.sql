ALTER TABLE "omito_conversations"
  ADD COLUMN IF NOT EXISTS "owner_id" integer REFERENCES "omito_users"("id");

UPDATE "omito_conversations" AS conversation
SET "owner_id" = (
  SELECT "sender_id"
  FROM "omito_messages"
  WHERE "conversation_id" = conversation."id"
  ORDER BY "created_at" ASC, "id" ASC
  LIMIT 1
)
WHERE conversation."owner_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "omito_messages"
    WHERE "conversation_id" = conversation."id"
  );

DELETE FROM "omito_likes" AS duplicate
USING "omito_likes" AS canonical
WHERE duplicate."post_id" = canonical."post_id"
  AND duplicate."user_id" = canonical."user_id"
  AND duplicate."id" > canonical."id";

CREATE UNIQUE INDEX IF NOT EXISTS "omito_likes_post_user_unique"
  ON "omito_likes" ("post_id", "user_id");

CREATE INDEX IF NOT EXISTS "omito_posts_visible_created_at_idx"
  ON "omito_posts" ("moderation_status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "omito_comments_post_visible_created_at_idx"
  ON "omito_comments" ("post_id", "moderation_status", "created_at" ASC);
CREATE INDEX IF NOT EXISTS "omito_messages_conversation_created_at_idx"
  ON "omito_messages" ("conversation_id", "created_at" ASC);
CREATE INDEX IF NOT EXISTS "omito_conversations_owner_id_idx"
  ON "omito_conversations" ("owner_id");
CREATE INDEX IF NOT EXISTS "omito_conversations_participant_id_idx"
  ON "omito_conversations" ("participant_id");