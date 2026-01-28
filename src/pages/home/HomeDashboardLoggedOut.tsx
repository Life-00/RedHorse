// src/pages/home/HomeDashboardLoggedOut.tsx
import { Moon, Sun, Calendar, TrendingUp, Shield, Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import MobileFrame from '../../components/layout/MobileFrame';
import BottomNav from '../../components/layout/BottomNav';
import type { ScreenType } from "../../types/app";

type Props = {
  onNavigate: (s: ScreenType) => void;
};

export default function HomeDashboardLoggedOut({ onNavigate }: Props) {
  const features = [
    {
      icon: Moon,
      title: '수면 최적화',
      description: '근무에 맞춘 수면 창 제안',
      color: 'from-indigo-500 to-purple-600',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      icon: Zap,
      title: '카페인 관리',
      description: '마지막 섭취 시간 계산',
      color: 'from-amber-400 to-orange-500',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      icon: Shield,
      title: '피로도 평가',
      description: '안전사고 위험도 측정',
      color: 'from-rose-400 to-pink-500',
      bgColor: 'bg-rose-50',
      iconColor: 'text-rose-600',
    },
  ];

  const benefits = [
    '과학적 근거 기반 생체리듬 최적화',
    '교대근무자 맞춤 수면/식사 플랜',
    '웨어러블 연동 수면 품질 분석',
    '명상 & 이완 프로그램 제공',
  ];

  return (
    
      <div className="h-full flex flex-col">
        {/* Hero Section */}
        <div className="px-6 pt-6 pb-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <div className="mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold mb-3">
              교대근무의<br />새로운 기준
            </h1>
            <p className="text-indigo-100 text-sm">
              과학적 근거로 당신의 생체리듬을 최적화합니다
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button 
              onClick={() => onNavigate("signup")}
              className="w-full bg-white text-indigo-600 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2"
            >
              <span>무료로 시작하기</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onNavigate("login")}
              className="w-full bg-white/20 backdrop-blur-sm text-white py-3 rounded-full font-medium border border-white/30 hover:bg-white/30 transition-colors"
            >
              로그인
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="flex-1 px-6 py-6 overflow-y-auto pb-32">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">핵심 기능</h2>
          <div className="space-y-3 mb-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${feature.bgColor} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-7 h-7 ${feature.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">{feature.title}</div>
                      <div className="text-sm text-gray-500">{feature.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Benefits */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">이런 점이 좋아요</h2>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 mb-8">
            <div className="space-y-3">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
              <div className="text-2xl font-semibold text-indigo-600 mb-1">95%</div>
              <div className="text-xs text-gray-600">수면 개선</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
              <div className="text-2xl font-semibold text-indigo-600 mb-1">12K+</div>
              <div className="text-xs text-gray-600">활성 사용자</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
              <div className="text-2xl font-semibold text-indigo-600 mb-1">4.8</div>
              <div className="text-xs text-gray-600">앱 평점</div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                김
              </div>
              <div>
                <div className="font-medium text-gray-900">김민지</div>
                <div className="text-xs text-gray-500">간호사, 3년차</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              "야간 근무 후 낮잠 타이밍을 제대로 못 잡아서 힘들었는데, 이 앱 덕분에 수면 패턴이 안정되었어요. 피로감이 확실히 줄었습니다."
            </p>
          </div>

          {/* Final CTA */}
          <div className="mt-8 text-center">
            <button 
              onClick={() => onNavigate("signup")}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow"
            >
              지금 무료로 시작하기
            </button>
            <p className="text-xs text-gray-500 mt-3">
              신용카드 등록 불필요 • 언제든 취소 가능
            </p>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav active="home" onNavigate={onNavigate} />
      </div>
    
  );
}
