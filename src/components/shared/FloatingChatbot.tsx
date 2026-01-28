// src/components/shared/FloatingChatbot.tsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import { aiApi } from "../../lib/api";
import { useCurrentUser } from "../../hooks/useApi";

interface ChatMessage {
  id: number;
  message: string;
  response: string;
  created_at: string;
}

export default function FloatingChatbot() {
  const { userId } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 채팅 기록 로드
  useEffect(() => {
    if (isOpen && userId && messages.length === 0) {
      loadChatHistory();
    }
  }, [isOpen, userId]);

  // 메시지 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async () => {
    if (!userId) return;
    
    try {
      const response = await aiApi.getChatHistory(userId, 10);
      setMessages(response.chat_history.reverse());
    } catch (error) {
      console.error('채팅 기록 로드 실패:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !userId || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await aiApi.chatWithAI(userId, userMessage);
      setMessages(prev => [...prev, response.chat]);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    "야간 근무 후 수면 팁",
    "카페인 언제까지?",
    "피로도 높을 때",
    "명상 추천"
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 플로팅 버튼 - 네비게이션 바로 위 */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="absolute bottom-[110px] right-6 z-40 w-14 h-14 bg-gradient-to-br from-[#5843E4] to-[#7D6DF2] rounded-full shadow-2xl shadow-indigo-500/50 flex items-center justify-center text-white pointer-events-auto"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 챗봇 창 - 네비게이션 위에 표시 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-[110px] right-6 z-40 w-[calc(100%-3rem)] max-w-[340px] h-[500px] bg-white rounded-[32px] shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
          >
            {/* 헤더 */}
            <div className="bg-gradient-to-br from-[#5843E4] to-[#7D6DF2] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-black text-[18px]">생체리듬 도우미</h3>
                  <p className="text-white/80 text-[12px] font-bold">온라인</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-indigo-600" />
                  </div>
                  <p className="text-gray-600 font-bold text-[14px]">
                    안녕하세요! 생체리듬 최적화 도우미입니다.<br />
                    무엇을 도와드릴까요?
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className="space-y-3">
                  {/* 사용자 메시지 */}
                  <div className="flex justify-end">
                    <div className="bg-indigo-600 text-white px-4 py-3 rounded-[20px] rounded-tr-sm max-w-[80%] font-medium text-[14px]">
                      {msg.message}
                    </div>
                  </div>

                  {/* AI 응답 */}
                  <div className="flex justify-start">
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#5843E4] to-[#7D6DF2] rounded-xl flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white px-4 py-3 rounded-[20px] rounded-tl-sm shadow-sm border border-gray-100 font-medium text-[14px] text-gray-700">
                        {msg.response}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#5843E4] to-[#7D6DF2] rounded-xl flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white px-4 py-3 rounded-[20px] rounded-tl-sm shadow-sm border border-gray-100">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 빠른 질문 */}
            {messages.length === 0 && !isLoading && (
              <div className="px-6 py-4 bg-white border-t border-gray-100">
                <p className="text-[12px] text-gray-400 font-bold mb-3">빠른 질문</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputMessage(question);
                      }}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-[13px] font-bold hover:bg-indigo-100 transition"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 입력 영역 */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 px-4 py-3 bg-gray-50 rounded-[20px] border border-gray-200 focus:outline-none focus:border-indigo-300 text-[14px] font-medium"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="w-12 h-12 bg-gradient-to-br from-[#5843E4] to-[#7D6DF2] rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
