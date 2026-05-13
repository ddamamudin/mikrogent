-- Rate limit bucket: persisten counter per (action, ip), atomic via INSERT ... ON CONFLICT.
CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
  "id"        TEXT         NOT NULL PRIMARY KEY,
  "action"    TEXT         NOT NULL,
  "ip"        TEXT         NOT NULL,
  "count"     INTEGER      NOT NULL,
  "resetAt"   TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "RateLimitBucket_action_ip_key"
  ON "RateLimitBucket"("action", "ip");

CREATE INDEX IF NOT EXISTS "RateLimitBucket_resetAt_idx"
  ON "RateLimitBucket"("resetAt");
