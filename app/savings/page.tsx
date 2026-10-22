"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, PiggyBank } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { savingsGoalsApi, transactionsApi } from "@/lib/api/client";
import { formatCurrency, parseAmount } from "@/lib/utils/money";
import { formatDate } from "@/lib/utils/ui";
import type { SavingsGoal, Transaction } from "@prisma/client";

interface ExtendedSavingsGoal extends SavingsGoal {
  allocations: Allocation[];
  currentAmount: number;
  progressPercent: number;
  isComplete: boolean;
}

interface Allocation {
  id: string;
  savingsGoalId: string;
  transactionId: string | null;
  amount: number;
  date: string;
  createdAt: string;
}

export default function SavingsPage() {
  const [goals, setGoals] = useState<ExtendedSavingsGoal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ExtendedSavingsGoal | null>(null);
  const [showAllocationForm, setShowAllocationForm] = useState<ExtendedSavingsGoal | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const goalsRes = await savingsGoalsApi.list();
      const txnsRes = await transactionsApi.list();
      setGoals(goalsRes);
      setTransactions(txnsRes.transactions);
    } catch  {
      setError("Gagal memuat data tabungan");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, [fetchData]);

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Hapus tujuan tabungan ini? Semua alokasi akan dihapus.")) return;
    try {
      await savingsGoalsApi.delete(id);
      setGoals((g) => g.filter((x) => x.id !== id));
    } catch  {
      setError("Gagal menghapus tujuan");
    }
  };

  const handleAddAllocation = async (goalId: string, amount: number, txnId?: string, date?: string) => {
    try {
      await savingsGoalsApi.allocation.create({
        savingsGoalId: goalId,
        amount,
        transactionId: txnId ?? null,
        date: date ?? new Date().toISOString(),
      });
      await fetchData();
      setShowAllocationForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah alokasi");
    }
  };

  return (
    <AppLayout title="Tujuan Tabungan">
      <div className="space-y-6">
        {/* Add goal button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setEditingGoal(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tambah Tujuan
          </button>
        </div>

        {/* Goals grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl"
              ></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-gray-500">{error}</div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16">
            <PiggyBank className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              Belum ada tujuan tabungan
            </p>
            <button
              onClick={() => {
                setEditingGoal(null);
                setShowForm(true);
              }}
              className="text-blue-600 hover:underline"
            >
              Buat tujuan pertama
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => (
              <SavingsGoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => {
                  setEditingGoal(goal);
                  setShowForm(true);
                }}
                onDelete={() => handleDeleteGoal(goal.id)}
                onAddAllocation={() => setShowAllocationForm(goal)}
              />
            ))}
          </div>
        )}

        {/* Goal Form Modal */}
        {showForm && (
          <SavingsGoalFormModal
            editingGoal={editingGoal}
            onClose={() => {
              setShowForm(false);
              setEditingGoal(null);
            }}
            onSuccess={(goal) => {
              if (editingGoal) {
                setGoals((g) =>
                  g.map((x) => (x.id === goal.id ? goal : x))
                );
              } else {
                setGoals((g) => [goal, ...g]);
              }
              setShowForm(false);
              setEditingGoal(null);
            }}
          />
        )}

        {/* Allocation Form Modal */}
        {showAllocationForm && (
          <AllocationFormModal
            goal={showAllocationForm}
            transactions={transactions.filter((t) => t.type === "INCOME" || t.type === "REFUND")}
            onClose={() => setShowAllocationForm(null)}
            onSuccess={(amount, txnId, date) =>
              handleAddAllocation(showAllocationForm.id, amount, txnId, date)
            }
          />
        )}
      </div>
    </AppLayout>
  );
}

function SavingsGoalCard({
  goal,
  onEdit,
  onDelete,
  onAddAllocation,
}: {
  goal: ExtendedSavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
  onAddAllocation: () => void;
}) {
  const progressColor = goal.isComplete
    ? "bg-green-500"
    : goal.progressPercent > 70
    ? "bg-blue-500"
    : "bg-amber-500";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <PiggyBank className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {goal.name}
          </h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600"
            title="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {formatCurrency(goal.currentAmount, "IDR")} /{" "}
            {formatCurrency(goal.targetAmount, "IDR")}
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {goal.progressPercent}%
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${progressColor}`}
            style={{
              width: `${Math.min(goal.progressPercent, 100)}%`,
            }}
          />
        </div>

        {goal.targetDate && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Target: {formatDate(goal.targetDate)}
          </div>
        )}

        <button
          onClick={onAddAllocation}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          Tambah Alokasi
        </button>
      </div>
    </div>
  );
}

function SavingsGoalFormModal({
  editingGoal,
  onClose,
  onSuccess,
}: {
  editingGoal: ExtendedSavingsGoal | null;
  onClose: () => void;
  onSuccess: (goal: ExtendedSavingsGoal) => void;
}) {
  const [name, setName] = useState(editingGoal?.name ?? "");
  const [description, setDescription] = useState(editingGoal?.description ?? "");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState(
    editingGoal?.targetDate
      ? new Date(editingGoal.targetDate).toISOString().split("T")[0]
      : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Nama tujuan tabungan wajib diisi");
      return;
    }

    const parsedAmount = parseAmount(targetAmount, "IDR");
    if (parsedAmount <= 0) {
      setFormError("Target angka harus lebih besar dari 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        name: name.trim(),
        description: description || undefined,
        targetAmount: parsedAmount,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      };

      const result = editingGoal
        ? await savingsGoalsApi.update(editingGoal.id, data)
        : await savingsGoalsApi.create(data);

      onSuccess({
        ...result,
        allocations: [],
        currentAmount: 0,
        progressPercent: 0,
        isComplete: false,
      } as unknown as ExtendedSavingsGoal);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal menyimpan tujuan"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {editingGoal ? "Edit Tujuan Tabungan" : "Tambah Tujuan Tabungan"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="misal: Liburan akhir tahun"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Tabungan
            </label>
            <input
              type="text"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="Rp 10.000.000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tanggal Target (opsional)
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deskripsi (opsional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi tujuan..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

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
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : editingGoal ? "Update" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AllocationFormModal({
  goal,
  transactions,
  onClose,
  onSuccess,
}: {
  goal: ExtendedSavingsGoal;
  transactions: Transaction[];
  onClose: () => void;
  onSuccess: (amount: number, txnId?: string, date?: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Get allocations from goal
  const allocations = goal.allocations || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseAmount(amount, "IDR");
    if (parsedAmount <= 0) {
      setFormError("Jumlah harus lebih besar dari 0");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSuccess(parsedAmount, transactionId || undefined, new Date(date).toISOString());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menambah alokasi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-md mx-4 p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Tambah Alokasi — {goal.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Jumlah
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Rp 500.000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transaksi (opsional)
            </label>
            <select
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tanpa tautan transaksi</option>
              {transactions.map((t) => (
                <option key={t.id} value={t.id}>
                  {new Date(t.date).toLocaleDateString("id-ID")} —{" "}
                  {t.description || "Tanpa deskripsi"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tanggal
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {allocations.length > 0 && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alokasi Sejahar Ini
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {allocations.map((a) => (
                  <div
                    key={a.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatDate(a.date)}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {formatCurrency(a.amount, "IDR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : "Tambah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
