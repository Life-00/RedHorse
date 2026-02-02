import { useEffect, useState } from "react";
import { Mail, KeyRound } from "lucide-react";
import type { ScreenType } from "../../types/app";
import { authConfirmSignUp } from "../../lib/auth";

type Props = {
  onNavigate: (s: ScreenType) => void;
  email: string;
  onConfirmSuccess: () => void;
};

export default function ConfirmSignUpScreen({ onNavigate, onConfirmSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const pending = localStorage.getItem("pending_signup_email") ?? "";
    setEmail(pending);
  }, []);

  const handleConfirm = async () => {
    setError("");
    setLoading(true);
    try {
      await authConfirmSignUp({ email, code });
      localStorage.removeItem("pending_signup_email");
      onConfirmSuccess(); // 보통 login으로
    } catch (e: any) {
      setError(e?.message ?? "인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="px-6 pt-14 pb-6">
        <button onClick={() => onNavigate("signup")} className="text-sm font-black text-gray-600">
          ← 회원가입으로
        </button>
        <h1 className="text-2xl font-black text-gray-900 mt-4">이메일 인증</h1>
        <p className="text-sm text-gray-600 mt-1">이메일로 받은 인증코드를 입력하세요</p>
      </div>

      <div className="flex-1 px-6 overflow-y-auto pb-10">
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <div className="mb-4">
            <label className="text-sm font-black text-gray-700 mb-2 block">이메일</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-sm font-black text-gray-700 mb-2 block">인증코드</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {error && <div className="text-sm font-bold text-rose-600 mb-3">{error}</div>}

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-full font-black shadow-lg active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? "확인 중..." : "가입 완료"}
          </button>

          <div className="text-center mt-6">
            <button onClick={() => onNavigate("login")} className="text-sm text-indigo-600 font-black">
              로그인으로 이동
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
