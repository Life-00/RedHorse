// src/pages/auth/SignUpScreen.tsx
import { useState } from "react";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import type { ScreenType } from "../../types/app";
import { authSignUp } from "../../lib/auth";

type Props = {
  onNavigate: (s: ScreenType) => void;
  onSignedUp: (email: string) => void;
};

export default function SignUpScreen({ onNavigate, onSignedUp }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async () => {
    setError("");
    setLoading(true);
    try {
      await authSignUp({ name, email, password: pw });
      onSignedUp(email); // ✅ App이 confirm으로 보내고 email 저장함
    } catch (e: any) {
      setError(e?.message ?? "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="px-6 pt-14 pb-6">
        <button onClick={() => onNavigate("login")} className="text-sm font-black text-gray-600">
          ← 로그인으로
        </button>

        <h1 className="text-2xl font-black text-gray-900 mt-4">회원가입</h1>
        <p className="text-sm text-gray-600 mt-1">이메일 인증 후 가입이 완료됩니다</p>
      </div>

      <div className="flex-1 px-6 overflow-y-auto pb-10">
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <div className="mb-4">
            <label className="text-sm font-black text-gray-700 mb-2 block">이름</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm font-black text-gray-700 mb-2 block">이메일</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-sm font-black text-gray-700 mb-2 block">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="최소 8자"
                className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && <div className="text-sm font-bold text-rose-600 mb-3">{error}</div>}

          <button
            onClick={handleSignUp}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-full font-black shadow-lg active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? "가입 중..." : "인증코드 받기"}
          </button>
        </div>
      </div>
    </div>
  );
}
