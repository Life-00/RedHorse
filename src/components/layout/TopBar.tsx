import type { ScreenType } from "../../types/app";

type Props = {
  title: string;
  subtitle?: string; // 선택적 부제목 추가
  onNavigate: (s: ScreenType) => void;
  backTo?: ScreenType; // 기본: home
  rightSlot?: React.ReactNode; // 우측 버튼(예: 가져오기) 넣고 싶을 때
};

export default function TopBar({
  title,
  subtitle,
  onNavigate,
  backTo = "home",
  rightSlot,
}: Props) {
  return (
    <div className="shrink-0 px-7 pt-6 pb-6 bg-white shadow-sm border-b border-gray-100 rounded-b-[32px]">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => onNavigate(backTo)}
              className="flex items-center justify-center text-indigo-600 hover:text-indigo-700 active:scale-95 transition-all"
              aria-label="뒤로가기"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[24px] font-black text-[#1A1A1A]">{title}</h1>
          </div>
          {subtitle && (
            <p className="text-[14px] text-gray-400 font-bold ml-9">
              {subtitle}
            </p>
          )}
        </div>

        {rightSlot && <div className="ml-4">{rightSlot}</div>}
      </div>
    </div>
  );
}
