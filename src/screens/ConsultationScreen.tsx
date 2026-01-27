import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import { Message } from '../types';

const ConsultationScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'bot',
      content: '안녕하세요! 교대근무 관련 궁금한 점이 있으시면 언제든 물어보세요.',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // 시뮬레이션된 봇 응답
    setTimeout(() => {
      const botMessage: Message = {
        id: messages.length + 2,
        type: 'bot',
        content: '좋은 질문이네요! 교대근무자의 수면 패턴 개선을 위해서는 일정한 수면 스케줄을 유지하는 것이 중요합니다.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const quickQuestions = [
    "수면 시간을 어떻게 조절해야 하나요?",
    "야간 근무 후 잠들기 어려워요",
    "카페인 섭취 시간이 궁금해요",
    "교대 근무 스트레스 관리법은?"
  ];

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-[#5d5cff] text-white p-6 pb-8">
        <h1 className="text-2xl font-bold mb-2">AI 상담</h1>
        <p className="text-sm opacity-80">교대근무 전문 상담사가 도와드립니다</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start gap-3 max-w-[80%] ${
              message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}>
              <div className={`p-2 rounded-full ${
                message.type === 'user' 
                  ? 'bg-[#5d5cff] text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {message.type === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-[#5d5cff] text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-gray-100 text-gray-600">
                <Bot size={16} />
              </div>
              <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-2">
                  <Loader className="animate-spin" size={16} />
                  <span className="text-sm text-gray-600">답변을 준비중...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="p-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-3">자주 묻는 질문</p>
          <div className="grid grid-cols-1 gap-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(question)}
                className="text-left p-3 bg-gray-50 rounded-xl text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="궁금한 것을 물어보세요..."
            disabled={isLoading}
            className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5d5cff] focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="p-3 rounded-xl bg-[#5d5cff] text-white hover:bg-[#4c4bcc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationScreen;