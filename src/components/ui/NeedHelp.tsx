import React from 'react';
import Button from './Button';

export default function NeedHelp() {
  return (
    <div className="mt-12 bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          If you're unsure about which migration path to use or need assistance, our support team is here to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" size="md" className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c0-.438-.199-1.105-.568-1.802C7.354 6.374 6.299 6 5 6c-1.299 0-2.354.374-2.66 1.198C1.771 7.895 1.572 8.562 1.572 9c0 .438.199 1.105.568 1.802C2.646 11.626 3.701 12 5 12c1.299 0 2.354-.374 2.66-1.198C8.229 9.895 8.428 9.228 8.428 9zM15.228 9c0-.438-.199-1.105-.568-1.802C14.354 6.374 13.299 6 12 6c-1.299 0-2.354.374-2.66 1.198C8.771 7.895 8.572 8.562 8.572 9c0 .438.199 1.105.568 1.802C9.646 11.626 10.701 12 12 12c1.299 0 2.354-.374 2.66-1.198C15.229 9.895 15.428 9.228 15.428 9z"
              />
            </svg>
            <span>FAQ</span>
          </Button>
          <Button variant="outline" size="md" className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>Contact Support</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
