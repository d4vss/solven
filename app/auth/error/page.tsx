"use client";

import { useSearchParams } from "next/navigation";

export default function Error() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") as string;

  const errorList: Record<string, { title: string; description: string }> = {
    AccessDenied: {
      title: "Access denied",
      description: "You do not have permission to sign in.",
    },
    DefaultError: {
      title: "Something went wrong",
      description: "An unexpected error occurred. Please try again.",
    },
  };

  const shownError =
    error && errorList[error] ? errorList[error] : errorList["DefaultError"];

  return (
    <div className="h-[78vh] flex flex-col items-center justify-center px-2 text-center">
      <h2 className="uppercase text-3xl font-bold">{shownError.title}</h2>
      <p className="text-gray-600 max-w-sm">{shownError.description}</p>
    </div>
  );
}
