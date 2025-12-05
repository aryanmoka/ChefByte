import React from 'react';
import { Bot } from 'lucide-react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex justify-start px-2">
      <div className="flex items-start space-x-3 max-w-[85%] sm:max-w-sm">
        
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-600 text-white shadow-md">
            <Bot className="h-4 w-4" />
          </div>
        </div>

        {/* Typing bubble */}
        <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-3 rounded-lg rounded-bl-md shadow-sm">
          <div className="flex items-center space-x-2">
            {/* Dot 1 */}
            <div className="w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-300 animate-ping" />

            {/* Dot 2 */}
            <div 
              className="w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-300 animate-ping"
              style={{ animationDelay: "0.15s" }}
            />

            {/* Dot 3 */}
            <div 
              className="w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-300 animate-ping"
              style={{ animationDelay: "0.3s" }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default TypingIndicator;
