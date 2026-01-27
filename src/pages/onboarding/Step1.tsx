import { ArrowRight } from "lucide-react";
import type { UserPreferences, WorkType } from "../../types/app";
import { WORK_OPTIONS } from "../../utils/onboardingOptions";
import SelectionCard from "../../components/shared/SelectionCard";

type Props = {
  prefs: UserPreferences;
  updatePrefs: (partial: Partial<UserPreferences>) => void;
  onNext: () => void;
};

export default function OnboardingStep1({ prefs, updatePrefs, onNext }: Props) {
  return (
    <div className="h-full flex flex-col px-7 py-4">
      <div className="mb-8">
        <div className="flex gap-1.5 mb-7">
          <div className="w-8 h-2 rounded-full bg-[#5843E4] shadow-sm shadow-[#5843E4]/20" />
          <div className="w-2 h-2 rounded-full bg-gray-200" />
        </div>
        <h1 className="text-[30px] font-black leading-tight mb-2 tracking-tight">
          근무 형태를<br />선택해주세요
        </h1>
        <p className="text-gray-400 font-bold text-[15px]">
          생체리듬 최적화를 위한 첫 단계입니다
        </p>
      </div>

      <div className="flex-1 space-y-3.5 overflow-y-auto pr-1 scrollbar-hide">
        {WORK_OPTIONS.map((opt) => (
          <SelectionCard
            key={opt.id}
            icon={opt.icon}
            label={opt.label}
            desc={opt.desc}
            isSelected={prefs.workType === opt.id}
            onClick={() => updatePrefs({ workType: opt.id as WorkType })}
          />
        ))}

        <div className="pt-6 pb-2">
          <label className="block text-[14px] font-black text-gray-700 mb-3 ml-1">
            통근 시간 (분)
          </label>
          <div className="relative">
            <input
              type="number"
              value={prefs.commuteTime}
              onChange={(e) => updatePrefs({ commuteTime: Number(e.target.value) })}
              className="w-full px-5 py-4.5 rounded-[20px] bg-[#F9FAFB] border-none focus:ring-2 focus:ring-[#5843E4]/20 outline-none text-xl font-black"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
              분
            </span>
          </div>
        </div>
      </div>

      <button
        disabled={!prefs.workType}
        onClick={onNext}
        className="w-full bg-[#5843E4] text-white py-4.5 rounded-[22px] flex items-center justify-center gap-2 font-black text-lg shadow-xl shadow-[#5843E4]/20 disabled:opacity-30 transition-all active:scale-95"
      >
        다음 <ArrowRight className="w-6 h-6" />
      </button>
    </div>
  );
}
