import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  desc: string;
  isSelected: boolean;
  onClick: () => void;
  showRadio?: boolean;
};

export default function SelectionCard({
  icon: Icon,
  label,
  desc,
  isSelected,
  onClick,
  showRadio = true,
}: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full p-4 rounded-[22px] border-2 transition-all flex items-center gap-4 text-left ${
        isSelected
          ? "border-[#5843E4] bg-[#F8F7FF]"
          : "border-gray-50 bg-white hover:border-gray-100 shadow-sm"
      }`}
    >
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
          isSelected ? "bg-[#5843E4] text-white" : "bg-gray-50 text-gray-400"
        }`}
      >
        <Icon className="w-6 h-6" />
      </div>

      <div className="flex-1">
        <div className="font-bold text-gray-900 text-[16px]">{label}</div>
        <div className="text-[13px] text-gray-500 font-medium">{desc}</div>
      </div>

      {showRadio && (
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected ? "border-[#5843E4] bg-[#5843E4]" : "border-gray-200"
          }`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      )}
    </motion.button>
  );
}
