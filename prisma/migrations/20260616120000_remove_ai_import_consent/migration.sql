DELETE FROM "UserConsent" WHERE "type" = 'AI_IMPORT';

ALTER TYPE "ConsentType" RENAME TO "ConsentType_old";

CREATE TYPE "ConsentType" AS ENUM ('TERMS', 'PRIVACY', 'CROSS_BORDER_PD');

ALTER TABLE "UserConsent"
  ALTER COLUMN "type" TYPE "ConsentType"
  USING "type"::text::"ConsentType";

DROP TYPE "ConsentType_old";
