"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, BarChart3, DollarSign } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { budgetsApi, categoriesApi } from "@/lib/api/client";
import { formatCurrency } from "@/lib/utils/money";
import type { Budget, Category } from "@prisma/client";

interface ExtendedBudget extends Budget {
  category: Category;
  spent: number;
  remaining: number;
  utilizationPercent: number;
  isOverBudget: boolean;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<ExtendedBudget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<ExtendedBudget | null>(null);

  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [budgetRes, catRes] = await Promise.all([
        budgetsApi.list(selectedYear, selectedMonth),
        categoriesApi.list("EXPENSE"),
      ]);
      setBudgets(budgetRes);
      setCategories(catRes);
    } catch  {
      setError("Gagal memuat budget");
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus budget ini?")) return;
    try {
      await budgetsApi.delete(id);
      setBudgets((b) => b.filter((x) => x.id !== id));
    } catch  {
      setError("Gagal menghapus budget");
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value));
  };

  const allExpenseCategories = categories.filter((c) => c.type === "EXPENSE");

  const budgetCategoriesWithoutBudget = allExpenseCategories.filter(
    (c) => !budgets.find((b) => b.categoryId === c.id)
  );

  return (
    <AppLayout title="Budget">
      <div className="space-y-6">
        {/* Month/Year selector */}
        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={handleYearChange}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const y = new Date().getFullYear() - 2 + i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>

          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
          >
            {monthNames.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Budget list */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl"
                ></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-gray-500">{error}</div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                Belum ada budget untuk {monthNames[selectedMonth]} {selectedYear}
              </p>
              <button
                onClick={() => {
                  setEditingBudget(null);
                  setShowForm(true);
                }}
                className="text-blue-600 hover:underline"
              >
                Buat budget pertama
              </button>
            </div>
          ) : (
            budgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={() => {
                  setEditingBudget(budget);
                  setShowForm(true);
                }}
                onDelete={() => handleDelete(budget.id)}
              />
            ))
          )}
        </div>

        {/* Create budget for categories without budget */}
        {budgets.length > 0 && budgetCategoriesWithoutBudget.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => {
                setEditingBudget(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Tambah budget kategori lain
            </button>
          </div>
        )}

        {/* Create/Edit Form Modal */}
        {showForm && (
          <BudgetFormModal
            editingBudget={editingBudget}
            categories={allExpenseCategories.filter(
              (c) =>
                !editingBudget || editingBudget.categoryId === c.id || true
            )}
            existingBudgets={budgets}
            onClose={() => {
              setShowForm(false);
              setEditingBudget(null);
            }}
            onSuccess={(budget) => {
              if (editingBudget) {
                setBudgets((b) =>
                  b.map((x) => (x.id === budget.id ? { ...budget, spent: 0, remaining: budget.amount, utilizationPercent: 0, isOverBudget: false } : x))
                );
              } else {
                setBudgets((b) => [...b, { ...budget, spent: 0, remaining: budget.amount, utilizationPercent: 0, isOverBudget: false }]);
              }
              setShowForm(false);
              setEditingBudget(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}

function BudgetCard({
  budget,
  onEdit,
  onDelete,
}: {
  budget: ExtendedBudget;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const utilColor = budget.isOverBudget
    ? "bg-red-500"
    : budget.utilizationPercent > 80
    ? "bg-amber-500"
    : "bg-blue-500";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: budget.category.color || "#6B7280" }}
          />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {budget.category.name}
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

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-300">
            {formatCurrency(budget.spent, "IDR")} / {formatCurrency(budget.amount, "IDR")}
          </span>
          <span
            className={`font-medium ${
              budget.isOverBudget
                ? "text-red-600"
                : budget.utilizationPercent > 80
                ? "text-amber-600"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {budget.utilizationPercent}%
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${utilColor}`}
            style={{
              width: `${Math.min(budget.utilizationPercent, 100)}%`,
            }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Sisa: {formatCurrency(budget.remaining, "IDR")}</span>
          {budget.isOverBudget && (
            <span className="text-red-600">
              Melebihi budget {formatCurrency(Math.abs(budget.remaining), "IDR")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function BudgetFormModal({
  editingBudget,
  categories,
  existingBudgets,
  onClose,
  onSuccess,
}: {
  editingBudget: ExtendedBudget | null;
  categories: Category[];
  existingBudgets: ExtendedBudget[];
  onClose: () => void;
  onSuccess: (budget: ExtendedBudget) => void;
}) {
  const now = new Date();
  const [categoryId, setCategoryId] = useState(
    editingBudget?.categoryId ?? categories[0]?.id ?? ""
  );
  const [year, setYear] = useState(
    editingBudget?.year ?? now.getFullYear()
  );
  const [month, setMonth] = useState(
    editingBudget?.month ?? now.getMonth()
  );
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  // Filter out already-budgeted categories for this month/year (unless editing)
  const editingBudgetId = editingBudget?.id;
  const availableCategories = editingBudget
    ? categories
    : categories.filter(
        (c) =>
          !existingBudgets.find(
            (b) =>
              b.categoryId === c.id &&
              b.year === year &&
              b.month === month &&
              b.id !== editingBudgetId
          )
      );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!categoryId) {
      setFormError("Pilih kategori");
      return;
    }

    const parsedAmount = parseInt(amount.replace(/\D/g, ""), 10) || 0;
    if (parsedAmount <= 0) {
      setFormError("Jumlah budget harus lebih besar dari 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        categoryId,
        year: parseInt(year.toString()),
        month: parseInt(month.toString()),
        amount: parsedAmount,
      };

      const result = editingBudget
        ? await budgetsApi.update(editingBudget.id, data)
        : await budgetsApi.create(data);

      onSuccess({
        ...result,
        spent: 0,
        remaining: result.amount,
        utilizationPercent: 0,
        isOverBudget: false,
      } as unknown as ExtendedBudget);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal menyimpan budget"
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
            {editingBudget ? "Edit Budget" : "Buat Budget Baru"}
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
              Kategori
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Pilih kategori</option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tahun
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const y = now.getFullYear() - 2 + i;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bulan
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {monthNames.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Jumlah Budget
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Rp 1.000.000"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Menyimpan..." : editingBudget ? "Update" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
