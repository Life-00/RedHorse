// src/pages/wellness/RelaxationHubPage.tsx
import { useMemo, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  Clock,
  Moon,
  Sun,
  Wind,
  Heart,
  CloudRain,
  Waves,
  Volume1,
  Timer,
} from "lucide-react";
import type { ScreenType } from "../../types/app";
import TopBar from "../../components/layout/TopBar";
import BottomNav from "../../components/layout/BottomNav";

type Props = {
  onNavigate: (s: ScreenType) => void;
};

type Tab = "meditation" | "sound";

type MeditationProgram = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  duration: string;
  description: string;
  color: string;
  bgColor: string;
  iconColor: string;
};

type SoundItem = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  iconColor: string;
};

export default function RelaxationHubPage({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("meditation");
  const [selectedProgram, setSelectedProgram] = useState<string>("pre-sleep");
  const [selectedSound, setSelectedSound] = useState<string>("rain");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [timer, setTimer] = useState(30);

  const meditationPrograms = useMemo<MeditationProgram[]>(
    () => [
      {
        id: "pre-sleep",
        icon: Moon,
        title: "수면 유도 명상",
        duration: "10분",
        description: "주간 수면 전 마음 안정",
        color: "from-indigo-500 to-purple-600",
        bgColor: "bg-indigo-50",
        iconColor: "text-indigo-600",
      },
      {
        id: "morning",
        icon: Sun,
        title: "아침 각성 명상",
        duration: "5분",
        description: "야간 근무 후 활력 회복",
        color: "from-amber-400 to-orange-500",
        bgColor: "bg-amber-50",
        iconColor: "text-amber-600",
      },
      {
        id: "breathing",
        icon: Wind,
        title: "호흡 운동",
        duration: "5분",
        description: "4-7-8 호흡법으로 긴장 완화",
        color: "from-sky-400 to-blue-500",
        bgColor: "bg-sky-50",
        iconColor: "text-sky-600",
      },
      {
        id: "body-scan",
        icon: Heart,
        title: "바디 스캔",
        duration: "8분",
        description: "근무 전 신체 긴장 해소",
        color: "from-rose-400 to-pink-500",
        bgColor: "bg-rose-50",
        iconColor: "text-rose-600",
      },
    ],
    []
  );

  const sounds = useMemo<SoundItem[]>(
    () => [
      {
        id: "rain",
        name: "빗소리",
        description: "부드러운 빗방울 소리",
        icon: CloudRain,
        color: "from-blue-400 to-blue-600",
        bgColor: "bg-blue-50",
        iconColor: "text-blue-600",
      },
      {
        id: "ocean",
        name: "파도 소리",
        description: "잔잔한 바다 파도",
        icon: Waves,
        color: "from-cyan-400 to-teal-600",
        bgColor: "bg-cyan-50",
        iconColor: "text-cyan-600",
      },
      {
        id: "wind",
        name: "바람 소리",
        description: "숲 속 바람",
        icon: Wind,
        color: "from-emerald-400 to-green-600",
        bgColor: "bg-emerald-50",
        iconColor: "text-emerald-600",
      },
      {
        id: "white",
        name: "화이트 노이즈",
        description: "순수 백색 소음",
        icon: Volume2,
        color: "from-gray-400 to-gray-600",
        bgColor: "bg-gray-50",
        iconColor: "text-gray-600",
      },
      {
        id: "brown",
        name: "브라운 노이즈",
        description: "깊은 저주파 소음",
        icon: Volume1,
        color: "from-amber-600 to-orange-700",
        bgColor: "bg-amber-50",
        iconColor: "text-amber-600",
      },
    ],
    []
  );

  const timerOptions = useMemo(() => [15, 30, 45, 60, 90, 120], []);

  const selectedMeditation = useMemo(
    () => meditationPrograms.find((p) => p.id === selectedProgram),
    [meditationPrograms, selectedProgram]
  );
  const selectedSoundData = useMemo(
    () => sounds.find((s) => s.id === selectedSound),
    [sounds, selectedSound]
  );

  const Icon =
    activeTab === "meditation"
      ? selectedMeditation?.icon || Moon
      : selectedSoundData?.icon || CloudRain;

  const gradient =
    activeTab === "meditation"
      ? selectedMeditation?.color || "from-indigo-500 to-purple-600"
      : selectedSoundData?.color || "from-blue-400 to-blue-600";

  const title =
    activeTab === "meditation"
      ? selectedMeditation?.title
      : selectedSoundData?.name;

  const desc =
    activeTab === "meditation"
      ? selectedMeditation?.description
      : selectedSoundData?.description;

  const subInfo =
    activeTab === "meditation" ? selectedMeditation?.duration : `${timer}분`;

  const stopPlaybackIfTabChanged = (tab: Tab) => {
    setActiveTab(tab);
    setIsPlaying(false);
  };

  return (
    <div className="h-full w-full bg-[#F8F9FD] flex flex-col overflow-hidden relative">
      <TopBar title="이완 & 휴식" onNavigate={onNavigate} backTo="wellness" />

      {/* Tab Switcher */}
      <div className="shrink-0 px-7 pt-3 pb-4 border-b border-gray-100 bg-white">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-full">
          <button
            onClick={() => stopPlaybackIfTabChanged("meditation")}
            className={[
              "flex-1 py-2 rounded-full text-sm font-black transition-all",
              activeTab === "meditation"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600",
            ].join(" ")}
          >
            명상 & 호흡
          </button>
          <button
            onClick={() => stopPlaybackIfTabChanged("sound")}
            className={[
              "flex-1 py-2 rounded-full text-sm font-black transition-all",
              activeTab === "sound"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600",
            ].join(" ")}
          >
            백색소음
          </button>
        </div>
      </div>

      {/* Scroll Area */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Player */}
        <div className="px-7 pt-6">
          <div
            className={`bg-gradient-to-br ${gradient} rounded-3xl p-6 text-white shadow-lg`}
          >
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Icon className="w-10 h-10" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-black mb-1">{title}</h2>
              <p className="text-sm opacity-90 font-bold">{desc}</p>
            </div>

            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="w-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors py-3 rounded-full flex items-center justify-center gap-2 mb-4 active:scale-[0.99]"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 fill-white" />
                  <span className="font-black">일시정지</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-white" />
                  <span className="font-black">시작하기</span>
                </>
              )}
            </button>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-black">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {subInfo}
                </div>

                {activeTab === "sound" && (
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    <span>{volume}%</span>
                  </div>
                )}
              </div>

              {activeTab === "sound" && (
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-white"
                />
              )}
            </div>
          </div>
        </div>

        {/* Timer (Sound only) */}
        {activeTab === "sound" && (
          <div className="px-7 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Timer className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-black text-gray-900">
                자동 종료
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {timerOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => setTimer(t)}
                  className={[
                    "py-2 rounded-xl text-xs font-black transition-colors",
                    timer === t
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100",
                  ].join(" ")}
                >
                  {t}분
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Options List */}
        <div className="px-7 pt-8">
          <h3 className="text-sm font-black text-gray-900 mb-3">
            {activeTab === "meditation" ? "프로그램 선택" : "사운드 선택"}
          </h3>

          <div className="space-y-3">
            {activeTab === "meditation"
              ? meditationPrograms.map((program) => {
                  const ProgramIcon = program.icon;
                  const isSelected = selectedProgram === program.id;

                  return (
                    <button
                      key={program.id}
                      onClick={() => {
                        setSelectedProgram(program.id);
                        setIsPlaying(false);
                      }}
                      className={[
                        "w-full p-4 rounded-2xl border-2 transition-all",
                        isSelected
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-100 bg-white hover:border-gray-200",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 ${program.bgColor} rounded-2xl flex items-center justify-center`}
                        >
                          <ProgramIcon
                            className={`w-6 h-6 ${program.iconColor}`}
                          />
                        </div>

                        <div className="flex-1 text-left">
                          <div className="font-black text-gray-900">
                            {program.title}
                          </div>
                          <div className="text-xs font-bold text-gray-500 mt-0.5">
                            {program.description}
                          </div>
                        </div>

                        <div className="text-xs font-black text-gray-500">
                          {program.duration}
                        </div>
                      </div>
                    </button>
                  );
                })
              : sounds.map((sound) => {
                  const SoundIcon = sound.icon;
                  const isSelected = selectedSound === sound.id;

                  return (
                    <button
                      key={sound.id}
                      onClick={() => {
                        setSelectedSound(sound.id);
                        setIsPlaying(false);
                      }}
                      className={[
                        "w-full p-4 rounded-2xl border-2 transition-all",
                        isSelected
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-100 bg-white hover:border-gray-200",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 ${sound.bgColor} rounded-2xl flex items-center justify-center`}
                        >
                          <SoundIcon
                            className={`w-6 h-6 ${sound.iconColor}`}
                          />
                        </div>

                        <div className="flex-1 text-left">
                          <div className="font-black text-gray-900">
                            {sound.name}
                          </div>
                          <div className="text-xs font-bold text-gray-500 mt-0.5">
                            {sound.description}
                          </div>
                        </div>

                        {isSelected && isPlaying && (
                          <div className="flex gap-0.5">
                            <div className="w-1 h-4 bg-indigo-600 rounded-full animate-pulse" />
                            <div
                              className="w-1 h-6 bg-indigo-600 rounded-full animate-pulse"
                              style={{ animationDelay: "150ms" }}
                            />
                            <div
                              className="w-1 h-4 bg-indigo-600 rounded-full animate-pulse"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
          </div>

          {/* Tips */}
          <div className="mt-6 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <div className="flex gap-3">
              <Moon className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-black text-indigo-900 mb-2">
                  {activeTab === "meditation" ? "명상 효과" : "수면 효과 팁"}
                </h4>

                <div className="space-y-2 text-xs font-bold text-indigo-700">
                  {activeTab === "meditation" ? (
                    <>
                      <div>• 수면 30분 전 명상이 가장 효과적</div>
                      <div>• 조용하고 어두운 공간에서 실행</div>
                      <div>• 편안한 자세로 진행하세요</div>
                    </>
                  ) : (
                    <>
                      <div>• 백색소음은 외부 소음 차단</div>
                      <div>• 적정 볼륨은 60-70%</div>
                      <div>• 타이머로 자동 종료 권장</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 추천 조합 (Sound only) */}
          {activeTab === "sound" && (
            <div className="mt-4 p-5 bg-purple-50 border border-purple-100 rounded-2xl">
              <h4 className="text-sm font-black text-purple-900 mb-3">
                추천 조합
              </h4>

              <div className="space-y-2 text-xs font-bold text-purple-700">
                <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                  <span>주간 수면 (밝은 환경)</span>
                  <span className="font-black">화이트 노이즈 + 안대</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                  <span>긴장 완화</span>
                  <span className="font-black">빗소리 + 명상</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                  <span>깊은 수면</span>
                  <span className="font-black">브라운 노이즈 + 60분</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-center text-gray-300 mt-8 font-bold">
            실제 오디오 재생은 추후 연동 가능합니다
          </div>

          <div className="h-6" />
        </div>
      </div>

      <div className="shrink-0">
        <BottomNav active="wellness" onNavigate={onNavigate} />
      </div>
    </div>
  );
}
