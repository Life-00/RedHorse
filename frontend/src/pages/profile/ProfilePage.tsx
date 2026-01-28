// src/pages/profile/ProfilePage.tsx
import type { ScreenType } from "../../types/app";

type Props = {
  onNavigate: (s: ScreenType) => void;
  onLogout: () => void;
};

export default function ProfilePage({ onNavigate, onLogout }: Props) {
  return (
    <div className="h-full w-full bg-[#F8F9FD] flex flex-col">
      <div className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate("home")}
            className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-[12px] font-black"
          >
            ← 홈
          </button>
          <h1 className="text-[18px] font-black text-gray-900">프로필</h1>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-full bg-[#5843E4]/10 text-[#5843E4] text-[12px] font-black"
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="text-[14px] font-black text-gray-900 mb-2">내 계정</div>
          <div className="text-[12px] font-bold text-gray-400">
            (임시) Cognito 연결 후 이메일/이름 표시 예정
          </div>
        </div>
      </div>
    </div>
  );
}
