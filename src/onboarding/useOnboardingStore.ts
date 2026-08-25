import { create } from "zustand";
import { getLocal, removeLocal, setLocal, WELCOME_SEEN_KEY } from "@/lib/local-store";

type OnboardingState = {
  welcomeOpen: boolean;
  closeWelcome: () => void;
  replayOnNextOpen: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  welcomeOpen: getLocal(WELCOME_SEEN_KEY) === null,
  closeWelcome: () => {
    setLocal(WELCOME_SEEN_KEY, "1");
    set({ welcomeOpen: false });
  },
  replayOnNextOpen: () => removeLocal(WELCOME_SEEN_KEY),
}));
