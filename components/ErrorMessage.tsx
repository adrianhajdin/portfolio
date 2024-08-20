import React from 'react';

interface ErrorMessageProps {
  message: string;
  details?: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, details, onRetry }) => {
  return (
    <div
      className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
      role="alert"
      aria-live="assertive"
    >
      <strong className="font-bold">Error: </strong>
      <span className="block sm:inline">{message}</span>
      {details && (
        <p className="mt-2 text-sm">{details}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          aria-label="Retry action"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
