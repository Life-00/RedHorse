// src/pages/profile/ProfilePage.tsx
import { useState, useEffect } from "react";
import { User, Mail, Briefcase, Clock, Watch, ChevronRight, LogOut, Edit2, Check, X } from "lucide-react";
import type { ScreenType } from "../../types/app";
import BottomNav from "../../components/layout/BottomNav";
import { userApi } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useApi";
import { fetchAuthSession } from "aws-amplify/auth";
import type { UserProfile } from "../../types/api";

type Props = {
  onNavigate: (s: ScreenType) => void;
  onLogout: () => void;
};

export default function ProfilePage({ onNavigate, onLogout }: Props) {
  const { userId, loading: userLoading } = useCurrentUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [cognitoEmail, setCognitoEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 사용자 정보 로드
  useEffect(() => {
    if (!userId || userLoading) return;

    const loadUserProfile = async () => {
      try {
        setLoading(true);

        // Cognito 정보 가져오기
        try {
          const session = await fetchAuthSession();
          const cognitoUser = session.tokens?.idToken?.payload;
          if (cognitoUser?.email) {
            setCognitoEmail(cognitoUser.email as string);
          }
        } catch (error) {
          console.error('Cognito 정보 가져오기 실패:', error);
        }

        // 데이터베이스에서 프로필 가져오기
        const response = await userApi.getProfile(userId);
        setUserProfile(response.user);
        setEditedName(response.user.name || '');
      } catch (error) {
        console.error('프로필 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [userId, userLoading]);

  const handleSaveName = async () => {
    if (!userId || !editedName.trim()) return;

    try {
      setIsSaving(true);
      const response = await userApi.updateProfile(userId, { name: editedName.trim() });
      setUserProfile(response.user);
      setIsEditingName(false);
    } catch (error) {
      console.error('이름 변경 실패:', error);
      alert('이름 변경에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const workTypeLabels: Record<string, string> = {
    '2shift': '2교대',
    '3shift': '3교대',
    'fixed_night': '고정 야간',
    'irregular': '불규칙'
  };

  if (loading || userLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F8F9FD]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600 font-bold">프로필을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#F8F9FD]">
      {/* Header */}
      <div className="px-7 pt-6 pb-6 bg-white rounded-b-[32px] shadow-sm border-b border-gray-100">
        <h1 className="text-[24px] font-black text-[#1A1A1A] mb-1">내 정보</h1>
        <p className="text-[14px] text-gray-400 font-bold">
          프로필 및 설정 관리
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-7 pt-6 pb-36 space-y-4 overflow-y-auto">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-[28px] p-6 shadow-sm border border-gray-50">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#5843E4] to-[#7D6DF2] rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/30">
              {userProfile?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-indigo-300 rounded-xl text-[16px] font-bold focus:outline-none focus:border-indigo-500"
                    placeholder="이름 입력"
                    disabled={isSaving}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={isSaving || !editedName.trim()}
                    className="p-2 bg-indigo-600 text-white rounded-xl disabled:opacity-50"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false);
                      setEditedName(userProfile?.name || '');
                    }}
                    disabled={isSaving}
                    className="p-2 bg-gray-200 text-gray-700 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-[20px] font-black text-gray-900">
                    {userProfile?.name || '이름 없음'}
                  </h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
              <p className="text-[13px] text-gray-400 font-bold mt-1">
                {cognitoEmail || userProfile?.email || '이메일 없음'}
              </p>
            </div>
          </div>
        </div>

        {/* 근무 정보 */}
        <div className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-50">
          <h3 className="text-[15px] font-black text-gray-900 mb-4">근무 정보</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="text-[12px] text-gray-400 font-bold">근무 형태</div>
                <div className="text-[14px] font-black text-gray-900">
                  {workTypeLabels[userProfile?.work_type || ''] || '미설정'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="text-[12px] text-gray-400 font-bold">출퇴근 시간</div>
                <div className="text-[14px] font-black text-gray-900">
                  {userProfile?.commute_time ? `${userProfile.commute_time}분` : '미설정'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Watch className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-[12px] text-gray-400 font-bold">웨어러블 기기</div>
                <div className="text-[14px] font-black text-gray-900">
                  {userProfile?.wearable_device === 'none' ? '없음' : userProfile?.wearable_device || '미설정'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 계정 관리 */}
        <div className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-50">
          <h3 className="text-[15px] font-black text-gray-900 mb-4">계정 관리</h3>
          <div className="space-y-2">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-[14px] font-bold text-gray-900">로그아웃</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        {/* 앱 정보 */}
        <div className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-50">
          <h3 className="text-[15px] font-black text-gray-900 mb-4">앱 정보</h3>
          <div className="space-y-2 text-[13px] text-gray-500 font-medium">
            <div className="flex justify-between">
              <span>버전</span>
              <span className="font-bold text-gray-700">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>온보딩 완료</span>
              <span className="font-bold text-gray-700">
                {userProfile?.onboarding_completed ? '완료' : '미완료'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  );
}
