import type { LucideIcon } from "lucide-react";
import { Sun, Sunset, Moon, Shuffle, Apple, Watch, XCircle } from "lucide-react";

export const WORK_OPTIONS: ReadonlyArray<{
  id: "2shift" | "3shift" | "fixed_night" | "irregular";
  label: string;
  desc: string;
  icon: LucideIcon;
}> = [
  { id: "2shift", label: "2교대", icon: Sun, desc: "주간/야간 순환" },
  { id: "3shift", label: "3교대", icon: Sunset, desc: "주간/중간/야간" },
  { id: "fixed_night", label: "고정 야간", icon: Moon, desc: "밤 근무 고정" },
  { id: "irregular", icon: Shuffle, label: "불규칙", desc: "변동 스케줄" },
] as const;

export const DEVICE_OPTIONS: ReadonlyArray<{
  id: "apple" | "google" | "galaxy" | "none";
  label: string;
  desc: string;
  icon: LucideIcon;
}> = [
  { id: "apple", icon: Apple, label: "Apple Health", desc: "수면, 심박수 데이터 연동" },
  { id: "google", icon: Watch, label: "Google Fit", desc: "활동량, 수면 데이터 연동" },
  { id: "galaxy", icon: Watch, label: "Galaxy Watch", desc: "삼성 헬스 데이터 연동" },
  { id: "none", icon: XCircle, label: "연결할 기기 없음", desc: "직접 데이터 입력 가능" },
] as const;
