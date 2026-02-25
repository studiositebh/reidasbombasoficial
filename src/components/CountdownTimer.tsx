import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetDate?: Date;
  onExpire?: () => void;
  variant?: "light" | "dark";
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeftUntilMidnight(): TimeLeft {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  
  const diff = midnight.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
}

function getTimeLeftUntilDate(target: Date): TimeLeft {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours: totalHours, minutes, seconds };
}

export function CountdownTimer({ targetDate, onExpire, variant = "light" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => 
    targetDate ? getTimeLeftUntilDate(targetDate) : getTimeLeftUntilMidnight()
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = targetDate 
        ? getTimeLeftUntilDate(targetDate) 
        : getTimeLeftUntilMidnight();
      
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.hours === 0 && newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

  const padNumber = (num: number) => num.toString().padStart(2, "0");

  const isLight = variant === "light";

  return (
    <div className={`flex items-center gap-3 ${isLight ? "text-white" : "text-foreground"}`}>
      <Clock className={`h-5 w-5 ${isLight ? "text-yellow-300" : "text-sale"} animate-pulse`} />
      <span className={`text-sm font-medium ${isLight ? "text-white/80" : "text-muted-foreground"}`}>
        Termina em:
      </span>
      <div className="flex items-center gap-1">
        {/* Hours */}
        <div className={`flex flex-col items-center px-2 py-1 rounded ${isLight ? "bg-white/20" : "bg-sale/10"}`}>
          <span className={`text-lg md:text-xl font-black tabular-nums ${isLight ? "text-white" : "text-sale"}`}>
            {padNumber(timeLeft.hours)}
          </span>
          <span className={`text-[10px] uppercase ${isLight ? "text-white/60" : "text-muted-foreground"}`}>
            hrs
          </span>
        </div>
        <span className={`text-xl font-bold ${isLight ? "text-yellow-300" : "text-sale"}`}>:</span>
        {/* Minutes */}
        <div className={`flex flex-col items-center px-2 py-1 rounded ${isLight ? "bg-white/20" : "bg-sale/10"}`}>
          <span className={`text-lg md:text-xl font-black tabular-nums ${isLight ? "text-white" : "text-sale"}`}>
            {padNumber(timeLeft.minutes)}
          </span>
          <span className={`text-[10px] uppercase ${isLight ? "text-white/60" : "text-muted-foreground"}`}>
            min
          </span>
        </div>
        <span className={`text-xl font-bold ${isLight ? "text-yellow-300" : "text-sale"}`}>:</span>
        {/* Seconds */}
        <div className={`flex flex-col items-center px-2 py-1 rounded ${isLight ? "bg-white/20" : "bg-sale/10"}`}>
          <span className={`text-lg md:text-xl font-black tabular-nums ${isLight ? "text-white" : "text-sale"}`}>
            {padNumber(timeLeft.seconds)}
          </span>
          <span className={`text-[10px] uppercase ${isLight ? "text-white/60" : "text-muted-foreground"}`}>
            seg
          </span>
        </div>
      </div>
    </div>
  );
}
