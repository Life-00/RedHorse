import type { ScreenType } from "../../types/app";
import { Calendar, FileText, Home, Sparkles, User } from "lucide-react";

type Props = {
  active: ScreenType;
  onNavigate: (s: ScreenType) => void;
};

export default function BottomNav({ active, onNavigate }: Props) {
  const items: Array<{ id: ScreenType; icon: any; label: string }> = [
    { id: "home", icon: Home, label: "홈" },
    { id: "wellness", icon: Sparkles, label: "웰빙" },
    { id: "schedule", icon: Calendar, label: "근무표" },
    { id: "plan", icon: FileText, label: "플랜" },
    { id: "profile", icon: User, label: "내정보" },
  ];

  return (
    <div className="absolute bottom-8 left-0 right-0 px-6 z-50">
      <div className="bg-white/90 backdrop-blur-2xl rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 px-3 py-2.5">
        <div className="flex justify-around items-center">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1.5 px-3 py-1 rounded-xl transition-all ${
                  isActive ? "text-[#5843E4]" : "text-gray-300 hover:text-gray-500"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[2]"}`} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
