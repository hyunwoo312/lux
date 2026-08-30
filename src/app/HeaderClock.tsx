import { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { clockFormatter, formatClockDate } from "@/lib/clock";
import { SPRING_REEL } from "@/lib/motion";
import { useNow } from "@/hooks/useNow";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";

const REEL_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function digitsOf(text: string): number[] | null {
  const digits: number[] = [];
  for (const character of text) {
    const digit = "0123456789".indexOf(character);
    if (digit === -1) return null;
    digits.push(digit);
  }
  return digits;
}

export function HeaderClock({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const clock24h = useAppSettingsStore((s) => s.clock24h);
  const clockDate = useAppSettingsStore((s) => s.clockDate);
  const formatter = clockFormatter(!clock24h);
  const now = useNow();

  const parts = formatter.formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "";
  const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value;
  const date = formatClockDate(now, clockDate);

  return (
    <span className={className}>
      <span className="text-ink text-heading font-semibold tracking-tight tabular-nums">
        <span className="sr-only">{formatter.format(now)}</span>
        <span aria-hidden className="flex items-center">
          <SlidingDigits value={hour} reduced={reduced} />
          <span className="mx-0.5">:</span>
          <SlidingDigits value={minute} reduced={reduced} />
          {dayPeriod ? <span className="text-ink-3 ml-1">{dayPeriod}</span> : null}
        </span>
      </span>
      {date ? <span className="text-ink-3 text-caption leading-tight">{date}</span> : null}
    </span>
  );
}

function SlidingDigits({ value, reduced }: { value: string; reduced: boolean | null }) {
  const digits = reduced ? null : digitsOf(value);
  if (digits === null) return <>{value}</>;

  return (
    <>
      {digits.map((digit, index) => (
        <Reel key={digits.length - index} digit={digit} />
      ))}
    </>
  );
}

function Reel({ digit }: { digit: number }) {
  const position = useSpring(digit, SPRING_REEL);

  useEffect(() => {
    position.set(digit);
  }, [position, digit]);

  return (
    <span className="relative inline-block overflow-y-clip">
      <span className="invisible">0</span>
      {REEL_DIGITS.map((face) => (
        <ReelFace key={face} position={position} face={face} />
      ))}
    </span>
  );
}

function ReelFace({ position, face }: { position: MotionValue<number>; face: number }) {
  const y = useTransform(position, (latest) => {
    const offset = (10 + face - (latest % 10)) % 10;
    return `${(offset > 5 ? offset - 10 : offset) * 100}%`;
  });

  return (
    <motion.span style={{ y }} className="absolute inset-0 grid place-items-center">
      {face}
    </motion.span>
  );
}
