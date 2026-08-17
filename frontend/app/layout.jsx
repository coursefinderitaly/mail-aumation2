import './globals.css';
import NotificationToast from '../components/NotificationToast';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Mission Control - Course Matching CRM</title>
      </head>
      <body className="dark:bg-neutral-950 dark:text-white bg-gray-50 text-slate-900 font-sans">
        {children}
        <NotificationToast />
      </body>
    </html>
  );
}
