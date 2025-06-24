"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SelectionContextType {
  selectedItems: Set<string>;
  toggleItem: (id: string) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectionEnabled: boolean;
  toggleSelection: () => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(
  undefined,
);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionEnabled, setSelectionEnabled] = useState(false);

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }

      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const isSelected = (id: string) => selectedItems.has(id);

  const toggleSelection = () => {
    setSelectionEnabled((prev) => !prev);
    clearSelection();
  };

  return (
    <SelectionContext.Provider
      value={{
        selectedItems,
        toggleItem,
        clearSelection,
        isSelected,
        selectionEnabled,
        toggleSelection,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);

  if (context === undefined) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }

  return context;
}
