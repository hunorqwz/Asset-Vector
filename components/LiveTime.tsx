"use client";

import { useState, useEffect } from "react";

export function LiveTime() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    setTime(new Date().toISOString().split('T')[1].split('.')[0]);
  }, []);

  return <span>{time || "--:--:--"}</span>;
}
