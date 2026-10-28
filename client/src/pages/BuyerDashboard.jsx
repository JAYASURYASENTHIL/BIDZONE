import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, alertApi } from '../api/api.js';
import AuctionCard from '../components/AuctionCard.jsx';
import styles from './Dashboard.module.css';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'cycles', label: 'Cycles' },
  { value: 'calculators', label: 'Calculators' },
  { value: 'books', label: 'Books & Notes' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'others', label: 'Others' },
];

export default function BuyerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Item Alerts State
  const [alerts, setAlerts] = useState([]);
  const [alertKeyword, setAlertKeyword] = useState('');
  const [alertCategory, setAlertCategory] = useState('');
  const [alertMaxBudget, setAlertMaxBudget] = useState('');
  const [alertSubmitting, setAlertSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertErr, setAlertErr] = useState('');

  const fetchAlerts = () => {
    alertApi
      .list()
      .then((res) => {
        setAlerts(res.alerts || []);
      })
      .catch(() => {});
  };

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

    fetchAlerts();
  }, []);

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    setAlertErr('');
    setAlertMsg('');

    if (!alertKeyword.trim()) {
      setAlertErr('Please specify what item keywords you are looking for.');
      return;
    }

    setAlertSubmitting(true);
    try {
      const payload = {
        keywords: alertKeyword.trim(),
        category: alertCategory && alertCategory !== 'All Categories' ? alertCategory : undefined,
        maxBudget: alertMaxBudget ? Number(alertMaxBudget) : undefined,
      };

      const res = await alertApi.create(payload);
      setAlertMsg(res.message || 'Alert created successfully!');
      setAlertKeyword('');
      setAlertCategory('');
      setAlertMaxBudget('');
      fetchAlerts();
    } catch (err) {
      setAlertErr(err.message || 'Failed to create alert.');
    } finally {
      setAlertSubmitting(false);
    }
  };

  const handleDeleteAlert = async (id) => {
    try {
      await alertApi.delete(id);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete alert.');
    }
  };

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
          Track items where you are leading, outbid items to reclaim, pending handovers, and item alerts.
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

      {/* Item Alerts Section (Never Miss What You Need) */}
      <section className={styles.alertCard}>
        <div className={styles.alertHeader}>
          <h2 className={styles.alertTitle}>
            <span>🔔</span>
            <span>Never Miss What You Need (Item Alerts)</span>
          </h2>
          <p className={styles.alertSubtitle}>
            Can't check the app while in class or asleep? Set an alert for what you're looking for (e.g. <em>"scientific calculator up to ₹400"</em>). BIDZONE will automatically send you an in-app and browser notification the instant a matching listing goes live.
          </p>
        </div>

        {alertErr && (
          <div style={{ color: '#dc2626', background: '#fee2e2', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>
            {alertErr}
          </div>
        )}
        {alertMsg && (
          <div style={{ color: '#047857', background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' }}>
            {alertMsg}
          </div>
        )}

        <form onSubmit={handleCreateAlert} className={styles.alertForm}>
          <input
            type="text"
            placeholder="Keywords (e.g. scientific calculator, cycle, mattress)"
            value={alertKeyword}
            onChange={(e) => setAlertKeyword(e.target.value)}
            className={styles.alertInput}
            required
            disabled={alertSubmitting}
          />
          <select
            value={alertCategory}
            onChange={(e) => setAlertCategory(e.target.value)}
            className={styles.alertInput}
            disabled={alertSubmitting}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Max Budget ₹ (optional)"
            value={alertMaxBudget}
            onChange={(e) => setAlertMaxBudget(e.target.value)}
            className={styles.alertInput}
            min={1}
            disabled={alertSubmitting}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ fontSize: '13px', whiteSpace: 'nowrap' }}
            disabled={alertSubmitting}
          >
            {alertSubmitting ? 'Adding...' : '+ Set Alert'}
          </button>
        </form>

        {/* Existing Alerts List */}
        <div className={styles.alertList}>
          {alerts.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
              You haven't set any item alerts yet. Create one above to stay notified!
            </p>
          ) : (
            alerts.map((alt) => (
              <div key={alt._id} className={styles.alertItem}>
                <div className={styles.alertTags}>
                  <span className={styles.alertKeyword}>"{alt.keywords}"</span>
                  {alt.maxBudget && (
                    <span className={styles.alertBudgetPill}>Up to ₹{alt.maxBudget}</span>
                  )}
                  {alt.category && (
                    <span className={styles.alertCategoryPill}>{alt.category}</span>
                  )}
                  <span className={styles.alertMatchCount}>
                    • {alt.matchCount || 0} items matched
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAlert(alt._id)}
                  className={styles.deleteAlertBtn}
                  title="Remove this alert"
                >
                  Delete Alert
                </button>
              </div>
            ))
          )}
        </div>
      </section>

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
