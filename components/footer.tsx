import { Link } from "@heroui/link";

const footerLinks = [
  {
    href: "mailto:solven@d4vss.net",
    label: "Support",
  },
  {
    href: "/legal/privacy",
    label: "Privacy",
  },
  {
    href: "/legal/terms",
    label: "Terms",
  },
  {
    href: "/legal/report",
    label: "Report",
  },
];

export function Footer() {
  return (
    <footer className="flex-shrink-0 flex justify-between items-center place-content-center h-[72px] w-full px-10 max-md:flex-col max-md:gap-y-4 max-md:px-5 py-5">
      <div className="flex gap-x-4 max-md:gap-x-3">
        {footerLinks.map((link) => (
          <Link
            key={link.href}
            className="text-sm text-zinc-500"
            color="foreground"
            href={link.href}
            underline="hover"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div />
    </footer>
  );
}
