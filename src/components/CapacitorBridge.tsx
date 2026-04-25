"use client";

import { useEffect } from "react";
import { initCapacitor } from "@/lib/capacitorInit";

export default function CapacitorBridge() {
  useEffect(() => {
    initCapacitor().catch(() => {});
  }, []);
  return null;
}
