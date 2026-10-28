import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, auctionApi } from '../api/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';
import styles from './Dashboard.module.css';

export default function SellerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboard = () => {
    dashboardApi
      .getSeller()
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load seller dashboard.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleDecision = async (id, decision) => {
    setActionLoading(true);
    try {
      await auctionApi.decide(id, decision);
      fetchDashboard();
    } catch (err) {
      alert(err.message || 'Error processing decision.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAuction = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this auction listing?')) return;
    setActionLoading(true);
    try {
      await auctionApi.cancel(id);
      fetchDashboard();
    } catch (err) {
      alert(err.message || 'Error cancelling auction.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`container ${styles.page}`} style={{ textAlign: 'center' }}>
        <p>Loading your listings and sales...</p>
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
    active = [],
    pendingDecision = [],
    handoverPending = [],
    completed = [],
    closedOthers = [],
  } = data || {};

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className={styles.title}>My Listed Auctions</h1>
          <p className={styles.subtitle}>
            Manage your active items, approve winning bids, and track campus handovers.
          </p>
        </div>
        <Link to="/sell" className="btn btn-primary">
          + Sell Another Item
        </Link>
      </div>

      {/* Summary Cards */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Active Auctions</span>
          <span className={styles.statValue} style={{ color: 'var(--primary)' }}>
            {active.length}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Requires Decision</span>
          <span className={styles.statValue} style={{ color: 'var(--warning)' }}>
            {pendingDecision.length}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Awaiting Handover</span>
          <span className={styles.statValue} style={{ color: '#7c3aed' }}>
            {handoverPending.length}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Completed Sales</span>
          <span className={styles.statValue} style={{ color: 'var(--success)' }}>
            {completed.length}
          </span>
        </div>
      </div>

      {/* Decision Required Alert Section */}
      {pendingDecision.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>⚠️ Action Needed: Concluded Auctions Awaiting Your Approval</span>
            <span className={styles.countPill} style={{ background: '#fef3c7', color: '#b45309' }}>
              {pendingDecision.length}
            </span>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item Title</th>
                  <th>Top Bid</th>
                  <th>Winning Student</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingDecision.map((item) => (
                  <tr key={item._id}>
                    <td className={styles.itemTitleCell}>
                      <Link to={`/auction/${item._id}`}>{item.title}</Link>
                      {item.closedEarly && (
                        <span
                          title="Closed early by seller"
                          style={{
                            fontSize: '11px',
                            background: '#fef3c7',
                            color: '#b45309',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginLeft: '8px',
                            fontWeight: '600',
                          }}
                        >
                          ⚡ Closed Early
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{item.currentBid}</td>
                    <td>{item.winner?.name || 'A Student'}</td>
                    <td className={styles.actionCell}>
                      <button
                        onClick={() => handleDecision(item._id, 'approve')}
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        disabled={actionLoading}
                      >
                        Accept Price
                      </button>
                      <button
                        onClick={() => handleDecision(item._id, 'reject')}
                        className="btn btn-danger"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        disabled={actionLoading}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Active Listings Table */}
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span>🟢 Active Auctions ({active.length})</span>
        </div>

        {active.length === 0 ? (
          <div className={styles.emptyBox}>
            <p>You have no active auction listings.</p>
            <Link to="/sell" className="btn btn-primary" style={{ marginTop: '12px' }}>
              + List an Item Now
            </Link>
          </div>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item Title</th>
                  <th>Starting Price</th>
                  <th>Current Top Bid</th>
                  <th>Bids</th>
                  <th>Time Remaining</th>
                  <th>Manage</th>
                </tr>
              </thead>
              <tbody>
                {active.map((item) => (
                  <tr key={item._id}>
                    <td className={styles.itemTitleCell}>
                      <Link to={`/auction/${item._id}`}>{item.title}</Link>
                      {item.bidCount > 0 ? (
                        <span
                          title="Listing details permanently locked after first accepted bid"
                          style={{
                            fontSize: '11px',
                            background: '#fef3c7',
                            color: '#92400e',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            marginLeft: '8px',
                            fontWeight: '500',
                          }}
                        >
                          🔒 Terms Locked
                        </span>
                      ) : (
                        <span
                          title="Editable until first bid is placed"
                          style={{
                            fontSize: '11px',
                            background: '#f0fdf4',
                            color: '#166534',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginLeft: '8px',
                          }}
                        >
                          ✏️ Editable
                        </span>
                      )}
                    </td>
                    <td>₹{item.startingPrice}</td>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                      {item.currentBid ? `₹${item.currentBid}` : '—'}
                    </td>
                    <td>{item.bidCount}</td>
                    <td>
                      <CountdownTimer closingAt={item.closingAt} status={item.status} />
                    </td>
                    <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Link
                        to={`/auction/${item._id}`}
                        className="btn btn-secondary"
                        style={{
                          fontSize: '12px',
                          padding: '5px 10px',
                          color: '#b45309',
                          borderColor: '#f59e0b',
                          background: '#fffbeb',
                          textDecoration: 'none',
                        }}
                        title="Close this auction early and select a winner"
                      >
                        ⚡ Close Early
                      </Link>
                      {item.bidCount === 0 && (
                        <button
                          onClick={() => handleCancelAuction(item._id)}
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '5px 10px', color: 'var(--danger)' }}
                          disabled={actionLoading}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Handover in Progress */}
      {handoverPending.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>🤝 Items Awaiting Campus Handover ({handoverPending.length})</span>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item Title</th>
                  <th>Agreed Price</th>
                  <th>Buyer</th>
                  <th>Handover Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {handoverPending.map((item) => (
                  <tr key={item._id}>
                    <td className={styles.itemTitleCell}>
                      <Link to={`/auction/${item._id}`}>{item.title}</Link>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--success)' }}>₹{item.currentBid}</td>
                    <td>{item.winner?.name || 'A Student'}</td>
                    <td>
                      {item.handover?.sellerConfirmed ? '✅ Confirmed by you' : '⏳ Awaiting your confirmation'}
                    </td>
                    <td>
                      <Link to={`/auction/${item._id}`} className="btn btn-secondary" style={{ fontSize: '12px', padding: '5px 10px' }}>
                        View / Confirm
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Completed Sales */}
      {completed.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>✅ Completed Sales ({completed.length})</span>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item Title</th>
                  <th>Final Sale Price</th>
                  <th>Buyer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((item) => (
                  <tr key={item._id}>
                    <td className={styles.itemTitleCell}>
                      <Link to={`/auction/${item._id}`}>{item.title}</Link>
                      {item.closedEarly && (
                        <span
                          style={{
                            fontSize: '11px',
                            background: '#fef3c7',
                            color: '#b45309',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginLeft: '8px',
                          }}
                        >
                          ⚡ Early Close
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--success)' }}>₹{item.currentBid}</td>
                    <td>{item.winner?.name || 'A Student'}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Unsold / Cancelled Archive */}
      {closedOthers.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <span>📦 Other Concluded Listings ({closedOthers.length})</span>
          </div>

          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item Title</th>
                  <th>Starting Price</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {closedOthers.map((item) => (
                  <tr key={item._id}>
                    <td className={styles.itemTitleCell}>
                      <Link to={`/auction/${item._id}`}>{item.title}</Link>
                      {item.closedEarly && (
                        <span
                          style={{
                            fontSize: '11px',
                            background: '#fef3c7',
                            color: '#b45309',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginLeft: '8px',
                          }}
                        >
                          ⚡ Closed Early (0 Bids)
                        </span>
                      )}
                    </td>
                    <td>₹{item.startingPrice}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
