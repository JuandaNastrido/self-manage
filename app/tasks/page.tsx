"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  Pause,
  Square,
  Clock,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { tasksApi } from "@/lib/api/client";
import { useTimer } from "@/hooks/useTimer";
import { useNow } from "@/hooks/useNow";
import { formatDuration } from "@/lib/utils/ui";
import { TaskPriority, TaskStatus } from "@prisma/client";
import type { Task, TaskCategory, TimeEntry } from "@prisma/client";

interface ExtendedTask extends Task {
  taskCategory: TaskCategory | null;
  timeEntries: TimeEntry[];
  totalTimeSpent?: number;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ExtendedTask | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Timer hook
  const { timer, elapsedSeconds, isRunning, start, pause, resume, stop } =
    useTimer();

  // Shared "current time" used to determine overdue tasks
  const now = useNow();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await tasksApi.list();
      setTasks(result);
    } catch  {
      setError("Gagal memuat tugas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, [fetchData]);

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus && task.status !== filterStatus) return false;
    if (filterPriority && task.priority !== filterPriority) return false;
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Sort by priority (higher first)
    const priorityOrder: Record<string, number> = {
      [TaskPriority.CRITICAL]: 0,
      [TaskPriority.HIGH]: 1,
      [TaskPriority.MEDIUM]: 2,
      [TaskPriority.LOW]: 3,
    };
    const pa = priorityOrder[a.priority] ?? 4;
    const pb = priorityOrder[b.priority] ?? 4;

    // Done tasks go to bottom
    if (a.status === TaskStatus.DONE && b.status !== TaskStatus.DONE) return 1;
    if (b.status === TaskStatus.DONE && a.status !== TaskStatus.DONE) return -1;

    if (pa !== pb) return pa - pb;

    // Then by due date
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  // Handle timer for a task
  const handleStartTimer = async (taskId: string) => {
    try {
      await start(taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memulai timer");
    }
  };

  const handleStopTimer = async () => {
    const elapsed = await stop();
    if (elapsed !== null) {
      // Refresh task data to update time spent
      fetchData();
    }
  };

  const handlePauseTimer = async () => {
    try {
      await pause();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal pause timer");
    }
  };

  const handleResumeTimer = async () => {
    try {
      await resume();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal resume timer");
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Hapus tugas ini? Semua entri waktu akan dihapus.")) return;
    try {
      await tasksApi.delete(taskId);
      setTasks((t) => t.filter((x) => x.id !== taskId));
    } catch  {
      setError("Gagal menghapus tugas");
    }
  };

  const updateTaskInState = (updated: ExtendedTask) => {
    setTasks((t) =>
      t.map((x) => (x.id === updated.id ? { ...updated, taskCategory: updated.taskCategory } : x))
    );
  };

  const resetFilters = () => {
    setFilterStatus("");
    setFilterPriority("");
    setSearchQuery("");
  };

  // Get priority label
  const priorityLabel = (p: string) => {
    switch (p) {
      case TaskPriority.CRITICAL:
        return "Kritis";
      case TaskPriority.HIGH:
        return "Tinggi";
      case TaskPriority.MEDIUM:
        return "Sedang";
      case TaskPriority.LOW:
        return "Rendah";
      default:
        return p;
    }
  };

  // Get status label
  const statusLabel = (s: string) => {
    switch (s) {
      case TaskStatus.TODO:
        return "Belum Mulai";
      case TaskStatus.IN_PROGRESS:
        return "Sedang Dikerjakan";
      case TaskStatus.DONE:
        return "Selesai";
      case TaskStatus.ARCHIVED:
        return "Diarsipkan";
      default:
        return s;
    }
  };

  const isTimerForTask = (taskId: string) => {
    return timer?.taskId === taskId;
  };

  return (
    <AppLayout title="Tugas">
      <div className="space-y-6">
        {/* Active timer display */}
        {timer && (
          <div className="fixed bottom-6 right-6 z-30">
            <div className="bg-gray-900 text-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 min-w-[240px]">
              <Clock className={`h-4 w-4 text-blue-400 ${timer.running ? "animate-pulse" : ""}`} />
              <div>
                <div className="text-xs opacity-70">
                  {timer.task?.title
                    ? `${timer.running ? "Sedang" : "Dijeda"}: ${timer.task.title}`
                    : timer.running
                    ? "Timer aktif"
                    : "Timer dijeda"}
                </div>
                <div className="font-mono font-bold text-lg">
                  {formatDuration(elapsedSeconds)}
                </div>
              </div>
              <div className="flex gap-1">
                {timer.running ? (
                  <button
                    onClick={handlePauseTimer}
                    className="p-1 hover:bg-gray-800 rounded"
                    title="Pause"
                  >
                    <Pause className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleResumeTimer}
                    className="p-1 hover:bg-gray-800 rounded text-green-400"
                    title="Lanjutkan"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={handleStopTimer}
                  className="p-1 hover:bg-gray-800 rounded text-red-400"
                  title="Stop"
                >
                  <Square className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters + New Task */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari tugas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua status</option>
              <option value={TaskStatus.TODO}>Belum Mulai</option>
              <option value={TaskStatus.IN_PROGRESS}>Sedang Dikerjakan</option>
              <option value={TaskStatus.DONE}>Selesai</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua prioritas</option>
              <option value={TaskPriority.LOW}>Rendah</option>
              <option value={TaskPriority.MEDIUM}>Sedang</option>
              <option value={TaskPriority.HIGH}>Tinggi</option>
              <option value={TaskPriority.CRITICAL}>Kritis</option>
            </select>

            {(filterStatus || filterPriority || searchQuery) && (
              <button
                onClick={resetFilters}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Reset
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setEditingTask(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tambah Tugas
          </button>
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"
              ></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-gray-500">{error}</div>
        ) : sortedTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Tidak ada tugas ditemukan.
            <button
              onClick={() => {
                setEditingTask(null);
                setShowForm(true);
              }}
              className="ml-2 text-blue-600 hover:underline"
            >
              Tambah tugas pertama
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                now={now}
                isTimerActiveForThis={isTimerForTask(task.id)}
                isTimerRunning={isRunning}
                timerRunning={timer?.running ?? false}
                timerElapsed={elapsedSeconds}
                onStartTimer={() => handleStartTimer(task.id)}
                onPauseTimer={handlePauseTimer}
                onResumeTimer={handleResumeTimer}
                onStopTimer={handleStopTimer}
                onEdit={() => {
                  setEditingTask(task);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(task.id)}
                priorityLabel={priorityLabel}
                statusLabel={statusLabel}
              />
            ))}
          </div>
        )}

        {/* Task Form Modal */}
        {showForm && (
          <TaskFormModal
            editingTask={editingTask}
            onClose={() => {
              setShowForm(false);
              setEditingTask(null);
            }}
            onSuccess={(task) => {
              if (editingTask) {
                updateTaskInState(task);
              } else {
                setTasks((t) => [task, ...t]);
              }
              setShowForm(false);
              setEditingTask(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}

function TaskCard({
  task,
  now,
  isTimerActiveForThis,
  isTimerRunning,
  timerRunning,
  timerElapsed,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopTimer,
  onEdit,
  onDelete,
  priorityLabel,
  statusLabel,
}: {
  task: ExtendedTask;
  now: number;
  isTimerActiveForThis: boolean;
  isTimerRunning: boolean;
  timerRunning: boolean;
  timerElapsed: number;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onStopTimer: () => void;
  onEdit: () => void;
  onDelete: () => void;
  priorityLabel: (p: string) => string;
  statusLabel: (s: string) => string;
}) {
  const priorityColors: Record<string, string> = {
    [TaskPriority.CRITICAL]: "bg-red-100 text-red-800",
    [TaskPriority.HIGH]: "bg-amber-100 text-amber-800",
    [TaskPriority.MEDIUM]: "bg-blue-100 text-blue-800",
    [TaskPriority.LOW]: "bg-gray-100 text-gray-600",
  };

  const statusColors: Record<string, string> = {
    [TaskStatus.TODO]: "bg-gray-100 text-gray-800",
    [TaskStatus.IN_PROGRESS]: "bg-blue-100 text-blue-800",
    [TaskStatus.DONE]: "bg-green-100 text-green-800",
    [TaskStatus.ARCHIVED]: "bg-gray-200 text-gray-600",
  };

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate).getTime() < now &&
    task.status !== TaskStatus.DONE &&
    task.status !== TaskStatus.ARCHIVED;

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        task.status === TaskStatus.DONE
          ? "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800"
          : isOverdue
          ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Timer column */}
        <div className="flex flex-col items-center gap-2 min-w-[100px]">
          {isTimerActiveForThis ? (
            <>
              <div className="text-center">
                <div className="font-mono font-bold text-lg text-gray-900 dark:text-gray-100">
                  {formatDuration(timerElapsed)}
                </div>
                <div className="text-xs text-gray-500">
                  {timerRunning ? "berjalan" : "dijeda"}
                </div>
              </div>
              <div className="flex gap-1">
                {timerRunning ? (
                  <button
                    onClick={onPauseTimer}
                    className="p-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                    title="Pause"
                  >
                    <Pause className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={onResumeTimer}
                    className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                    title="Lanjutkan"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={onStopTimer}
                  className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  title="Stop"
                >
                  <Square className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : isTimerRunning ? (
            <div className="text-center">
              <Clock className="h-5 w-5 text-gray-400 mx-auto" />
              <div className="text-xs text-gray-400 mt-1">
                Timer lain aktif
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={onStartTimer}
                className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                title="Mulai timer"
              >
                <Play className="h-4 w-4" />
              </button>
              <div className="text-xs text-gray-500">
                {task.plannedDurationMinutes
                  ? `${task.plannedDurationMinutes} menit direnc`
                  : formatDuration(task.totalTimeSpent ?? 0)}
              </div>
            </>
          )}
        </div>

        {/* Task content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3
              className={`font-medium text-gray-900 dark:text-gray-100 ${
                task.status === TaskStatus.DONE
                  ? "line-through opacity-70"
                  : ""
              }`}
            >
              {task.title}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}
            >
              {priorityLabel(task.priority)}
            </span>
            {isOverdue && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status]}`}
              >
                ⚠ Terlambat
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {task.description}
            </p>
          )}

          {task.taskCategory && (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {task.taskCategory.name}
            </span>
          )}

          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString("id-ID", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span
              className={`px-2 py-0.5 rounded-full ${statusColors[task.status]}`}
            >
              {statusLabel(task.status)}
            </span>
            {task.totalTimeSpent && task.totalTimeSpent > 0 && (
              <span>
                Total: {formatDuration(task.totalTimeSpent)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskFormModal({
  editingTask,
  onClose,
  onSuccess,
}: {
  editingTask: ExtendedTask | null;
  onClose: () => void;
  onSuccess: (task: ExtendedTask) => void;
}) {
  const [title, setTitle] = useState(editingTask?.title ?? "");
  const [description, setDescription] = useState(editingTask?.description ?? "");
  const [priority, setPriority] = useState(editingTask?.priority ?? TaskPriority.MEDIUM);
  const [status, setStatus] = useState(editingTask?.status ?? TaskStatus.TODO);
  const [dueDate, setDueDate] = useState(
    editingTask?.dueDate
      ? new Date(editingTask.dueDate).toISOString().split("T")[0]
      : ""
  );
  const [plannedDuration, setPlannedDuration] = useState(
    editingTask?.plannedDurationMinutes?.toString() ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch task categories for dropdown
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    editingTask?.taskCategoryId ?? ""
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/task-categories");
        const json = await res.json();
        if (json.success) {
          setTaskCategories(json.data);
        }
      } catch {
        // Silent fail — categories are optional
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!title.trim()) {
      setSubmitError("Judul tugas wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        title: title.trim(),
        description: description || undefined,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        plannedDurationMinutes: plannedDuration
          ? parseInt(plannedDuration, 10)
          : null,
        taskCategoryId: selectedCategory || null,
      };

      const result = editingTask
        ? await tasksApi.update(editingTask.id, data)
        : await tasksApi.create(data);

      onSuccess(result as unknown as ExtendedTask);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal menyimpan tugas"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {editingTask ? "Edit Tugas" : "Tambah Tugas Baru"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>

        {submitError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Judul
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masukkan judul tugas..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Priority selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prioritas
            </label>
            <div className="flex gap-3">
              {Object.values(TaskPriority).map((p) => {
                const labels = {
                  LOW: "Rendah",
                  MEDIUM: "Sedang",
                  HIGH: "Tinggi",
                  CRITICAL: "Kritis",
                };
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      priority === p
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {labels[p] || p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value={TaskStatus.TODO}>Belum Mulai</option>
              <option value={TaskStatus.IN_PROGRESS}>Sedang Dikerjakan</option>
              <option value={TaskStatus.DONE}>Selesai</option>
            </select>
          </div>

          {/* Task category selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kategori
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tanpa kategori</option>
              {taskCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deadline
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Planned duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Durasi Rencana (menit)
            </label>
            <input
              type="number"
              value={plannedDuration}
              onChange={(e) => setPlannedDuration(e.target.value)}
              placeholder="misal: 60"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deskripsi (opsional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi tugas..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting
                ? "Menyimpan..."
                : editingTask
                ? "Update"
                : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
