"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { EducationDrawer } from "@/components/organisms/EducationDrawer";

export type EducationCategory = "QUANT" | "FUNDAMENTAL";

interface EducationContextType {
  isOpen: boolean;
  activeKey: string | null;
  activeCategory: EducationCategory;
  openEducation: (key: string, category?: EducationCategory) => void;
  closeEducation: () => void;
}

const EducationContext = createContext<EducationContextType | undefined>(undefined);

export function EducationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<EducationCategory>("QUANT");

  const openEducation = (key: string, category: EducationCategory = "QUANT") => {
    setActiveKey(key);
    setActiveCategory(category);
    setIsOpen(true);
  };

  const closeEducation = () => {
    setIsOpen(false);
  };

  return (
    <EducationContext.Provider value={{ isOpen, activeKey, activeCategory, openEducation, closeEducation }}>
      {children}
      <EducationDrawer />
    </EducationContext.Provider>
  );
}

export function useEducation() {
  const context = useContext(EducationContext);
  if (!context) {
    throw new Error("useEducation must be used within an EducationProvider");
  }
  return context;
}
