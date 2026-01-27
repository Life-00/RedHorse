import { useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import type { ScreenType } from "../../types/app";
import { authSignIn } from "../../lib/auth";

type Props = {
  onNavigate: (s: ScreenType) => void;
  onLoginSuccess: () => void;
};

export default function LoginScreen({ onNavigate, onLoginSuccess }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await authSignIn({ email, password });
      onLoginSuccess();
    } catch (e: any) {
      setError(e?.message ?? "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="px-6 pt-16 pb-8 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
          <div className="text-white font-black text-xl">SHIFT</div>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">로그인</h1>
        <p className="text-sm text-gray-600">이메일로 로그인하세요</p>
      </div>

      <div className="flex-1 px-6 overflow-y-auto pb-10">
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
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
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && <div className="text-sm font-bold text-rose-600 mb-3">{error}</div>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-full font-black shadow-lg active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>

          <div className="text-center mt-6">
            <span className="text-sm text-gray-600">계정이 없으신가요? </span>
            <button
              onClick={() => onNavigate("signup")}
              className="text-sm text-indigo-600 font-black hover:text-indigo-700"
            >
              회원가입
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
