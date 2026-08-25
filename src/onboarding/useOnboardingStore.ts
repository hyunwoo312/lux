import { create } from "zustand";
import { getLocal, setLocal, WELCOME_SEEN_KEY } from "@/lib/local-store";

type OnboardingState = {
  welcomeOpen: boolean;
  closeWelcome: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  welcomeOpen: getLocal(WELCOME_SEEN_KEY) === null,
  closeWelcome: () => {
    setLocal(WELCOME_SEEN_KEY, "1");
    set({ welcomeOpen: false });
  },
}));
