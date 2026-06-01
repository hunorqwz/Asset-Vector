"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { EducationDrawer } from "@/components/organisms/EducationDrawer";

export type EducationCategory = "QUANT" | "FUNDAMENTAL";

export interface EducationContextData {
  ticker?: string;
  currentPrice?: number;
  history?: number[]; // closing prices
  realizedVolatility?: number;
  beta?: number;
  dcfGrowth?: number;
  dcfDiscount?: number;
  dcfBaseCf?: number;
}

interface EducationContextType {
  isOpen: boolean;
  activeKey: string | null;
  activeCategory: EducationCategory;
  contextData: EducationContextData | null;
  openEducation: (key: string, category?: EducationCategory, context?: EducationContextData) => void;
  closeEducation: () => void;
}

const EducationContext = createContext<EducationContextType | undefined>(undefined);

export function EducationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<EducationCategory>("QUANT");
  const [contextData, setContextData] = useState<EducationContextData | null>(null);

  const openEducation = (
    key: string,
    category: EducationCategory = "QUANT",
    context?: EducationContextData
  ) => {
    setActiveKey(key);
    setActiveCategory(category);
    setContextData(context || null);
    setIsOpen(true);
  };

  const closeEducation = () => {
    setIsOpen(false);
    setContextData(null);
  };

  return (
    <EducationContext.Provider value={{ isOpen, activeKey, activeCategory, contextData, openEducation, closeEducation }}>
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
