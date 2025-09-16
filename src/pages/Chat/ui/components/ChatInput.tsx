import React, { useRef } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendImage: (image: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onSendImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      onSendImage(imageUrl);
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-white">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && onSend()}
        className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
        placeholder="Type your message..."
        style={{ WebkitAppearance: 'none' }}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <button
        onClick={handleCameraClick}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-600 shadow-md transition-all hover:bg-gray-300 active:transform active:scale-95"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6"
        >
          <path d="M12 12.75a3 3 0 100-6 3 3 0 000 6z" />
          <path
            fillRule="evenodd"
            d="M2.25 5.625A3.375 3.375 0 015.625 2.25h12.75c1.86 0 3.375 1.515 3.375 3.375v10.5c0 1.86-1.515 3.375-3.375 3.375H5.625A3.375 3.375 0 012.25 16.125v-10.5zM5.625 3.75c-.98 0-1.774.753-1.868 1.718L3.75 5.625v10.5c0 .98.753 1.774 1.718 1.868l.157.007h12.75c.98 0 1.774-.753 1.868-1.718L20.25 16.125v-10.5c0-.98-.753-1.774-1.718-1.868l-.157-.007H5.625z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <button
        onClick={onSend}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-md transition-all hover:bg-green-600 active:transform active:scale-95"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
      </button>
    </div>
  );
};