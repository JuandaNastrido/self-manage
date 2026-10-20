import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Mengarahkan ke dashboard...
        </p>
      </div>
    </div>
  );
}
