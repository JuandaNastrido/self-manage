import AppLayout from "@/components/AppLayout";
import { CalendarCheck } from "lucide-react";

export default function HabitsPage() {
  return (
    <AppLayout title="Kebiasaan">
      <div className="text-center py-16">
        <CalendarCheck className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Manajemen Kebiasaan
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Fitur pelacakan kebiasuan akan dikembangkan pada fase berikutnya
          (Phase 2). Fitur ini akan mendukung:
        </p>
        <ul className="mt-4 text-left max-w-md mx-auto space-y-2">
          <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Definisi kebiasaan pribadi
          </li>
          <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Pencatatan keberhasilan kebiasaan (daily)
          </li>
          <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Review konsistensi dan progres historis
          </li>
          <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Perbandingan rutinitas yang direncanakan vs. aktual
          </li>
        </ul>
      </div>
    </AppLayout>
  );
}
