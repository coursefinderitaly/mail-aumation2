'use client';

import { useEffect, useState } from 'react';

export default function NotificationToast() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/notifications`);
        const data = await res.json();
        if (data.notifications && data.notifications.length > 0) {
          setNotifications(prev => [...prev, ...data.notifications]);
          
          // Auto remove after 5 seconds
          data.notifications.forEach(() => {
            setTimeout(() => {
              setNotifications(prev => prev.slice(1));
            }, 5000);
          });
        }
      } catch (err) {
        // Silent fail
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((notif, idx) => (
        <div 
          key={idx} 
          className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between"
          style={{ minWidth: '250px' }}
        >
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="font-medium text-sm">{notif}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
