/**
 * Seeds a small demo dataset so the app is usable right after setup:
 * one task category, one task, two transactions, one budget and one savings goal.
 * Safe to re-run — it clears the demo rows first.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const inThisMonth = (day: number) =>
    new Date(Date.UTC(year, month, day, 9, 0, 0, 0));

  // Clear previous demo rows (keep categories and user preferences)
  await prisma.savingsAllocation.deleteMany();
  await prisma.savingsGoal.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskCategory.deleteMany();

  const incomeCat = await prisma.category.findFirst({
    where: { name: "Gaji" },
  });
  const foodCat = await prisma.category.findFirst({
    where: { name: "Makanan & Minuman" },
  });
  if (!incomeCat || !foodCat) {
    throw new Error("Kategori default belum ada — jalankan POST /api/seed terlebih dahulu.");
  }

  const work = await prisma.taskCategory.create({
    data: { name: "Kerja", color: "#2563EB" },
  });

  await prisma.task.create({
    data: {
      title: "Selesaikan laporan bulanan",
      description: "Rekap transaksi dan siapkan ringkasan",
      priority: "HIGH",
      status: "TODO",
      plannedDurationMinutes: 90,
      taskCategoryId: work.id,
      dueDate: new Date(Date.UTC(year, month, now.getDate() + 3, 9, 0, 0, 0)),
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        amount: 5_000_000,
        type: "INCOME",
        categoryId: incomeCat.id,
        date: inThisMonth(1),
        description: "Gaji bulan ini",
      },
      {
        amount: 150_000,
        type: "EXPENSE",
        categoryId: foodCat.id,
        date: inThisMonth(5),
        description: "Belanja bulanan",
      },
    ],
  });

  await prisma.budget.create({
    data: {
      categoryId: foodCat.id,
      year,
      month,
      amount: 1_000_000,
    },
  });

  await prisma.savingsGoal.create({
    data: {
      name: "Emergency Fund",
      description: "Dana darurat 3 bulan",
      targetAmount: 10_000_000,
    },
  });

  await prisma.userPreferences.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", currency: "IDR", timezone: "Asia/Jakarta" },
  });

  const counts = {
    categories: await prisma.category.count(),
    taskCategories: await prisma.taskCategory.count(),
    tasks: await prisma.task.count(),
    transactions: await prisma.transaction.count(),
    budgets: await prisma.budget.count(),
    savingsGoals: await prisma.savingsGoal.count(),
  };
  console.log("demo data seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
