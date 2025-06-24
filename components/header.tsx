import { Link } from "@heroui/link";
import { ZapIcon } from "lucide-react";
import { Session } from "next-auth";

import AccountMenu from "@/components/account-menu";

interface HeaderProps {
  session: Session | null;
}

export function Header({ session }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-sm bg-background/80 border-b border-default-200/50">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-2" color="foreground" href="/">
          <ZapIcon className="w-5 h-5" />
          <span className="text-xl font-semibold tracking-tight">Solven</span>
        </Link>
        <div className="flex items-center gap-4">
          <AccountMenu authenticated={session != null} />
        </div>
      </div>
    </header>
  );
}
