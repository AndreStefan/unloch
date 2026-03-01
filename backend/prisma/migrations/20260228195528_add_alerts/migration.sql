-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "therapist_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "rule_id" TEXT,
    "message_id" TEXT,
    "level" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerts_therapist_id_status_created_at_idx" ON "alerts"("therapist_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "therapists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
