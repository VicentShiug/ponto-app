-- CreateTable
CREATE TABLE "extra_time_entries" (
    "id" TEXT NOT NULL,
    "time_entry_id" TEXT NOT NULL,
    "return_time" TIMESTAMP(3) NOT NULL,
    "exit_time" TIMESTAMP(3),
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extra_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "extra_time_entries_time_entry_id_order_key" ON "extra_time_entries"("time_entry_id", "order");

-- AddForeignKey
ALTER TABLE "extra_time_entries" ADD CONSTRAINT "extra_time_entries_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "time_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
