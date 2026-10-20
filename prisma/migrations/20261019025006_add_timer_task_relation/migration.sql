-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TimerState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'active',
    "taskId" TEXT,
    "startTime" DATETIME NOT NULL,
    "pausedAt" DATETIME,
    "accumulatedSeconds" INTEGER NOT NULL DEFAULT 0,
    "running" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TimerState_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TimerState" ("accumulatedSeconds", "id", "pausedAt", "running", "startTime", "taskId") SELECT "accumulatedSeconds", "id", "pausedAt", "running", "startTime", "taskId" FROM "TimerState";
DROP TABLE "TimerState";
ALTER TABLE "new_TimerState" RENAME TO "TimerState";
CREATE UNIQUE INDEX "TimerState_taskId_key" ON "TimerState"("taskId");
CREATE UNIQUE INDEX "TimerState_id_key" ON "TimerState"("id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
