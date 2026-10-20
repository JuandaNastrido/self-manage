import Navigation from "@/components/Navigation";

export default function AppLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Navigation />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}
