// src/App.tsx
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MobileFrame from "./components/layout/MobileFrame";

import type { ScreenType, UserPreferences } from "./types/app";

import OnboardingStep1 from "./pages/onboarding/Step1";
import OnboardingStep2 from "./pages/onboarding/Step2";

import HomeDashboard from "./pages/home/HomeDashboard";
import HomeDashboardLoggedOut from "./pages/home/HomeDashboardLoggedOut";

import LoginScreen from "./pages/auth/LoginScreen";
import SignUpScreen from "./pages/auth/SignUpScreen";
import ConfirmSignUpScreen from "./pages/auth/ConfirmSignUpScreen";

import WellnessPage from "./pages/wellness/WellnessPage";
import SchedulePage from "./pages/schedule/SchedulePage";
import PlanPage from "./pages/plan/PlanPage";
import ProfilePage from "./pages/profile/ProfilePage";
import CaffeineCutoffPage from "./pages/wellness/CaffeineCutoffPage";
import RelaxationHubPage from "./pages/wellness/RelaxationHubPage";

import FatigueRiskScorePage from "./pages/plan/FatigueRiskScorePage";
import DailyJumpstartPage from "./pages/plan/DailyJumpstartPage";

import { authIsSignedIn } from "./lib/auth";

const AUTHPAGES: ScreenType[] = ["login", "signup", "confirm"];

export default function App() {
  const [screen, setScreen] = useState<ScreenType>("onboarding-1");
  const [isAuthed, setIsAuthed] = useState(false);

  const [prefs, setPrefs] = useState<UserPreferences>({
    workType: "",
    commuteTime: 30,
    wearableDevice: "",
    onboardingCompleted: false,
  });

  const [pendingEmail, setPendingEmail] = useState("");

  // prefs 로드
  useEffect(() => {
    const saved = localStorage.getItem("userPreferences");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as UserPreferences;
      setPrefs(parsed);
    } catch {
      // 저장값 깨졌으면 무시
    }
  }, []);

  // 로그인 상태 체크 + 초기 라우팅
  useEffect(() => {
    (async () => {
      // 온보딩 미완료면 온보딩 화면 유지
      if (!prefs.onboardingCompleted) return;

      let ok = false;
      try {
        ok = await authIsSignedIn();
      } catch {
        ok = false;
      }

      setIsAuthed(ok);

      // auth 페이지(로그인/회원가입/인증)는 사용자가 들어간 상태 유지
      if (AUTHPAGES.includes(screen)) return;

      // ✅ 홈/홈-로그아웃이 아닌 경우에는 현재 화면 유지 (UX 보호)
      if (screen !== "home" && screen !== "home-loggedout") return;

      setScreen(ok ? "home" : "home-loggedout");
    })();
    // screen도 deps에 넣으면 auth페이지에서 다시 덮어쓸 수 있어서 의도적으로 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.onboardingCompleted]);

  const updatePrefs = (partial: Partial<UserPreferences>) => {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    localStorage.setItem("userPreferences", JSON.stringify(next));
  };

  const handleOnboardingComplete = () => {
    updatePrefs({ onboardingCompleted: true });
    setScreen("home-loggedout");
  };

  const handleLoginSuccess = () => {
    setIsAuthed(true);
    setScreen("home");
  };

  const handleLogoutDone = () => {
    setIsAuthed(false);
    setScreen("home-loggedout");
  };

  // confirm에 email 없으면 signup으로 보내기(안전장치)
  useEffect(() => {
    if (screen === "confirm" && !pendingEmail) {
      setScreen("signup");
    }
  }, [screen, pendingEmail]);

  return (
    <MobileFrame>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="h-full"
        >
          {/* Onboarding */}
          {screen === "onboarding-1" && (
            <OnboardingStep1
              prefs={prefs}
              updatePrefs={updatePrefs}
              onNext={() => setScreen("onboarding-2")}
            />
          )}

          {screen === "onboarding-2" && (
            <OnboardingStep2
              prefs={prefs}
              updatePrefs={updatePrefs}
              onPrev={() => setScreen("onboarding-1")}
              onComplete={handleOnboardingComplete}
            />
          )}

          {/* Auth */}
          {screen === "home-loggedout" && (
            <HomeDashboardLoggedOut onNavigate={setScreen} />
          )}

          {screen === "login" && (
            <LoginScreen
              onNavigate={setScreen}
              onLoginSuccess={handleLoginSuccess}
            />
          )}

          {screen === "signup" && (
            <SignUpScreen
              onNavigate={setScreen}
              onSignedUp={(email) => {
                setPendingEmail(email);
                setScreen("confirm");
              }}
            />
          )}

          {screen === "confirm" && (
            <ConfirmSignUpScreen
              onNavigate={setScreen}
              email={pendingEmail}
              onConfirmed={() => setScreen("login")}
            />
          )}

          {/* Home */}
          {screen === "home" && (
            <HomeDashboard
              onNavigate={setScreen}
              onLogoutDone={handleLogoutDone}
            />
          )}

          {/* Main Pages */}
          {screen === "wellness" && <WellnessPage onNavigate={setScreen} />}
          {screen === "schedule" && <SchedulePage onNavigate={setScreen} />}
          {screen === "plan" && <PlanPage onNavigate={setScreen} />}

          {/* Plan sub pages */}
          {screen === "fatigue-risk" && (
            <FatigueRiskScorePage onNavigate={setScreen} />
          )}
          {screen === "daily-jumpstart" && (
            <DailyJumpstartPage onNavigate={setScreen} />
          )}

          {/* Profile / Settings */}
          {screen === "profile" && (
            <ProfilePage
              onNavigate={setScreen}
              onLogoutDone={handleLogoutDone}
            />
          )}

          {/* Wellness sub pages */}
          {screen === "caffeine" && (
            <CaffeineCutoffPage onNavigate={setScreen} />
          )}
          {screen === "relax" && <RelaxationHubPage onNavigate={setScreen} />}
        </motion.div>
      </AnimatePresence>
    </MobileFrame>
  );
}
