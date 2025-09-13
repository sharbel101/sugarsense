import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import Header from '@/components/Header/Header';
import Sidebar from '@/components/Sidebar/Sidebar';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
}

export const Page: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const newUserMessage: Message = {
        id: Date.now(),
        text: inputText,
        isUser: true,
      };

      setMessages([...messages, newUserMessage]);
      setInputText('');

      // Simulate bot response
      setTimeout(() => {
        const botResponse: Message = {
          id: Date.now() + 1,
          text: 'This is a sample bot response.',
          isUser: false,
        };
        setMessages(prev => [...prev, botResponse]);
      }, 1000);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex flex-1 flex-col pt-16">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="mx-auto max-w-3xl w-full space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  text={message.text}
                  isUser={message.isUser}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <div className="border-t bg-white p-4">
            <div className="mx-auto max-w-3xl">
              <ChatInput
                value={inputText}
                onChange={setInputText}
                onSend={handleSendMessage}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};