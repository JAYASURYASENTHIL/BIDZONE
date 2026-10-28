import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/api.js';
import AuctionCard from '../components/AuctionCard.jsx';
import styles from './Dashboard.module.css';

export default function BuyerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .getBuyer()
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load buyer dashboard.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={`container ${styles.page}`} style={{ textAlign: 'center' }}>
        <p>Loading your bids and purchases...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`container ${styles.page}`} style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)' }}>{error}</p>
      </div>
    );
  }

  const {
    activeLeading = [],
    outbid = [],
    pendingWins = [],
    handoverPending = [],
    completedPurchases = [],
  } = data || {};

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Bids & Purchases</h1>
        <p className={styles.subtitle}>
          Track items where you are leading, outbid items to reclaim, and pending handovers.
        </p>
      </div>

      {/* Stats Summary */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Currently Leading</span>
          <span className={styles.statValue} style={{ color: 'var(--success)' }}>
            {activeLeading.length}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Outbid (Action Needed)</span>
          <span className={styles.statValue} style={{ color: 'var(--danger)' }}>
            {outbid.length}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Awaiting Seller Approval</span>
          <span className={styles.statValue} style={{ color: 'var(--warning)' }}>
            {pendingWins.length}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Handovers In Progress</span>
          <span className={styles.statValue} style={{ color: 'var(--primary)' }}>
            {handoverPending.length}
          </span>
        </div>
      </div>

      {/* Outbid Alert Section */}
      {outbid.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>⚠️ You Have Been Outbid</span>
            <span className={styles.countPill} style={{ background: '#fee2e2', color: '#dc2626' }}>
              {outbid.length}
            </span>
          </div>
          <div className={styles.grid}>
            {outbid.map((auction) => (
              <AuctionCard key={auction._id} auction={auction} />
            ))}
          </div>
        </section>
      )}

      {/* Active Leading Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span>🏆 Active Leading Bids</span>
          <span className={styles.countPill}>{activeLeading.length}</span>
        </div>
        {activeLeading.length === 0 ? (
          <div className={styles.emptyBox}>
            <p>You don't have any leading bids right now.</p>
            <Link to="/explore" className="btn btn-secondary" style={{ marginTop: '12px' }}>
              Explore Active Auctions
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {activeLeading.map((auction) => (
              <AuctionCard key={auction._id} auction={auction} />
            ))}
          </div>
        )}
      </section>

      {/* Awaiting Seller Decision */}
      {pendingWins.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>⏳ Awaiting Seller Approval</span>
            <span className={styles.countPill}>{pendingWins.length}</span>
          </div>
          <div className={styles.grid}>
            {pendingWins.map((auction) => (
              <AuctionCard key={auction._id} auction={auction} />
            ))}
          </div>
        </section>
      )}

      {/* Handover Pending */}
      {handoverPending.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>🤝 Handover Pending</span>
            <span className={styles.countPill}>{handoverPending.length}</span>
          </div>
          <div className={styles.grid}>
            {handoverPending.map((auction) => (
              <AuctionCard key={auction._id} auction={auction} />
            ))}
          </div>
        </section>
      )}

      {/* Completed Purchases */}
      {completedPurchases.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>✅ Completed Purchases</span>
            <span className={styles.countPill}>{completedPurchases.length}</span>
          </div>
          <div className={styles.grid}>
            {completedPurchases.map((auction) => (
              <AuctionCard key={auction._id} auction={auction} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
