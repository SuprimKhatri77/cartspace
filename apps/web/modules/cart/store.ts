"use client";

import { create } from "zustand";

// Whether the bag drawer is open. UI state only, shared by the header
// button, add-to-bag and the drawer.
export const useBagDrawer = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
