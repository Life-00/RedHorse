import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAroma } from '../context/AromaContext';
import { WhiteNoiseTrack } from '../types';
import { 
  Play, 
  Pause, 
  Volume2, 
  Clock,
  Repeat,
  SkipForward,
  SkipBack
} from 'lucide-react';

const WhiteNoiseScreen: React.FC = () => {
  const { currentTheme } = useAroma();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<WhiteNoiseTrack | null>(null);
  const [volume, setVolume] = useState<number>(70);
  const [duration, setDuration] = useState<number>(30); // 분 단위
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<WhiteNoiseTrack['category']>('nature');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const tracks: WhiteNoiseTrack[] = [
    {
      id: 1,
      name: '빗소리',
      description: '부드러운 빗방울 소리',
      duration: 0, // 무한 반복
      url: '/sounds/rain.mp3',
      category: 'nature'
    },
    {
      id: 2,
      name: '파도소리',
      description: '잔잔한 파도가 밀려오는 소리',
      duration: 0,
      url: '/sounds/waves.mp3',
      category: 'nature'
    },
    {
      id: 3,
      name: '새소리',
      description: '숲속 새들의 지저귐',
      duration: 0,
      url: '/sounds/birds.mp3',
      category: 'nature'
    },
    {
      id: 4,
      name: '카페 소음',
      description: '편안한 카페 분위기',
      duration: 0,
      url: '/sounds/cafe.mp3',
      category: 'urban'
    },
    {
      id: 5,
      name: '도서관',
      description: '조용한 도서관 환경음',
      duration: 0,
      url: '/sounds/library.mp3',
      category: 'urban'
    },
    {
      id: 6,
      name: '화이트 노이즈',
      description: '순수한 백색소음',
      duration: 0,
      url: '/sounds/whitenoise.mp3',
      category: 'ambient'
    },
    {
      id: 7,
      name: '핑크 노이즈',
      description: '부드러운 핑크 노이즈',
      duration: 0,
      url: '/sounds/pinknoise.mp3',
      category: 'ambient'
    }
  ];

  const categories = [
    { key: 'nature' as const, label: '자연' },
    { key: 'urban' as const, label: '도시' },
    { key: 'ambient' as const, label: '앰비언트' }
  ];

  const durations = [15, 30, 45, 60, 90, 120];

  const filteredTracks = tracks.filter(track => track.category === selectedCategory);

  const playTrack = (track: WhiteNoiseTrack): void => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setTimeRemaining(duration * 60); // 분을 초로 변환
    
    // 실제 오디오 재생 로직은 여기에 구현
    // audioRef.current?.play();
  };

  const togglePlayPause = (): void => {
    if (isPlaying) {
      setIsPlaying(false);
      // audioRef.current?.pause();
    } else {
      setIsPlaying(true);
      // audioRef.current?.play();
    }
  };

  const stopPlayback = (): void => {
    setIsPlaying(false);
    setCurrentTrack(null);
    setTimeRemaining(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 타이머 로직
  useEffect(() => {
    if (isPlaying && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            stopPlayback();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, timeRemaining]);

  const TrackCard: React.FC<{ track: WhiteNoiseTrack }> = ({ track }) => (
    <motion.button
      onClick={() => playTrack(track)}
      className={`soft-card p-4 text-left w-full transition-all duration-200 ${
        currentTrack?.id === track.id ? 'ring-2 ring-lavender-300 bg-lavender-50/50' : ''
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center space-x-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          currentTrack?.id === track.id && isPlaying 
            ? 'bg-lavender-200' 
            : 'bg-soft-gray-200'
        }`}>
          {currentTrack?.id === track.id && isPlaying ? (
            <Pause size={20} className="text-lavender-700" />
          ) : (
            <Play size={20} className="text-soft-gray-600" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-soft-gray-800">{track.name}</h3>
          <p className="text-sm text-soft-gray-600">{track.description}</p>
        </div>
      </div>
    </motion.button>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-medium text-soft-gray-800 mb-2">백색소음 플레이어</h1>
        <p className="text-soft-gray-600">편안한 수면을 위한 배경 사운드</p>
      </motion.div>

      {/* 현재 재생 중인 트랙 */}
      {currentTrack && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="soft-card p-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white text-center"
        >
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
              <Volume2 size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-medium mb-2">{currentTrack.name}</h2>
            <p className="text-blue-100">{currentTrack.description}</p>
          </div>

          <div className="mb-6">
            <button
              onClick={togglePlayPause}
              className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors mx-auto"
            >
              {isPlaying ? (
                <Pause size={24} className="text-white" />
              ) : (
                <Play size={24} className="text-white ml-1" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-center space-x-4 mb-4">
            <Clock size={20} className="text-blue-200" />
            <span className="text-2xl font-mono">{formatTime(timeRemaining)}</span>
          </div>

          <div className="flex items-center justify-center space-x-4">
            <span className="text-sm text-blue-200">볼륨</span>
            <div className="flex-1 max-w-32">
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <span className="text-sm text-blue-200">{volume}%</span>
          </div>
        </motion.div>
      )}

      {/* 타이머 설정 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="soft-card p-6"
      >
        <h2 className="text-lg font-medium text-soft-gray-800 mb-4">타이머 설정</h2>
        <div className="flex flex-wrap gap-2">
          {durations.map((dur) => (
            <button
              key={dur}
              onClick={() => setDuration(dur)}
              className={`px-4 py-2 rounded-xl transition-colors ${
                duration === dur
                  ? 'bg-lavender-200 text-lavender-800'
                  : 'bg-soft-gray-100 text-soft-gray-600 hover:bg-soft-gray-200'
              }`}
            >
              {dur}분
            </button>
          ))}
        </div>
      </motion.div>

      {/* 카테고리 선택 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex space-x-2"
      >
        {categories.map((category) => (
          <button
            key={category.key}
            onClick={() => setSelectedCategory(category.key)}
            className={`px-4 py-2 rounded-xl transition-colors ${
              selectedCategory === category.key
                ? 'bg-lavender-200 text-lavender-800'
                : 'bg-soft-gray-100 text-soft-gray-600 hover:bg-soft-gray-200'
            }`}
          >
            {category.label}
          </button>
        ))}
      </motion.div>

      {/* 사운드 선택 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <h2 className="text-lg font-medium text-soft-gray-800">사운드 선택</h2>
        <div className="grid gap-3">
          {filteredTracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      </motion.div>

      {/* 숨겨진 오디오 엘리먼트 */}
      <audio ref={audioRef} loop />
    </div>
  );
};

export default WhiteNoiseScreen;