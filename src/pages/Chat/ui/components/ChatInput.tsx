import React, { useRef } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSelectImage: (image: File) => void;
  onRemoveImage: () => void;
  hasPendingImage: boolean;
  imagePreviewUrl?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onSelectImage,
  onRemoveImage,
  hasPendingImage,
  imagePreviewUrl,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isSendDisabled = !value.trim() && !hasPendingImage;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSendDisabled) return;
    onSend();
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onSelectImage(file);
      event.target.value = '';
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (isSendDisabled) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      onSend();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 rounded-3xl bg-white/95 px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-lg"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      {imagePreviewUrl && (
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-inner">
          <img
            src={imagePreviewUrl}
            alt="Selected preview"
            className="h-14 w-14 rounded-xl object-cover"
          />
          <button
            type="button"
            onClick={onRemoveImage}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-200"
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCameraClick}
          aria-label="Upload an image"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 shadow-inner transition-transform duration-150 hover:bg-gray-200 active:scale-95"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
          >
            <path d="M12 9.75a3 3 0 100 6 3 3 0 000-6z" />
            <path
              fillRule="evenodd"
              d="M4.5 5.25A2.25 2.25 0 012.25 7.5v9a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H16.1a1.5 1.5 0 01-1.3-.75l-.412-.72A1.5 1.5 0 0012.81 3h-1.62a1.5 1.5 0 00-1.579.78l-.41.72a1.5 1.5 0 01-1.3.75H4.5zM12 8.25a4.5 4.5 0 100 9 4.5 4.5 0 000-9z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 shadow-inner focus-within:border-green-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-green-400/50">
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasPendingImage ? 'Add a comment' : 'Type your message...'}
            className="flex-1 bg-transparent text-base leading-tight text-slate-900 outline-none"
            style={{ fontSize: '16px', WebkitAppearance: 'none' }}
            autoComplete="sentences"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck
            enterKeyHint="send"
          />

          <button
            type="submit"
            aria-label="Send message"
            disabled={isSendDisabled}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform duration-150 ${
              isSendDisabled
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 active:scale-95 shadow-lg'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
};



