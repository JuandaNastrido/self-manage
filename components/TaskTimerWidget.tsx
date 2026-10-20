"use client";

import { Clock, Play, Pause, Square, Check, X } from "lucide-react";
import { useTimer } from "@/hooks/useTimer";
import { formatDuration } from "@/lib/utils/ui";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils/money";

interface TaskOption {
  id: string;
  title: string;
  priority: string;
}

interface TimerWidgetProps {
  availableTasks: TaskOption[];
}

export default function TaskTimerWidget({ availableTasks }: TimerWidgetProps) {
  const {
    timer,
    elapsedSeconds,
    isRunning,
    isLoading,
    error,
    start,
    pause,
    resume,
    stop,
  } = useTimer();

  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  if (isLoading && !timer) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="h-5 w-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Activity Timer
        </h3>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mb-4">
        <div className="text-3xl font-mono font-bold text-gray-900 dark:text-gray-100">
          {formatDuration(elapsedSeconds)}
        </div>
        {timer?.running && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {timer.task?.title
              ? `Bekerja pada: ${timer.task.title}`
              : "Timer berjalan..."}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {!isRunning && !timer?.running && (
          <>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="">Pilih tugas...</option>
              {availableTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>

            <button
              onClick={async () => {
                await start(selectedTaskId || undefined);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Mulai Timer
            </button>
          </>
        )}

        {timer?.running && (
          <>
            <button
              onClick={pause}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>

            <button
              onClick={async () => {
                const secs = await stop();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Square className="h-4 w-4" />
              Selesai
            </button>
          </>
        )}

        {timer && !timer.running && timer.startTime && (
          <button
            onClick={resume}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Play className="h-4 w-4" />
            Lanjutkan Timer
          </button>
        )}
      </div>

      {timer?.running && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={async () => {
              if (confirm("Berhentikan timer dan hapus sesi ini?")) {
                await stop();
              }
            }}
            className="w-full text-sm text-red-600 dark:text-red-400 hover:text-red-700"
          >
            <X className="h-4 w-4 inline mr-1" />
            Batalkan timer
          </button>
        </div>
      )}
    </div>
  );
}
