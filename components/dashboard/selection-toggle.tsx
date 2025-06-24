"use client";

import { useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";

import { useSelection } from "./selection-context";

export function SelectionToggle() {
  const { selectedItems, clearSelection } = useSelection();
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const handleToggle = () => {
    if (isSelectionMode) {
      clearSelection();
    }
    setIsSelectionMode(!isSelectionMode);
  };

  if (!isSelectionMode && selectedItems.size === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isSelectionMode
            ? "bg-default-100 text-default-700 hover:bg-default-200"
            : "bg-default-50 text-default-600 hover:bg-default-100"
        }`}
        onClick={handleToggle}
      >
        {isSelectionMode ? (
          <>
            <FaTimes className="w-4 h-4" />
            Cancel Selection
          </>
        ) : (
          <>
            <FaCheck className="w-4 h-4" />
            {selectedItems.size} Selected
          </>
        )}
      </button>
    </div>
  );
}
