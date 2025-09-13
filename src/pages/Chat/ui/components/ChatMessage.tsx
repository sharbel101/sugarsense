import React from 'react';

interface ChatMessageProps {
  text: string;
  isUser: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ text, isUser }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] break-words p-3 shadow-sm ${
          isUser
            ? 'bg-green-500 text-white rounded-t-2xl rounded-l-2xl rounded-br-lg'
            : 'bg-white text-gray-800 rounded-t-2xl rounded-r-2xl rounded-bl-lg'
        } md:max-w-[70%]`}
      >
        {text}
      </div>
    </div>
  );
};