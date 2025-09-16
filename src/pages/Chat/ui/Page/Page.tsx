import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import Header from '@/components/Header/Header';
import Sidebar from '@/components/Sidebar/Sidebar';
import { getBotResponse } from '../../botMessages';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
}

export const Page: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const userMessageText = inputText.trim();
      const newUserMessage: Message = {
        id: Date.now(),
        text: userMessageText,
        isUser: true,
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setInputText('');

      // Simulate bot response
      setTimeout(() => {
        const botResponseText = getBotResponse(userMessageText);
        const botResponse: Message = {
          id: Date.now() + 1,
          text: botResponseText,
          isUser: false,
        };
        setMessages((prev) => [...prev, botResponse]);
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header and Sidebar components (Header is fixed via its CSS) */}
  <Header onToggleSidebar={() => setIsSidebarOpen((s) => !s)} />
  <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Chat messages container - account for fixed header (h-16) and fixed input (approx 76px) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-20 pb-[92px]">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            text={message.text}
            isUser={message.isUser}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed input at bottom */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-2">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            value={inputText}
            onChange={setInputText}
            onSend={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
};
