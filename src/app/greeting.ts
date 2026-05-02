export type GreetingPeriod = "morning" | "afternoon" | "evening" | "lateNight";

export type GreetingCopy = {
  title: string;
  subtitle: string;
  period: GreetingPeriod;
};

const subtitlePools: Record<GreetingPeriod, string[]> = {
  morning: [
    "Pick the thing that makes the day easier.",
    "Start with one thing that actually matters.",
    "Get clear first, then get moving.",
    "Make the day feel lighter before it gets busy.",
    "Put your best energy where it counts.",
    "Choose a good first step.",
  ],
  afternoon: [
    "Pick the thread back up.",
    "Move one important thing forward.",
    "Keep it steady and simple.",
    "Finish the next useful piece.",
    "Don't let fake urgency take over.",
    "Turn the scattered stuff into one clear win.",
  ],
  evening: [
    "Close a few loops before you wrap.",
    "Leave tomorrow a clean starting point.",
    "Capture the loose ends.",
    "Finish with intention, not fumes.",
    "Put things back in order.",
    "Make the ending feel clean.",
  ],
  lateNight: [
    "Keep it small and easy to finish.",
    "If it can wait, let it wait.",
    "Finish the thought, then step away.",
    "Make the last thing a simple one.",
    "Don't borrow too much from tomorrow.",
    "Wrap what's already open.",
  ],
};

const contextualSubtitles: Partial<Record<GreetingPeriod, Record<number, string[]>>> = {
  morning: { 1: ["Ease into the week with one clear move."] },
  afternoon: { 5: ["One clean finish makes Friday feel better."] },
  evening: {
    0: ["Keep Sunday light and leave a clean start."],
    5: ["Wrap the week without dragging it with you."],
  },
  lateNight: { 0: ["Keep Sunday night from turning into Monday morning."] },
};

const titleByPeriod: Record<GreetingPeriod, string> = {
  morning: "Good Morning",
  afternoon: "Good Afternoon",
  evening: "Good Evening",
  lateNight: "Still Working?",
};

export function getGreetingPeriod(date = new Date()): GreetingPeriod {
  const hour = date.getHours();
  if (hour >= 22 || hour < 5) return "lateNight";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function getGreetingCopy(
  date = new Date(),
  random: () => number = Math.random,
  previousSubtitle?: string | null,
): GreetingCopy {
  const period = getGreetingPeriod(date);
  const candidates = [
    ...subtitlePools[period],
    ...(contextualSubtitles[period]?.[date.getDay()] ?? []),
  ];
  const available =
    candidates.length > 1
      ? candidates.filter((subtitle) => subtitle !== previousSubtitle)
      : candidates;
  const index = Math.floor(random() * available.length) % available.length;

  return {
    title: titleByPeriod[period],
    subtitle: available[index] ?? candidates[0]!,
    period,
  };
}
