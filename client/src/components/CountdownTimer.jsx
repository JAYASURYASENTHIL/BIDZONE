import { useState, useEffect } from 'react';

export default function CountdownTimer({ closingAt, status }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    if (status && status !== 'active') {
      setIsEnded(true);
      return;
    }

    const calculateTime = () => {
      const difference = new Date(closingAt).getTime() - new Date().getTime();

      if (difference <= 0) {
        setIsEnded(true);
        setTimeLeft('Auction ended');
        return;
      }

      setIsEnded(false);
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s left`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [closingAt, status]);

  if (isEnded) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          fontWeight: '600',
          color: 'var(--text-subtle)',
          backgroundColor: 'var(--bg-subtle)',
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        ⏱️ Ended
      </span>
    );
  }

  const isUrgent = timeLeft.includes('m ') || timeLeft.includes('s left');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '12px',
        fontWeight: '600',
        color: isUrgent ? '#dc2626' : 'var(--primary)',
        backgroundColor: isUrgent ? '#fee2e2' : 'var(--primary-light)',
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        transition: 'all 0.2s ease',
      }}
    >
      ⏱️ {timeLeft}
    </span>
  );
}
