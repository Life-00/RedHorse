import { useEffect, useState } from "react";
import type { ScreenType } from "../../types/app";
import TopBar from "../../components/layout/TopBar";
import { fetchAuthSession } from "aws-amplify/auth";

type Props = {
  onNavigate: (s: ScreenType) => void;
  onLoginSuccess: () => void;
};

export default function AuthCallbackPage({ onNavigate, onLoginSuccess }: Props) {
  const [msg, setMsg] = useState("로그인 처리 중...");

  useEffect(() => {
    (async () => {
      try {
        const session = await fetchAuthSession();
        const hasToken = Boolean(session.tokens?.idToken);

        if (!hasToken) {
          setMsg("토큰을 받지 못했습니다. Hosted UI 설정(도메인/리다이렉트)을 확인해주세요.");
          return;
        }

        // ✅ 여기까지 왔으면 “실제로 Cognito 연결 성공”
        onLoginSuccess();
        onNavigate("home");
      } catch (e: any) {
        setMsg(e?.message ?? "콜백 처리 중 오류가 발생했습니다.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#F8F9FD]">
      <TopBar title="로그인 콜백" backTo="login" onNavigate={onNavigate} />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm text-center w-full">
          <div className="text-[15px] font-black text-gray-900 mb-2">{msg}</div>
          <div className="text-[12px] font-bold text-gray-400">
            문제가 지속되면 Redirect URL / Domain 설정을 확인하세요.
          </div>
        </div>
      </div>
    </div>
  );
}
