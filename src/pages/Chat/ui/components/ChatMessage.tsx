import React from 'react';

interface ChatMessageProps {
  text?: string | JSX.Element[];
  isUser: boolean;
  image?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  text,
  isUser,
  image,
}) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] break-words p-3 shadow-sm ${
          isUser
            ? 'bg-green-500 text-white rounded-t-2xl rounded-l-2xl rounded-br-lg'
            : 'bg-green-100 text-green-800 rounded-t-2xl rounded-r-2xl rounded-bl-lg'
        } md:max-w-[70%]`}>
        {text && (typeof text === 'string' ? <p>{text}</p> : text)}
        {image && <img src={image} alt="User upload" className="rounded-lg" />}
      </div>
    </div>
  );
};