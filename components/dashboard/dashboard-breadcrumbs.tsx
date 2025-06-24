"use client";

import { BreadcrumbItem, Breadcrumbs } from "@heroui/breadcrumbs";

export type BreadcrumbItemType = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

export default function FilesBreadcrumbs({
  items,
}: {
  items: BreadcrumbItemType[];
}) {
  return (
    <Breadcrumbs
      suppressHydrationWarning
      className="px-3 py-4 flex items-center gap-2 !space-y-0"
      color="foreground"
    >
      {items.map((item, index) => (
        <BreadcrumbItem
          key={index}
          className="!space-y-0"
          href={item.href}
          startContent={item.icon}
        >
          {item.name}
        </BreadcrumbItem>
      ))}
    </Breadcrumbs>
  );
}
