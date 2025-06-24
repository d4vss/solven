import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  searchParams: Record<string, string>;
}

export default function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  searchParams,
}: PaginationProps) {
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams);

    params.set("page", page.toString());

    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Link
        aria-disabled={currentPage === 1}
        className={`flex items-center justify-center w-9 h-9 rounded-lg ${
          currentPage === 1
            ? "text-gray-400 cursor-not-allowed"
            : "text-default-600 hover:bg-default-50"
        }`}
        href={createPageUrl(currentPage - 1)}
      >
        <ChevronLeft className="w-4 h-4" />
      </Link>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <Link
            key={page}
            className={`flex items-center justify-center w-9 h-9 rounded-lg ${
              currentPage === page
                ? "bg-default-100 text-default-700"
                : "text-default-600 hover:bg-default-50"
            }`}
            href={createPageUrl(page)}
          >
            {page}
          </Link>
        ))}
      </div>

      <Link
        aria-disabled={currentPage === totalPages}
        className={`flex items-center justify-center w-9 h-9 rounded-lg ${
          currentPage === totalPages
            ? "text-gray-400 cursor-not-allowed"
            : "text-default-600 hover:bg-default-50"
        }`}
        href={createPageUrl(currentPage + 1)}
      >
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
