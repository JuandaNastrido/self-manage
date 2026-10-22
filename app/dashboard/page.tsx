import { prisma } from "@/lib/prisma";
import { DashboardService } from "@/lib/services/dashboard";
import { formatCurrency } from "@/lib/utils/money";
import { TrendingUp, TrendingDown, ReceiptText, BarChart3 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import TaskTimerWidget from "@/components/TaskTimerWidget";
import { connection } from "next/server";
import Link from "next/link";

// Get active tasks for timer selection
async function getActiveTasks() {
  const tasks = await prisma.task.findMany({
    where: {
      status: { in: ["TODO", "IN_PROGRESS"] },
    },
    select: { id: true, title: true, priority: true },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
  return tasks;
}

export default async function DashboardPage() {
  // Read live data from the local database at request time.
  await connection();

  const summary = await DashboardService.getDashboardData();
  const activeTasks = await getActiveTasks();

  const balanceColor = summary.balance >= 0 ? "text-green-600" : "text-red-600";
  const flowColor =
    summary.monthly.netCashFlow >= 0 ? "text-green-600" : "text-red-600";

  return (
    <AppLayout title="Dashboard">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Balance Card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Saldo Tersedia
            </span>
          </div>
          <div className={`text-2xl font-bold ${balanceColor}`}>
            {formatCurrency(summary.balance, summary.currency)}
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Pemasukan Bulan Ini
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(summary.monthly.income, summary.currency)}
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Pengeluaran Bulan Ini
            </span>
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(summary.monthly.expenses, summary.currency)}
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <ReceiptText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Arus Kas Bersih
            </span>
          </div>
          <div className={`text-2xl font-bold ${flowColor}`}>
            {formatCurrency(summary.monthly.netCashFlow, summary.currency)}
          </div>
        </div>
      </div>

      {/* Timer + Task Summary */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Timer Widget */}
        <div className="lg:col-span-1">
          <TaskTimerWidget availableTasks={activeTasks} />
        </div>

        {/* Task Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Ringkasan Tugas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center mb-4">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {summary.taskSummary.total}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {summary.taskSummary.todo}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Todo
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {summary.taskSummary.inProgress}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Dikerjakan
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {summary.taskSummary.done}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Selesai
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {summary.taskSummary.overdue}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Terlambat
                </div>
              </div>
            </div>
            <Link
              href="/tasks"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Lihat semua tugas →
            </Link>
          </div>
        </div>
      </div>

      {/* Budget Utilization */}
      {summary.budgets.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Budget Bulan Ini
            </h3>
            <Link
              href="/budgets"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Kelola budget →
            </Link>
          </div>
          <div className="space-y-4">
            {summary.budgets
              .slice(0, 5)
              .map((budget) => (
                <div key={budget.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">
                      {budget.category.name}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {formatCurrency(budget.spent, summary.currency)} /{" "}
                      {formatCurrency(budget.amount, summary.currency)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        budget.isOverBudget
                          ? "bg-red-500"
                          : budget.utilizationPercent > 80
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                      style={{
                        width: `${Math.min(budget.utilizationPercent, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{budget.utilizationPercent}% terpakai</span>
                    {budget.isOverBudget && (
                      <span className="text-red-600">
                        Melebihi budget!
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {summary.recentTransactions.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Transaksi Terbaru
            </h3>
            <Link
              href="/transactions"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Lihat semua →
            </Link>
          </div>
          <div className="space-y-3">
            {summary.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: tx.categoryColor || "#6B7280",
                    }}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {tx.description || tx.categoryName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(tx.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                </div>
                <div
                  className={`font-medium ${
                    tx.type === "INCOME" || tx.type === "REFUND"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(tx.amount, summary.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Savings Goals */}
      {summary.savingsGoals.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Tujuan Tabungan
            </h3>
            <Link
              href="/savings"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Kelola →
            </Link>
          </div>
          <div className="space-y-4">
            {summary.savingsGoals.map((goal) => (
              <div key={goal.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">
                    {goal.name}
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {formatCurrency(goal.currentAmount, summary.currency)} /{" "}
                    {formatCurrency(goal.targetAmount, summary.currency)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{
                      width: `${Math.min(goal.progressPercent, 100)}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {goal.progressPercent}% tercapai
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
