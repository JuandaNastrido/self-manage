"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Filter, Edit, Trash2, Calendar, Tag } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { transactionsApi, categoriesApi } from "@/lib/api/client";
import { formatCurrency, parseAmount } from "@/lib/utils/money";
import { formatDuration } from "@/lib/utils/ui";
import { TransactionType } from "@prisma/client";
import type { Transaction, Category } from "@prisma/client";

interface ExtendedTransaction extends Transaction {
  category: Category;
}

interface ExtendedCategory extends Category {
  _count?: { transactions: number; budgets: number };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<ExtendedTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTxn, setEditingTxn] = useState<ExtendedTransaction | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [txns, cats] = await Promise.all([
        transactionsApi.list(),
        categoriesApi.list(),
      ]);
      setTransactions(txns);
      setCategories(cats);
    } catch (err) {
      setError("Gagal memuat data transaksi");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTxns = transactions.filter((txn) => {
    if (filterType && txn.type !== filterType) return false;
    if (filterCategory && txn.categoryId !== filterCategory) return false;
    if (searchQuery && !(txn.description?.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    return true;
  });

  const totalIncome = filteredTxns
    .filter((t) => t.type === "INCOME" || t.type === "REFUND")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTxns
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      await transactionsApi.delete(id);
      setTransactions((t) => t.filter((x) => x.id !== id));
    } catch (err) {
      setError("Gagal menghapus transaksi");
    }
  };

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  const resetFilters = () => {
    setFilterType("");
    setFilterCategory("");
    setSearchQuery("");
  };

  return (
    <AppLayout title="Transaksi Keuangan">
      <div className="space-y-6">
        {/* Filters + Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua tipe</option>
              <option value="INCOME">Pemasukan</option>
              <option value="EXPENSE">Pengeluaran</option>
              <option value="REFUND">Refund</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            {(filterType || filterCategory || searchQuery) && (
              <button
                onClick={resetFilters}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Pemasukan</div>
              <div className="font-bold text-green-600">
                {formatCurrency(totalIncome, "IDR")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Pengeluaran</div>
              <div className="font-bold text-red-600">
                {formatCurrency(totalExpense, "IDR")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Seleksi</div>
              <div
                className={`font-bold ${totalIncome - totalExpense >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(totalIncome - totalExpense, "IDR")}
              </div>
            </div>
            <button
              onClick={() => {
                setEditingTxn(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Tambah
            </button>
          </div>
        </div>

        {/* Transaction List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-gray-500">{error}</div>
        ) : filteredTxns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Tidak ada transaksi ditemukan.
            <button
              onClick={() => {
                setEditingTxn(null);
                setShowForm(true);
              }}
              className="ml-2 text-blue-600 hover:underline"
            >
              Tambah transaksi pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Tanggal</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Deskripsi</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Kategori</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Jumlah</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.map((txn) => (
                  <tr
                    key={txn.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                      {new Date(txn.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                      {txn.description || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${txn.category.color || "#6B7280"}20`,
                          color: txn.category.color || "#6B7280",
                        }}
                      >
                        <Tag className="h-3 w-3" />
                        {txn.category.name}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-medium ${
                        txn.type === "INCOME" || txn.type === "REFUND"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(txn.amount, "IDR")}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => {
                          setEditingTxn(txn);
                          setShowForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(txn.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Form Modal */}
      {showForm && (
        <TransactionFormModal
          editingTxn={editingTxn}
          categories={categories}
          onClose={() => {
            setShowForm(false);
            setEditingTxn(null);
          }}
          onSuccess={(txn) => {
            if (editingTxn) {
              setTransactions((t) =>
                t.map((x) => (x.id === txn.id ? { ...txn, category: txn.category } : x))
              );
            } else {
              setTransactions((t) => [txn, ...t]);
            }
            setShowForm(false);
            setEditingTxn(null);
          }}
        />
      )}
    </AppLayout>
  );
}

function TransactionFormModal({
  editingTxn,
  categories,
  onClose,
  onSuccess,
}: {
  editingTxn: (ExtendedTransaction & { category: Category }) | null;
  categories: Category[];
  onClose: () => void;
  onSuccess: (txn: ExtendedTransaction) => void;
}) {
  const [amount, setAmount] = useState(editingTxn?.amount ? formatCurrency(editingTxn.amount, "IDR") : "");
  const [type, setType] = useState<TransactionType>(
    editingTxn?.type ?? TransactionType.EXPENSE
  );
  const [categoryId, setCategoryId] = useState(editingTxn?.categoryId ?? "");
  const [date, setDate] = useState(
    editingTxn ? new Date(editingTxn.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState(editingTxn?.description ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Filter categories by selected type
  const availableCategories =
    type === TransactionType.INCOME
      ? categories.filter((c) => c.type === "INCOME")
      : type === TransactionType.EXPENSE
      ? categories.filter((c) => c.type === "EXPENSE")
      : categories

  // Auto-select first category if none selected when type changes
  useEffect(() => {
    if (!editingTxn && (!categoryId || !availableCategories.find((c) => c.id === categoryId))) {
      if (availableCategories.length > 0) {
        setCategoryId(availableCategories[0].id);
      }
    }
  }, [type, categoryId, editingTxn, availableCategories]);

  // Need useEffect import for this
  // Actually, I can't use useEffect inside a child component without importing it
  // Let me restructure...

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const parsedAmount = parseAmount(amount, "IDR");
    if (parsedAmount <= 0) {
      setSubmitError("Jumlah harus lebih besar dari 0");
      return;
    }

    if (!categoryId) {
      setSubmitError("Pilih kategori");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        amount: parsedAmount,
        type,
        categoryId,
        date: new Date(date).toISOString(),
        description: description || undefined,
      };

      let result: ExtendedTransaction;
      if (editingTxn) {
        result = await transactionsApi.update(editingTxn.id, data) as unknown as ExtendedTransaction;
      } else {
        result = await transactionsApi.create(data) as unknown as ExtendedTransaction;
        if (result) {
          result = { ...result, category: result.category as Category };
        }
      }

      onSuccess(result);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Gagal menyimpan transaksi"
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
            {editingTxn ? "Edit Transaksi" : "Tambah Transaksi Baru"}
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
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipe
            </label>
            <div className="flex gap-3">
              {Object.values(TransactionType).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    type === t
                      ? t === "INCOME"
                        ? "bg-green-100 text-green-800 border-2 border-green-500"
                        : t === "EXPENSE"
                        ? "bg-red-100 text-red-800 border-2 border-red-500"
                        : "bg-blue-100 text-blue-800 border-2 border-blue-500"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {t === "INCOME" ? "Pemasukan" : t === "EXPENSE" ? "Pengeluaran" : "Refund"}
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Jumlah
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Rp 0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Category select */}
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

          {/* Date */}
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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Deskripsi (opsional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan tambahan..."
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
              {isSubmitting ? "Menyimpan..." : editingTxn ? "Update" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
