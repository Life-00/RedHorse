export type ShiftType = "day" | "night" | "off";

export type ShiftConfig = {
  label: string;
  color: string; // tailwind class set
};

export const SHIFT_CONFIG: Record<ShiftType, ShiftConfig> = {
  day: {
    label: "주간",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  night: {
    label: "야간",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
  },
  off: {
    label: "휴무",
    color: "bg-gray-50 text-gray-400 border-gray-100",
  },
};
