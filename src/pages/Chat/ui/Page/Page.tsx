import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ChatMessage, Message } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import Header from '@/components/Header/Header';
import Sidebar from '@/components/Sidebar/Sidebar';
import { getBotResponse } from '../../botMessages';
import { analyzeFoodImage } from '../utils/messageService';
import { FoodData, renderFoodData } from '../utils/nutrition';
import { clearUserFromStorage } from '@/features/user/userStorage';
import { resetUser } from '@/features/user/userSlice';
import { supabase } from '@/api/supabaseClient';

const isFoodData = (value: Message['text']): value is FoodData => {
  return (
    !!value &&
    typeof value === 'object' &&
    'items' in value &&
    'totalCarbs' in value
  );
};

export const Page: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMorningMode, setIsMorningMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectImage = (imageFile: File) => {
    setPendingImage((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return {
        file: imageFile,
        previewUrl: URL.createObjectURL(imageFile),
      };
    });
  };

  const handleRemovePendingImage = () => {
    setPendingImage((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  };

  const applyMorningModeToLatestFoodMessage = (mode: boolean) => {
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i -= 1) {
        const msg = next[i];
        if (isFoodData(msg.text)) {
          next[i] = { ...msg, text: { ...msg.text, isMorningMode: mode } };
          break;
        }
      }
      return next;
    });
  };

  const handleToggleMorningMode = () => {
    setIsMorningMode((prev) => {
      const next = !prev;
      applyMorningModeToLatestFoodMessage(next);
      return next;
    });
  };

  const handleSendMessage = async () => {
    const trimmedText = inputText.trim();

    if (pendingImage) {
      const { file, previewUrl } = pendingImage;
      const messageIdBase = Date.now();
      const newUserMessage: Message = {
        id: messageIdBase,
        isUser: true,
        image: previewUrl,
        ...(trimmedText ? { text: trimmedText } : {}),
      };

      const loadingMsgId = messageIdBase + 1;
      const loadingMsg: Message = {
        id: loadingMsgId,
        isUser: false,
        text: 'Analyzing image...',
      };

      setMessages((prev) => [...prev, newUserMessage, loadingMsg]);
      setInputText('');
      setPendingImage(null);

      try {
        const formattedResponse = await analyzeFoodImage(file, trimmedText, isMorningMode);

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMsgId ? { ...msg, text: formattedResponse } : msg
          )
        );
      } catch (error) {
        console.error('[Page.tsx] handleSendMessage: Error getting prediction:', error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMsgId
              ? { ...msg, text: "Sorry, I couldn't analyze the image. Please try again." }
              : msg
          )
        );
      }

      return;
    }

    if (!trimmedText) {
      return;
    }

    const userMessageText = trimmedText;
    const newUserMessage: Message = {
      id: Date.now(),
      text: userMessageText,
      isUser: true,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputText('');

    setTimeout(() => {
      const botResponseText = getBotResponse(userMessageText);
      const botResponse: Message = {
        id: Date.now() + 1,
        text: botResponseText,
        isUser: false,
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  const handleUpdateMessage = (messageId: number, newText: FoodData) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, text: newText } : msg
      )
    );
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <Header onToggleSidebar={() => setIsSidebarOpen((s) => !s)} />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={(): void => {
          console.log('=== PAGE onLogout FIRED ===');
          
          // Sign out from Supabase
          console.log('1. Signing out from Supabase...');
          supabase.auth.signOut().then(() => {
            console.log('✓ Supabase sign-out successful');
          }).catch(e => {
            console.error('✗ Supabase sign-out error:', e);
          });
          
          // Reset Redux user state
          console.log('2. Dispatching resetUser...');
          try {
            dispatch(resetUser());
            console.log('✓ Redux user state reset');
          } catch (e) {
            console.error('✗ Error resetting Redux:', e);
          }
          
          // Clear local storage
          console.log('3. Clearing user storage...');
          try {
            clearUserFromStorage();
            console.log('✓ User storage cleared');
          } catch (e) {
            console.error('✗ Error clearing storage:', e);
          }
          
          // Reset UI state
          console.log('4. Resetting UI state...');
          setIsSidebarOpen(false);
          setIsMorningMode(false);
          setMessages([]);
          setInputText('');
          setPendingImage(null);
          console.log('✓ UI state reset');
          
          // Navigate to login
          console.log('5. Navigating to /login...');
          navigate('/login', { replace: true });
          console.log('=== END onLogout ===');
        }}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-20 pb-36 app-scroll" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 9rem)' }}>
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onUpdateMessage={handleUpdateMessage}
            renderFoodData={renderFoodData}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <footer className="sticky bottom-0 left-0 z-20 w-full border-t border-gray-200 bg-white/95 backdrop-blur">
        <div
          className="mx-auto flex w-full max-w-3xl px-3 pt-2"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          <ChatInput
            value={inputText}
            onChange={setInputText}
            onSend={handleSendMessage}
            onSelectImage={handleSelectImage}
            onRemoveImage={handleRemovePendingImage}
            hasPendingImage={Boolean(pendingImage)}
            imagePreviewUrl={pendingImage?.previewUrl}
            onToggleMorningMode={handleToggleMorningMode}
            isMorningMode={isMorningMode}
          />
        </div>
      </footer>
    </div>
  );
};
