"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const RESTART_SECONDS = 5;

// Shown after a successful send; counts down and hands the kiosk to the next person
export function ThanksScreen({ onRestart }: { onRestart: () => void }) {
  const t = useTranslations("kiosk.thanks");
  const [seconds, setSeconds] = useState(RESTART_SECONDS);
  const restarted = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (seconds > 0 || restarted.current) return;
    restarted.current = true;
    onRestart();
  }, [onRestart, seconds]);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {/* Announced once; the countdown below is not read every second */}
      <h1 role="status" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {t("title")}
      </h1>
      <p className="text-lg text-muted-foreground">{t("restart", { seconds: Math.max(seconds, 1) })}</p>
    </div>
  );
}
