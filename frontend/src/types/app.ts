export type ScreenType =
  | "onboarding-1"
  | "onboarding-2"
  | "home"
  | "home-loggedout"
  | "login"
  | "signup"
  | "wellness"
  | "schedule"
  | "plan"
  | "profile"
  | "caffeine"
  | "fatigue-risk"
  | "daily-jumpstart"
  | "relax";

export type WorkType = "2shift" | "3shift" | "fixed_night" | "irregular" | "";
export type DeviceType = "apple" | "google" | "galaxy" | "none" | "";

export interface UserPreferences {
  workType: WorkType;
  commuteTime: number;
  wearableDevice: DeviceType;
  onboardingCompleted: boolean;
}
