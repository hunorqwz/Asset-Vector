"use client";

import { useState, useEffect } from "react";

export function LiveTime() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toISOString().split('T')[1].split('.')[0]);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span className="font-mono tracking-tight">{time || "--:--:--"}</span>;
}
