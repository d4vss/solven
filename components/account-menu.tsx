"use client";

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from "@heroui/dropdown";
import {
  LogInIcon,
  LogOutIcon,
  UserIcon,
  LayoutDashboardIcon,
  UserCheckIcon,
} from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  action?: (router: any) => void;
  className?: string;
  color?: string;
}

export default function AccountMenu({
  authenticated,
}: {
  authenticated: boolean;
}) {
  const router = useRouter();

  const menuItems: Record<string, MenuItem[]> = {
    authenticated: [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboardIcon className="w-5 h-5" strokeWidth={1.5} />,
        action: (router: any) => router.push("/dashboard"),
      },
      {
        key: "signout",
        label: "Sign out",
        icon: <LogOutIcon className="w-5 h-5" strokeWidth={1.5} />,
        action: () => signOut(),
        className: "text-red-500",
        color: "danger",
      },
    ],
    unauthenticated: [
      {
        key: "signin",
        label: "Sign in",
        icon: <LogInIcon className="w-5 h-5" />,
        action: () => signIn(),
      },
    ],
  };

  const items = authenticated
    ? menuItems.authenticated
    : menuItems.unauthenticated;

  return (
    <Dropdown className="!bg-background" placement="bottom-end">
      <DropdownTrigger variant="faded">
        <div className="p-2 cursor-pointer hover:bg-zinc-300 rounded-lg">
          {authenticated ? (
            <UserCheckIcon className="w-5 h-5" />
          ) : (
            <UserIcon className="w-5 h-5" />
          )}
        </div>
      </DropdownTrigger>
      <DropdownMenu aria-label="Account Actions" variant="faded">
        <DropdownSection>
          {items.map((item) => (
            <DropdownItem
              key={item.key}
              className={item.className}
              color={item.color as any}
              startContent={item.icon}
              onPress={() => item.action?.(router)}
            >
              <span className="text-md">{item.label}</span>
            </DropdownItem>
          ))}
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}
