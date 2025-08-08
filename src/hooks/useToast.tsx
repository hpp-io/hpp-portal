'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ToastContextType {
  showToast: (
    title: string,
    message: string,
    type?: 'success' | 'error' | 'loading',
    link?: { text: string; url: string }
  ) => void;
  hideToast: () => void;
  isVisible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'loading';
  link?: { text: string; url: string };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'loading'>('loading');
  const [link, setLink] = useState<{ text: string; url: string } | undefined>(undefined);

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'loading' = 'loading',
    link?: { text: string; url: string }
  ) => {
    setTitle(title);
    setMessage(message);
    setType(type);
    setLink(link);
    setIsVisible(true);
  };

  const hideToast = () => {
    setIsVisible(false);
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast, isVisible, title, message, type, link }}>
      {children}
      <Toast />
    </ToastContext.Provider>
  );
}

/**
 * useToast Hook
 *
 * Custom hook for showing and hiding toast notifications
 *
 * Usage:
 * ```tsx
 * import { useToast } from '@/hooks/useToast';
 *
 * function MyComponent() {
 *   const { showToast, hideToast } = useToast();
 *
 *   const handleSuccess = () => {
 *     showToast('Success!', 'Operation completed.', 'success', {
 *       text: 'View on Etherscan',
 *       url: 'https://etherscan.io/tx/...'
 *     });
 *   };
 *
 *   const handleError = () => {
 *     showToast('Error!', 'Something went wrong.', 'error');
 *   };
 *
 *   const handleLoading = () => {
 *     showToast('Processing...', 'Please wait...', 'loading');
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleSuccess}>Show Success</button>
 *       <button onClick={handleError}>Show Error</button>
 *       <button onClick={handleLoading}>Show Loading</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @returns {Object} Toast functions and state
 * @returns {Function} showToast - Show toast (title, message, type?, link?)
 * @returns {Function} hideToast - Hide toast
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function Toast() {
  const { isVisible, title, message, type, link, hideToast } = useToast();

  if (!isVisible) return null;

  const getToastStyles = () => {
    switch (type) {
      case 'error':
        return {
          container: 'bg-white border-red-200',
          title: 'text-red-900',
          message: 'text-red-700',
          icon: (
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        };
      case 'loading':
        return {
          container: 'bg-white border-gray-200',
          title: 'text-gray-900',
          message: 'text-gray-700',
          icon: <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>,
        };
      default:
        return {
          container: 'bg-white border-gray-200',
          title: 'text-gray-900',
          message: 'text-gray-700',
          icon: (
            <div className="relative">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                <svg
                  className="w-6 h-6 text-green-600 animate-bounce"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {/* Ripple effect */}
              <div className="absolute inset-0 w-12 h-12 bg-green-200 rounded-full animate-ping opacity-75"></div>
            </div>
          ),
        };
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className={`rounded-lg p-6 md:p-8 shadow-xl max-w-md w-full mx-4 border relative ${styles.container}`}>
        {/* Confetti effect for success */}
        {type === 'success' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: ['#fbbf24', '#34d399', '#60a5fa', '#f87171', '#a78bfa'][
                    Math.floor(Math.random() * 5)
                  ],
                  animation: `confetti ${2 + Math.random() * 2}s linear infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Close button for success and error types */}
        {(type === 'success' || type === 'error') && (
          <button
            onClick={hideToast}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">{styles.icon}</div>

          {/* Title */}
          <h3 className={`text-xl font-medium mb-2 ${styles.title}`}>{title}</h3>

          {/* Message with scroll for long content */}
          <div
            className={`${styles.message} mb-4 overflow-y-auto text-sm leading-relaxed scrollbar-hide relative ${
              type === 'error' ? 'max-h-48' : 'max-h-32'
            }`}
          >
            <p className="break-words whitespace-pre-wrap pr-2">{message}</p>
          </div>

          {/* Link for success type */}
          {type === 'success' && link && (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center space-x-2 ${styles.message} hover:underline`}
            >
              <span>{link.text}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
