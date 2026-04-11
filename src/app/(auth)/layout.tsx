import { Trophy } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2.5 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Trophy aria-hidden="true" className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-base font-bold leading-none">Quiniela Promerica</p>
          <p className="text-xs text-muted-foreground">
            Liga Promerica de Costa Rica
          </p>
        </div>
      </Link>
      {children}
    </div>
  );
}
