import { Shield } from "lucide-react";
import type { UserPreferences, DeviceType } from "../../types/app";
import { DEVICE_OPTIONS } from "../../utils/onboardingOptions";
import SelectionCard from "../../components/shared/SelectionCard";

type Props = {
  prefs: UserPreferences;
  updatePrefs: (partial: Partial<UserPreferences>) => void;
  onPrev: () => void;
  onComplete: () => void;
};

export default function OnboardingStep2({ prefs, updatePrefs, onPrev, onComplete }: Props) {
  return (
    <div className="h-full flex flex-col px-7 py-4">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-200 cursor-pointer" onClick={onPrev} />
            <div className="w-8 h-2 rounded-full bg-[#5843E4] shadow-sm shadow-[#5843E4]/20" />
          </div>
          <button
            onClick={onComplete}
            className="text-gray-400 text-[14px] font-bold hover:text-gray-600 transition-colors"
          >
            건너뛰기
          </button>
        </div>

        <h1 className="text-[30px] font-black leading-tight mb-2 tracking-tight">
          웨어러블 기기<br />연결 (선택)
        </h1>
        <p className="text-gray-400 font-bold text-[15px]">
          수면 데이터로 더 정확한 분석을 제공합니다
        </p>
      </div>

      <div className="flex-1 space-y-3.5 overflow-y-auto pr-1 scrollbar-hide">
        {DEVICE_OPTIONS.map((opt) => (
          <SelectionCard
            key={opt.id}
            icon={opt.icon}
            label={opt.label}
            desc={opt.desc}
            isSelected={prefs.wearableDevice === opt.id}
            onClick={() => updatePrefs({ wearableDevice: opt.id as DeviceType })}
            showRadio={false}
          />
        ))}

        <div className="mt-6 p-5 rounded-[24px] bg-[#F0F2FF] border border-[#E0E4FF]">
          <div className="flex gap-3">
            <Shield className="w-6 h-6 text-[#5843E4] shrink-0 mt-0.5" />
            <div className="text-[13.5px] text-[#5843E4] leading-relaxed font-medium">
              <div className="font-black mb-1.5 underline underline-offset-4 decoration-2">
                개인정보 보호 안내
              </div>
              <ul className="space-y-1 opacity-80">
                <li>• 오디오/위치 정보는 수집하지 않습니다</li>
                <li>• 데이터는 암호화되어 안전하게 관리됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full bg-[#5843E4] text-white py-4.5 rounded-[22px] font-black text-lg shadow-xl shadow-[#5843E4]/20 transition-all active:scale-95"
      >
        시작하기
      </button>
    </div>
  );
}
