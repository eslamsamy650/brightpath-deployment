-- CreateTable
CREATE TABLE "calendar_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "class_id" UUID,
    "author_id" UUID NOT NULL,
    "title_ar" VARCHAR(255) NOT NULL,
    "title_en" VARCHAR(255),
    "description_ar" TEXT,
    "description_en" TEXT,
    "audience" VARCHAR(30) NOT NULL DEFAULT 'ALL',
    "start_at" TIMESTAMPTZ NOT NULL,
    "end_at" TIMESTAMPTZ NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "location_ar" VARCHAR(255),
    "location_en" VARCHAR(255),
    "color" VARCHAR(20),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "class_id" UUID,
    "created_by_id" UUID NOT NULL,
    "title_ar" VARCHAR(255) NOT NULL,
    "title_en" VARCHAR(255),
    "description_ar" TEXT,
    "description_en" TEXT,
    "type" VARCHAR(30) NOT NULL DEFAULT 'LINK',
    "audience" VARCHAR(30) NOT NULL DEFAULT 'ALL',
    "url" TEXT,
    "file_name" VARCHAR(255),
    "mime_type" VARCHAR(100),
    "storage_path" TEXT,
    "published_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_events_school_id_start_at_idx" ON "calendar_events"("school_id", "start_at");

-- CreateIndex
CREATE INDEX "calendar_events_class_id_start_at_idx" ON "calendar_events"("class_id", "start_at");

-- CreateIndex
CREATE INDEX "calendar_events_author_id_idx" ON "calendar_events"("author_id");

-- CreateIndex
CREATE INDEX "resources_school_id_published_at_idx" ON "resources"("school_id", "published_at");

-- CreateIndex
CREATE INDEX "resources_class_id_published_at_idx" ON "resources"("class_id", "published_at");

-- CreateIndex
CREATE INDEX "resources_created_by_id_idx" ON "resources"("created_by_id");

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
