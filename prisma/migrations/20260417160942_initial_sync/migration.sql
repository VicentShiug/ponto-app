-- -- CreateEnum
-- CREATE TYPE "Role" AS ENUM ('MANAGER', 'EMPLOYEE', 'SUPER_ADMIN');

-- -- CreateEnum
-- CREATE TYPE "OvertimeMode" AS ENUM ('OVERTIME', 'HOUR_BANK');

-- -- CreateTable
-- CREATE TABLE "users" (
--     "id" TEXT NOT NULL,
--     "name" TEXT NOT NULL,
--     "email" TEXT NOT NULL,
--     "password_hash" TEXT NOT NULL,
--     "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
--     "weekly_hours" DOUBLE PRECISION NOT NULL DEFAULT 40,
--     "work_days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
--     "overtime_mode" "OvertimeMode" NOT NULL DEFAULT 'HOUR_BANK',
--     "active" BOOLEAN NOT NULL DEFAULT true,
--     "avatar_url" TEXT,
--     "accent_color" TEXT DEFAULT 'default',
--     "theme" TEXT DEFAULT 'light',
--     "light_intensity" TEXT DEFAULT 'medium',
--     "dark_intensity" TEXT DEFAULT 'medium',
--     "journey_start" TEXT,
--     "journey_lunch" TEXT,
--     "journey_lunch_return" TEXT,
--     "journey_end" TEXT,
--     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     "updated_at" TIMESTAMP(3) NOT NULL,
--     "manager_id" TEXT,

--     CONSTRAINT "users_pkey" PRIMARY KEY ("id")
-- );

-- -- CreateTable
-- CREATE TABLE "time_entries" (
--     "id" TEXT NOT NULL,
--     "user_id" TEXT NOT NULL,
--     "date" DATE NOT NULL,
--     "clock_in" TIMESTAMP(3),
--     "lunch_out" TIMESTAMP(3),
--     "lunch_in" TIMESTAMP(3),
--     "clock_out" TIMESTAMP(3),
--     "notes" TEXT,
--     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     "updated_at" TIMESTAMP(3) NOT NULL,

--     CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
-- );

-- -- CreateTable
-- CREATE TABLE "hour_bank_adjustments" (
--     "id" TEXT NOT NULL,
--     "user_id" TEXT NOT NULL,
--     "manager_id" TEXT NOT NULL,
--     "minutes" INTEGER NOT NULL,
--     "reason" TEXT NOT NULL,
--     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

--     CONSTRAINT "hour_bank_adjustments_pkey" PRIMARY KEY ("id")
-- );

-- -- CreateTable
-- CREATE TABLE "audit_logs" (
--     "id" TEXT NOT NULL,
--     "actor_id" TEXT NOT NULL,
--     "action" TEXT NOT NULL,
--     "target_user_id" TEXT,
--     "details" JSONB NOT NULL,
--     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

--     CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
-- );

-- -- CreateIndex
-- CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- -- CreateIndex
-- CREATE UNIQUE INDEX "time_entries_user_id_date_key" ON "time_entries"("user_id", "date");

-- -- AddForeignKey
-- ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- -- AddForeignKey
-- ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- -- AddForeignKey
-- ALTER TABLE "hour_bank_adjustments" ADD CONSTRAINT "hour_bank_adjustments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- -- AddForeignKey
-- ALTER TABLE "hour_bank_adjustments" ADD CONSTRAINT "hour_bank_adjustments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- -- AddForeignKey
-- ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- -- AddForeignKey
-- ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
