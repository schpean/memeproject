import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { FaCheck, FaExclamationCircle } from 'react-icons/fa';
import '../../styles/Notification.css';
import GlobalLoading from './GlobalLoading';

// Types: success, error
const Notification = ({ message, type = 'success', duration = 3000 }) => {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsActive(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!isActive) return null;

  const icon = type === 'success' ? <FaCheck className="icon" /> : <FaExclamationCircle className="icon" />;

  return (
    <div className="notification">
      {icon}
      <span>{message}</span>
    </div>
  );
};

// Create a portal to render notifications
const NotificationPortal = ({ notifications = [] }) => {
  return ReactDOM.createPortal(
    <div className="notification-container">
      {notifications.map((notification, index) => (
        <Notification
          key={`notification-${index}`}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
        />
      ))}
    </div>,
    document.body
  );
};

// Global notification system
let notificationQueue = [];
let onNotificationChange = null;

export const notify = (message, type = 'success', duration = 3000) => {
  const id = Date.now();
  const notification = { id, message, type, duration };
  
  notificationQueue = [...notificationQueue, notification];
  
  // Remove notification after it expires
  setTimeout(() => {
    notificationQueue = notificationQueue.filter(n => n.id !== id);
    if (onNotificationChange) {
      onNotificationChange(notificationQueue);
    }
  }, duration);

  if (onNotificationChange) {
    onNotificationChange(notificationQueue);
  }
  
  return id;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    onNotificationChange = setNotifications;
    return () => {
      onNotificationChange = null;
    };
  }, []);

  return (
    <>
      {children}
      <NotificationPortal notifications={notifications} />
      <GlobalLoading />
    </>
  );
};

export default Notification; 