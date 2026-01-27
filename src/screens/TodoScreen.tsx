import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAroma } from '../context/AromaContext';
import { TodoItem } from '../types';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Trash2,
  Timer,
  Play,
  Pause
} from 'lucide-react';

const TodoScreen: React.FC = () => {
  const { currentTheme } = useAroma();
  const [todos, setTodos] = useState<TodoItem[]>([
    {
      id: 1,
      title: '환자 차트 검토',
      completed: false,
      priority: 'high',
      estimatedTime: 30,
      category: '업무'
    },
    {
      id: 2,
      title: '가벼운 스트레칭',
      completed: true,
      priority: 'medium',
      estimatedTime: 15,
      category: '건강'
    },
    {
      id: 3,
      title: '수면 일지 작성',
      completed: false,
      priority: 'medium',
      estimatedTime: 10,
      category: '건강'
    },
    {
      id: 4,
      title: '동료 준비 상황',
      completed: false,
      priority: 'low',
      estimatedTime: 60,
      category: '업무'
    }
  ]);

  const [newTodo, setNewTodo] = useState<string>('');
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const addTodo = (): void => {
    if (newTodo.trim()) {
      const todo: TodoItem = {
        id: Date.now(),
        title: newTodo,
        completed: false,
        priority: 'medium',
        estimatedTime: 30,
        category: '기타'
      };
      setTodos([...todos, todo]);
      setNewTodo('');
    }
  };

  const toggleTodo = (id: number): void => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number): void => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const startTimer = (todo: TodoItem): void => {
    setActiveTimer(todo.id);
    setTimeRemaining(todo.estimatedTime * 60); // 분을 초로 변환
    setIsTimerRunning(true);
  };

  const stopTimer = (): void => {
    setIsTimerRunning(false);
    setActiveTimer(null);
    setTimeRemaining(0);
  };

  const getPriorityColor = (priority: TodoItem['priority']): string => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-chamomile-600';
      case 'low': return 'text-mint-600';
      default: return 'text-soft-gray-500';
    }
  };

  const getPriorityBg = (priority: TodoItem['priority']): string => {
    switch (priority) {
      case 'high': return 'bg-red-100';
      case 'medium': return 'bg-chamomile-100';
      case 'low': return 'bg-mint-100';
      default: return 'bg-soft-gray-100';
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 타이머 로직
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            setIsTimerRunning(false);
            setActiveTimer(null);
            // 완료 처리
            if (activeTimer) {
              toggleTodo(activeTimer);
            }
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining, activeTimer]);

  const completedCount = todos.filter(todo => todo.completed).length;
  const totalEstimatedTime = todos
    .filter(todo => !todo.completed)
    .reduce((total, todo) => total + todo.estimatedTime, 0);

  const TodoItemComponent: React.FC<{ todo: TodoItem }> = ({ todo }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`soft-card p-4 ${todo.completed ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center space-x-3">
        <button
          onClick={() => toggleTodo(todo.id)}
          className="flex-shrink-0"
        >
          {todo.completed ? (
            <CheckCircle2 size={24} className="text-mint-600" />
          ) : (
            <Circle size={24} className="text-soft-gray-400 hover:text-mint-600 transition-colors" />
          )}
        </button>

        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className={`font-medium ${todo.completed ? 'line-through text-soft-gray-500' : 'text-soft-gray-800'}`}>
              {todo.title}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs ${getPriorityBg(todo.priority)} ${getPriorityColor(todo.priority)}`}>
              {todo.priority === 'high' ? '높음' : todo.priority === 'medium' ? '보통' : '낮음'}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-soft-gray-600">
            <div className="flex items-center space-x-1">
              <Clock size={14} />
              <span>{todo.estimatedTime}분</span>
            </div>
            <span>{todo.category}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!todo.completed && (
            <button
              onClick={() => activeTimer === todo.id ? stopTimer() : startTimer(todo)}
              className={`p-2 rounded-lg transition-colors ${
                activeTimer === todo.id 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'bg-lavender-100 text-lavender-600 hover:bg-lavender-200'
              }`}
            >
              {activeTimer === todo.id ? <Pause size={16} /> : <Play size={16} />}
            </button>
          )}
          <button
            onClick={() => deleteTodo(todo.id)}
            className="p-2 rounded-lg bg-soft-gray-100 text-soft-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {activeTimer === todo.id && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-soft-gray-200"
        >
          <div className="flex items-center justify-center space-x-4">
            <Timer size={20} className="text-lavender-600" />
            <span className="text-2xl font-mono font-medium text-soft-gray-800">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-medium text-soft-gray-800 mb-2">오늘의 집중스타트</h1>
        <p className="text-soft-gray-600">구조화된 업무 관리로 집중력을 높여보세요</p>
      </motion.div>

      {/* 통계 카드 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="soft-card p-6 bg-gradient-to-r from-lavender-50 to-mint-50"
      >
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-2xl font-light text-soft-gray-800">{completedCount}</p>
            <p className="text-sm text-soft-gray-600">완료된 작업</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-light text-soft-gray-800">{todos.length - completedCount}</p>
            <p className="text-sm text-soft-gray-600">남은 작업</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-light text-soft-gray-800">{totalEstimatedTime}분</p>
            <p className="text-sm text-soft-gray-600">예상 소요시간</p>
          </div>
        </div>
      </motion.div>

      {/* Must-do 섹션 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="soft-card p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Clock size={24} />
              <h2 className="text-lg font-medium">Must-do</h2>
            </div>
            <p className="text-blue-100">필수 실행</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">예상 시간</p>
            <p className="text-2xl font-light">90분</p>
          </div>
        </div>
        <div className="mt-4 text-sm text-blue-100">
          0 / 3 완료
        </div>
      </motion.div>

      {/* 할일 추가 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="soft-card p-4"
      >
        <div className="flex space-x-3">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="새로운 할일을 추가하세요..."
            className="flex-1 px-4 py-2 rounded-xl border border-soft-gray-200 focus:outline-none focus:ring-2 focus:ring-lavender-300 focus:border-transparent"
          />
          <button
            onClick={addTodo}
            className="p-2 rounded-xl bg-lavender-200 hover:bg-lavender-300 transition-colors"
          >
            <Plus size={20} className="text-lavender-700" />
          </button>
        </div>
      </motion.div>

      {/* 할일 목록 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <AnimatePresence>
          {todos.map((todo) => (
            <TodoItemComponent key={todo.id} todo={todo} />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default TodoScreen;