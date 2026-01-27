import type { ScreenType } from "../../types/app";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  onNavigate: (s: ScreenType) => void;
  backTo?: ScreenType; // 기본: home
  rightSlot?: React.ReactNode; // 우측 버튼(예: 가져오기) 넣고 싶을 때
};

export default function TopBar({
  title,
  onNavigate,
  backTo = "home",
  rightSlot,
}: Props) {
  return (
    <div className="shrink-0 px-7 pt-6 pb-5 bg-white shadow-sm border-b border-gray-100">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate(backTo)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-black text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          뒤로
        </button>

        <div className="text-[18px] font-black text-[#1A1A1A]">{title}</div>

        <div className="min-w-[72px] flex justify-end">{rightSlot ?? <div />}</div>
      </div>
    </div>
  );
}
