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
          gap: '5px',
          fontSize: '11px',
          fontWeight: '600',
          color: '#64748b',
          backgroundColor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          letterSpacing: '0.02em',
        }}
      >
        <span style={{ fontSize: '12px' }}>⏱️</span> Ended
      </span>
    );
  }

  const isUrgent = timeLeft.includes('m ') || timeLeft.includes('s left');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '11px',
        fontWeight: '700',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em',
        color: isUrgent ? '#b91c1c' : '#4338ca',
        backgroundColor: isUrgent ? '#fef2f2' : '#eef2ff',
        border: `1px solid ${isUrgent ? '#fecaca' : '#c7d2fe'}`,
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        boxShadow: isUrgent ? '0 0 0 1px rgba(239, 68, 68, 0.15)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{ fontSize: '12px' }}>{isUrgent ? '🔥' : '⏱️'}</span>
      {timeLeft}
    </span>
  );
}
