"use client";

export default function Error() {
  return (
    <>
      <div className="h-[78vh] flex flex-col items-center justify-center px-2 text-center">
        <h2 className="uppercase text-3xl font-bold">Folder Not Found</h2>
        <p className="text-gray-600 max-w-sm">
          The requested folder could not be located. Please check the URL and
          try again.
        </p>
      </div>
    </>
  );
}
