import AppLayout from "@/components/AppLayout";
import { Brain, ShieldCheck } from "lucide-react";

export default function AiInsightsPage() {
  return (
    <AppLayout title="AI Insights">
      <div className="text-center py-16">
        <Brain className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          AI Assistant
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
          Fitur AI akan dikembangkan pada fase berikutnya (Phase 3). Fitur ini akan:
        </p>
        <ul className="mt-4 text-left max-w-md mx-auto space-y-2">
          <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Ringkasan bulanan dalam bahasa natural
          </li>
          <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Analisis pola pengeluaran
          </li>
          <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Rekomendasi budget yang diawasi oleh logika aplikasi
          </li>
          <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
            Selalu berjalan di komputer lokal — tidak ada data dikirim ke luar
          </li>
        </ul>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <span>Akses read-only — AI tidak dapat memodifikasi data Anda</span>
        </div>
      </div>
    </AppLayout>
  );
}
