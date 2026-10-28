import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationApi } from '../api/api.js';
import styles from './NotificationsPage.module.css';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [browserNotifStatus, setBrowserNotifStatus] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const fetchNotifs = () => {
    notificationApi
      .getAll()
      .then((res) => {
        setNotifications(res.notifications || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      alert('Failed to mark all as read.');
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch {}
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setBrowserNotifStatus(permission);
      if (permission === 'granted') {
        new Notification('BIDZONE Notifications Enabled! 🔔', {
          body: 'You will receive real-time updates when outbid or when auctions close.',
        });
      }
    } catch {}
  };

  const iconMap = {
    outbid: '⚠️',
    auction_won: '🏆',
    auction_closed: '⏱️',
    seller_approved: '🎉',
    seller_rejected: '❌',
    handover_update: '🤝',
    listing_cancelled: '🚫',
  };

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notification Center</h1>
          <p className={styles.subtitle}>
            Stay informed on bids, outbid alerts, seller decisions, and handover confirmations.
          </p>
        </div>

        <div className={styles.headerActions}>
          {browserNotifStatus === 'default' && (
            <button onClick={requestNotificationPermission} className="btn btn-secondary" style={{ fontSize: '13px' }}>
              🔔 Enable Browser Notifications
            </button>
          )}
          {notifications.some((n) => !n.read) && (
            <button onClick={handleMarkAllRead} className="btn btn-secondary" style={{ fontSize: '13px' }}>
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <div className={styles.emptyBox}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
          <h3>No notifications yet</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
            We'll notify you here when you are outbid or your auctions have updates.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className={`${styles.item} ${notif.read ? styles.readItem : styles.unreadItem}`}
              onClick={() => !notif.read && handleMarkOneRead(notif._id)}
            >
              <div className={styles.iconCircle}>{iconMap[notif.type] || '📢'}</div>

              <div className={styles.content}>
                <div className={styles.titleRow}>
                  <h4 className={styles.notifTitle}>{notif.title}</h4>
                  <span className={styles.timeText}>
                    {new Date(notif.createdAt).toLocaleDateString()} at{' '}
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className={styles.messageText}>{notif.message}</p>

                {notif.data?.auctionId && (
                  <Link to={`/auction/${notif.data.auctionId}`} className={styles.actionLink}>
                    View Auction →
                  </Link>
                )}
              </div>

              {!notif.read && <span className={styles.unreadDot} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
