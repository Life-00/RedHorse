// src/App.tsx
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MobileFrame from "./components/layout/MobileFrame";
import FloatingChatbot from "./components/shared/FloatingChatbot";

import type { ScreenType, UserPreferences } from "./types/app";

import OnboardingStep1 from "./pages/onboarding/Step1";
import OnboardingStep2 from "./pages/onboarding/Step2";

import HomeDashboard from "./pages/home/HomeDashboard";
import HomeDashboardLoggedOut from "./pages/home/HomeDashboardLoggedOut";

import LoginScreen from "./pages/auth/LoginScreen";
import SignUpScreen from "./pages/auth/SignUpScreen";

import WellnessPage from "./pages/wellness/WellnessPage";
import SchedulePage from "./pages/schedule/SchedulePage";
import PlanPage from "./pages/plan/PlanPage";
import ProfilePage from "./pages/profile/ProfilePage";
import CaffeineCutoffPage from "./pages/wellness/CaffeineCutoffPage";
import RelaxationHubPage from "./pages/wellness/RelaxationHubPage";

import FatigueRiskScorePage from "./pages/plan/FatigueRiskScorePage";
import DailyJumpstartPage from "./pages/plan/DailyJumpstartPage";

import { authIsSignedIn } from "./lib/auth";
import { fetchAuthSession } from "aws-amplify/auth";
import { userApi } from "./lib/api";

const AUTHPAGES: ScreenType[] = ["login", "signup"];

// 로그아웃 상태 페이지 (챗봇 표시 안 함)
const LOGGED_OUT_PAGES: ScreenType[] = ["home-loggedout", "login", "signup"];

export default function App() {
  const [screen, setScreen] = useState<ScreenType>("home-loggedout"); // 초기 화면을 로그아웃 홈으로 변경
  const [isAuthed, setIsAuthed] = useState(false);

  const [prefs, setPrefs] = useState<UserPreferences>({
    workType: "",
    commuteTime: 30,
    wearableDevice: "",
    onboardingCompleted: false, // 기본값을 다시 false로 복원
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
      let ok = false;
      try {
        ok = await authIsSignedIn();
      } catch {
        ok = false;
      }

      setIsAuthed(ok);

      // auth 페이지(로그인/회원가입/인증)는 사용자가 들어간 상태 유지
      if (AUTHPAGES.includes(screen)) return;

      // ✅ 로그인 안된 상태면 항상 홈 로그아웃 화면
      if (!ok) {
        setScreen("home-loggedout");
        return;
      }

      // ✅ 로그인 했는데 온보딩 미완료면 온보딩 화면
      if (!prefs.onboardingCompleted) {
        setScreen("onboarding-1");
        return;
      }

      // ✅ 로그인 했고 온보딩 완료면 홈 대시보드
      setScreen("home");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.onboardingCompleted]);

  const updatePrefs = (partial: Partial<UserPreferences>) => {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    localStorage.setItem("userPreferences", JSON.stringify(next));
  };

  const handleOnboardingComplete = () => {
    updatePrefs({ onboardingCompleted: true });
    // 온보딩 완료 후 로그인 상태에 따라 적절한 화면으로 이동
    setScreen(isAuthed ? "home" : "home-loggedout");
  };

  const handleLoginSuccess = async () => {
    console.log('🔍 로그인 성공 - 사용자 동기화 시작');
    
    // 로그인 성공 후 데이터베이스에 사용자 정보 동기화
    try {
      const session = await fetchAuthSession();
      console.log('🔍 Cognito 세션:', session);
      const cognitoUser = session.tokens?.idToken?.payload;
      console.log('🔍 Cognito 사용자 정보:', cognitoUser);
      
      if (cognitoUser) {
        const userId = cognitoUser.sub as string;
        const email = cognitoUser.email as string;
        const name = cognitoUser.name as string;
        
        console.log('🔍 추출된 사용자 정보:', { userId, email, name });
        
        // 데이터베이스에 사용자 생성 또는 업데이트
        try {
          console.log('🔍 사용자 생성 API 호출 시작');
          const result = await userApi.createProfile({
            user_id: userId,
            email: email,
            name: name,
            work_type: '2shift', // 기본값
            commute_time: 30,
            wearable_device: 'none',
            onboarding_completed: false
          });
          console.log('✅ 사용자 생성 성공:', result);
        } catch (error: any) {
          console.log('❌ 사용자 생성 오류:', error);
          // 사용자가 이미 존재하는 경우 무시
          if (!error.message?.includes('already exists')) {
            console.error('사용자 생성 실패:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ 사용자 동기화 실패:', error);
    }
    
    // 인증 상태를 먼저 업데이트하고 화면 전환
    setIsAuthed(true);
    
    // 온보딩 완료 여부에 따라 화면 전환
    if (prefs.onboardingCompleted) {
      setScreen("home");
    } else {
      setScreen("onboarding-1");
    }
  };

  const handleLogoutDone = () => {
    setIsAuthed(false);
    setScreen("home-loggedout");
  };

  // confirm에 email 없으면 signup으로 보내기(안전장치) - 더 이상 필요 없음
  // useEffect(() => {
  //   if (screen === "confirm" && !pendingEmail) {
  //     setScreen("signup");
  //   }
  // }, [screen, pendingEmail]);

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
                // 회원가입 완료 후 로그인 화면으로 이동 (SignUpScreen에서 처리)
                setPendingEmail(email);
              }}
            />
          )}

          {/* Home */}
          {screen === "home" && (
            <HomeDashboard
              onNavigate={setScreen}
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
              onLogout={handleLogoutDone}
            />
          )}

          {/* Wellness sub pages */}
          {screen === "caffeine" && (
            <CaffeineCutoffPage onNavigate={setScreen} />
          )}
          {screen === "relax" && <RelaxationHubPage onNavigate={setScreen} />}
        </motion.div>
      </AnimatePresence>

      {/* 플로팅 챗봇 - 로그인된 페이지에만 표시 */}
      {isAuthed && !LOGGED_OUT_PAGES.includes(screen) && <FloatingChatbot />}
    </MobileFrame>
  );
}
