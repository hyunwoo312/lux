import { create } from "zustand";
import { getLocal, setLocal } from "@/lib/local-store";

export const WELCOME_SEEN_KEY = "lux.welcome.seen";

type OnboardingState = {
  welcomeOpen: boolean;
  tourActive: boolean;
  step: number;
  closeWelcome: () => void;
  startTour: () => void;
  next: () => void;
  prev: () => void;
  backToWelcome: () => void;
  stop: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  welcomeOpen: getLocal(WELCOME_SEEN_KEY) === null,
  tourActive: false,
  step: 0,
  closeWelcome: () => {
    setLocal(WELCOME_SEEN_KEY, "1");
    set({ welcomeOpen: false });
  },
  startTour: () => {
    setLocal(WELCOME_SEEN_KEY, "1");
    set({ welcomeOpen: false, tourActive: true, step: 0 });
  },
  next: () => set((state) => ({ step: state.step + 1 })),
  prev: () => set((state) => ({ step: Math.max(0, state.step - 1) })),
  backToWelcome: () => set({ tourActive: false, step: 0, welcomeOpen: true }),
  stop: () => set({ tourActive: false, step: 0 }),
}));
