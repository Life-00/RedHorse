// src/pages/home/HomeDashboard.tsx
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Moon,
  Zap,
  ChevronRight,
  Clock,
  Coffee,
  AlertTriangle,
  CheckCircle2,
  Circle,
  LogOut,
  ListChecks,
} from "lucide-react";
import type { ScreenType } from "../../types/app";
import BottomNav from "../../components/layout/BottomNav";
import RiskBadge from "../../components/shared/RiskBadge";
import { authSignOut } from "../../lib/auth";
import { fetchAuthSession } from "aws-amplify/auth";
import { userApi, scheduleApi, aiApi, fatigueApi } from "../../lib/api";
import { useCurrentUser, useToday } from "../../hooks/useApi";
import type { UserProfile, Schedule, SleepPlan, FatigueAssessment } from "../../types/api";
import { formatTimeToHHMM, SHIFT_TYPE_FULL_LABELS, getAllowedShiftTypes, isValidShiftType } from "../../utils/shiftTypeUtils";

type Props = {
  onNavigate: (s: ScreenType) => void;
};

export default function HomeDashboard({ onNavigate }: Props) {
  const { userId, loading: userLoading } = useCurrentUser();
  const today = useToday();
  
  // 상태 관리
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [cognitoUserName, setCognitoUserName] = useState<string>('');
  const [todaySchedule, setTodaySchedule] = useState<Schedule | null>(null);
  const [sleepPlan, setSleepPlan] = useState<SleepPlan | null>(null);
  const [fatigueAssessment, setFatigueAssessment] = useState<FatigueAssessment | null>(null);
  const [caffeineCutoff, setCaffeineCutoff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 점프스타트 더미 데이터 (프론트엔드에서만 표시)
  const dummyJumpstartBlocks = [
    {
      id: 1,
      block_name: "지금 바로",
      block_type: "now" as const,
      total_tasks: 3,
      completed_tasks: 1,
      total_duration: 25,
    },
    {
      id: 2,
      block_name: "필수 실행",
      block_type: "must_do" as const,
      total_tasks: 4,
      completed_tasks: 0,
      total_duration: 45,
    },
    {
      id: 3,
      block_name: "회복 루틴",
      block_type: "recovery" as const,
      total_tasks: 2,
      completed_tasks: 0,
      total_duration: 20,
    },
  ];

  // 데이터 로드
  useEffect(() => {
    if (!userId || userLoading) return;

    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Cognito에서 사용자 이름 가져오기
        try {
          const session = await fetchAuthSession();
          const cognitoUser = session.tokens?.idToken?.payload;
          console.log('🔍 현재 로그인된 Cognito 사용자 전체 정보:', cognitoUser);
          if (cognitoUser?.name) {
            setCognitoUserName(cognitoUser.name as string);
            console.log('🔍 Cognito 사용자 이름:', cognitoUser.name);
            console.log('🔍 Cognito 사용자 이메일:', cognitoUser.email);
            console.log('🔍 Cognito 사용자 ID:', cognitoUser.sub);
          }
        } catch (error) {
          console.error('Cognito 사용자 정보 가져오기 실패:', error);
        }

        // 병렬로 데이터 로드
        const [
          profileResponse,
          scheduleResponse,
          sleepPlanResponse,
          fatigueResponse,
          caffeineResponse
        ] = await Promise.allSettled([
          userApi.getProfile(userId),
          scheduleApi.getSchedules(userId, today, today),
          aiApi.getSleepPlan(userId, today),
          fatigueApi.getFatigueAssessment(userId, today),
          aiApi.getCaffeinePlan(userId, today)
        ]);

        // 프로필 데이터
        if (profileResponse.status === 'fulfilled') {
          setUserProfile(profileResponse.value.user);
          console.log('✅ 사용자 프로필 로드 성공:', profileResponse.value.user);
        } else {
          console.error('❌ 사용자 프로필 로드 실패:', profileResponse.reason);
          
          // 사용자가 없으면 자동으로 생성 시도
          if (profileResponse.reason.message?.includes('사용자를 찾을 수 없습니다')) {
            try {
              console.log('🔄 사용자 프로필 자동 생성 시도...');
              const session = await fetchAuthSession();
              const cognitoUser = session.tokens?.idToken?.payload;
              
              if (cognitoUser) {
                const newUserData = {
                  user_id: cognitoUser.sub as string,
                  email: cognitoUser.email as string,
                  name: cognitoUser.name as string || cognitoUser.email as string,
                  onboarding_completed: false
                };
                
                const createdUser = await userApi.createProfile(newUserData);
                setUserProfile(createdUser.user);
                console.log('✅ 사용자 프로필 자동 생성 성공:', createdUser.user);
              }
            } catch (createError) {
              console.error('❌ 사용자 프로필 자동 생성 실패:', createError);
            }
          }
        }

        // 오늘 스케줄
        if (scheduleResponse.status === 'fulfilled') {
          const schedules = scheduleResponse.value.schedules;
          setTodaySchedule(schedules.length > 0 ? schedules[0] : null);
        } else {
          console.error('❌ 스케줄 로드 실패:', scheduleResponse.reason);
        }

        // 수면 계획
        if (sleepPlanResponse.status === 'fulfilled') {
          setSleepPlan(sleepPlanResponse.value.sleep_plan);
        } else {
          console.error('❌ 수면 계획 로드 실패:', sleepPlanResponse.reason);
        }

        // 피로 위험도
        if (fatigueResponse.status === 'fulfilled') {
          setFatigueAssessment(fatigueResponse.value.assessment);
        } else {
          console.error('❌ 피로 위험도 로드 실패:', fatigueResponse.reason);
        }

        // 카페인 컷오프
        if (caffeineResponse.status === 'fulfilled') {
          const plan = caffeineResponse.value.caffeine_plan;
          if (plan?.cutoff_time) {
            setCaffeineCutoff(plan.cutoff_time);
          }
        } else {
          console.error('❌ 카페인 계획 로드 실패:', caffeineResponse.reason);
        }

      } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [userId, userLoading, today]);

  const handleLogout = async () => {
    try {
      await authSignOut();
      // 로그아웃 후 로그아웃 홈 화면으로 이동
      onNavigate("home-loggedout");
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  // 로딩 상태
  if (userLoading || loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F8F9FD]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600 font-bold">데이터를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  // 스케줄 정보 포맷팅
  const getScheduleInfo = () => {
    if (!todaySchedule) return { label: "휴무", time: "오늘은 쉬는 날입니다" };
    
    // 사용자의 work_type에 맞지 않는 shift_type 필터링
    let effectiveShiftType = todaySchedule.shift_type;
    if (userProfile && !isValidShiftType(userProfile.work_type, todaySchedule.shift_type)) {
      console.warn(`⚠️ 홈 화면: ${todaySchedule.shift_type}는 ${userProfile.work_type}에서 허용되지 않는 타입입니다. "휴무"로 표시합니다.`);
      effectiveShiftType = 'off';
    }
    
    // 교대 타입 레이블 가져오기
    const label = SHIFT_TYPE_FULL_LABELS[effectiveShiftType as keyof typeof SHIFT_TYPE_FULL_LABELS] || "근무";
    
    // 휴무인 경우
    if (effectiveShiftType === 'off') {
      return { label, time: "오늘은 쉬는 날입니다" };
    }
    
    // 시간 정보가 있는 경우 HH:MM 형식으로 포맷팅
    if (todaySchedule.start_time && todaySchedule.end_time) {
      const startTime = formatTimeToHHMM(todaySchedule.start_time);
      const endTime = formatTimeToHHMM(todaySchedule.end_time);
      return { label, time: `${startTime} ~ ${endTime}` };
    }
    
    // 시간 정보가 없는 경우
    return { label, time: "시간 미정" };
  };

  // 수면창 정보 포맷팅
  const getSleepWindow = () => {
    if (!sleepPlan) return "수면 계획 없음";
    const startTime = sleepPlan.main_sleep_start.includes('T') 
      ? new Date(sleepPlan.main_sleep_start).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
      : sleepPlan.main_sleep_start;
    const endTime = sleepPlan.main_sleep_end.includes('T')
      ? new Date(sleepPlan.main_sleep_end).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
      : sleepPlan.main_sleep_end;
    return `${startTime} – ${endTime}`;
  };

  // 피로 위험도 정보
  const getFatigueInfo = () => {
    if (!fatigueAssessment) return { level: "알 수 없음", riskLevel: "medium" as const };
    
    const levelLabels = {
      low: "낮음",
      medium: "중간", 
      high: "높음"
    };

    return {
      level: levelLabels[fatigueAssessment.risk_level],
      riskLevel: fatigueAssessment.risk_level
    };
  };

  const scheduleInfo = getScheduleInfo();
  const fatigueInfo = getFatigueInfo();

  // 점프스타트 진행률 계산 (더미 데이터 사용)
  const getJumpstartProgress = () => {
    const totalTasks = dummyJumpstartBlocks.reduce((sum, block) => sum + block.total_tasks, 0);
    const completedTasks = dummyJumpstartBlocks.reduce((sum, block) => sum + block.completed_tasks, 0);
    const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    
    return { completed: completedTasks, total: totalTasks, percentage };
  };

  const jumpstartProgress = getJumpstartProgress();

  // 카페인 컷오프 시간 포맷팅
  const getCaffeineDisplay = () => {
    if (!caffeineCutoff) return "계산 중...";
    
    // HH:MM 형식으로 표시
    if (caffeineCutoff.includes('T')) {
      return new Date(caffeineCutoff).toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    }
    return caffeineCutoff;
  };
  
  return (
    <div className="h-full flex flex-col bg-[#F8F9FD]">
      {/* 전체 페이지를 스크롤 가능하게 변경 */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* Header - 이제 스크롤과 함께 움직임 */}
        <div className="px-7 pt-4 pb-6 bg-white rounded-b-[32px] shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-gray-400 text-[12px] font-black mb-1 uppercase tracking-widest">
              {new Date().toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                weekday: 'short'
              }).replace(/\./g, '. ').toUpperCase()}
            </div>
            <h1 className="text-[26px] font-black tracking-tight">
              안녕하세요, <br></br> {userProfile?.name || cognitoUserName || '사용자'}님
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* 프로필 이동 */}
            <button
              onClick={() => onNavigate("profile")}
              className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner hover:bg-gray-100"
              aria-label="프로필"
              title="프로필"
            >
              👤
            </button>
          </div>
        </div>

          <div className="flex items-center gap-4 p-4 bg-[#F8F7FF] rounded-[24px] border border-indigo-50 shadow-sm">
            <div className="w-11 h-11 bg-[#5843E4] rounded-2xl flex items-center justify-center shadow-lg shadow-[#5843E4]/20">
              <Moon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-black text-gray-900">오늘의 스케줄: {scheduleInfo.label}</div>
              <div className="text-[12px] text-gray-400 font-bold">{scheduleInfo.time}</div>
            </div>
          </div>
        </div>

        {/* Content - 헤더와 함께 스크롤됨 */}
        <div className="px-7 pt-7 space-y-5">
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate("plan")}
          className="bg-gradient-to-br from-[#5843E4] to-[#7D6DF2] rounded-[32px] p-7 text-white shadow-2xl shadow-[#5843E4]/30 cursor-pointer"
        >
          <div className="text-[14px] opacity-80 font-bold mb-1">권장 수면창</div>
          <div className="text-[30px] font-black mb-6 tracking-tight">{getSleepWindow()}</div>
          <div className="h-[1px] bg-white/20 mb-6" />
          <div className="flex justify-between items-center text-[13.5px] font-black">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 opacity-70" />
              <span>상세 플랜 보기</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70" />
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate("caffeine-cutoff")}
            className="bg-white p-5 rounded-[30px] shadow-sm border border-gray-50 cursor-pointer"
          >
            <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
              <Coffee className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-[12px] text-gray-400 font-black mb-1">카페인 컷오프</div>
            <div className="text-[18px] font-black text-gray-900">{getCaffeineDisplay()}</div>
          </motion.div>

          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate("fatigue-risk-score")}
            className="bg-white p-5 rounded-[30px] shadow-sm border border-gray-50 cursor-pointer"
          >
            <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="text-[12px] text-gray-400 font-black mb-1">피로 위험도</div>
            <div className="flex items-center gap-2">
              <div className="text-[18px] font-black text-gray-900">{fatigueInfo.level}</div>
              <RiskBadge level={fatigueInfo.riskLevel} />
            </div>
          </motion.div>
        </div>

          {/* 점프스타트 섹션 */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate("daily-jumpstart")}
            className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50 cursor-pointer active:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <ListChecks className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-[16px] font-black tracking-tight">오늘의 점프스타트</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-4">
              {/* 진행률 표시 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] font-bold text-gray-600">
                    전체 진행률
                  </span>
                  <span className="text-[13px] font-black text-indigo-600">
                    {jumpstartProgress.percentage}%
                  </span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${jumpstartProgress.percentage}%` }}
                  />
                </div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">
                  {jumpstartProgress.completed} / {jumpstartProgress.total} 작업 완료
                </div>
              </div>

              {/* 블록 요약 */}
              <div className="space-y-2">
                {dummyJumpstartBlocks.map((block) => {
                  const blockProgress = block.total_tasks === 0 ? 0 : Math.round((block.completed_tasks / block.total_tasks) * 100);
                  
                  return (
                    <div
                      key={block.id}
                      className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        {block.completed_tasks === block.total_tasks && block.total_tasks > 0 ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        )}
                        <div>
                          <div className="text-[13px] font-bold text-gray-900">
                            {block.block_name}
                          </div>
                          <div className="text-[11px] text-gray-400 font-bold">
                            {block.completed_tasks}/{block.total_tasks} 완료 · {block.total_duration}분
                          </div>
                        </div>
                      </div>
                      <div className="text-[12px] font-black text-gray-400">
                        {blockProgress}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <BottomNav active="home" onNavigate={onNavigate} />
    </div>
  );
}

