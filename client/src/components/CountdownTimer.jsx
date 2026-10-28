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
          display: 'inline-block',
          fontSize: '11px',
          fontWeight: '500',
          color: '#6b7280',
          padding: '2px 0',
        }}
      >
        Ended
      </span>
    );
  }

  const isUrgent = timeLeft.includes('m ') || timeLeft.includes('s left');

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '12px',
        fontWeight: '600',
        fontVariantNumeric: 'tabular-nums',
        color: isUrgent ? '#dc2626' : '#374151',
        padding: '2px 0',
      }}
    >
      {timeLeft}
    </span>
  );
}
