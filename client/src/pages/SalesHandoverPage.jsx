import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, auctionApi } from '../api/api.js';
import styles from './Dashboard.module.css';

export default function SalesHandoverPage() {
  const [buyerData, setBuyerData] = useState([]);
  const [sellerData, setSellerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [buyerRes, sellerRes] = await Promise.all([
        dashboardApi.getBuyer(),
        dashboardApi.getSeller(),
      ]);

      setBuyerData([
        ...(buyerRes.data?.handoverPending || []),
        ...(buyerRes.data?.completedPurchases || []),
      ]);

      setSellerData([
        ...(sellerRes.data?.handoverPending || []),
        ...(sellerRes.data?.completed || []),
      ]);
    } catch (err) {
      setError(err.message || 'Failed to load handover details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirm = async (auctionId) => {
    setActionLoading(true);
    try {
      await auctionApi.handover(auctionId);
      fetchData();
    } catch (err) {
      alert(err.message || 'Error confirming handover.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`container ${styles.page}`} style={{ textAlign: 'center' }}>
        <p>Loading handovers and transactions...</p>
      </div>
    );
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Campus Handover & Completed Transactions</h1>
        <p className={styles.subtitle}>
          Verify item condition on campus and confirm handovers to close out your auctions securely.
        </p>
      </div>

      {error && <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error}</p>}

      {/* Selling / Sold Items Handover */}
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span>🏷️ As Seller: Your Deliveries ({sellerData.length})</span>
        </div>

        {sellerData.length === 0 ? (
          <div className={styles.emptyBox}>
            <p>You have no active sales in handover state.</p>
          </div>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item Title</th>
                  <th>Price</th>
                  <th>Buyer</th>
                  <th>Your Confirmation</th>
                  <th>Buyer Confirmation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sellerData.map((item) => (
                  <tr key={item._id}>
                    <td className={styles.itemTitleCell}>
                      <Link to={`/auction/${item._id}`}>{item.title}</Link>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{item.currentBid}</td>
                    <td>{item.winner?.name || 'A Student'}</td>
                    <td>
                      {item.handover?.sellerConfirmed ? (
                        '✅ Confirmed'
                      ) : (
                        <button
                          onClick={() => handleConfirm(item._id)}
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                          disabled={actionLoading}
                        >
                          Confirm Handover
                        </button>
                      )}
                    </td>
                    <td>{item.handover?.buyerConfirmed ? '✅ Confirmed' : '⏳ Pending'}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: '700',
                          fontSize: '12px',
                          color: item.status === 'completed' ? 'var(--success)' : '#7c3aed',
                        }}
                      >
                        {item.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Buying / Won Items Handover */}
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span>🛍️ As Buyer: Your Purchases & Pickups ({buyerData.length})</span>
        </div>

        {buyerData.length === 0 ? (
          <div className={styles.emptyBox}>
            <p>You have no won auctions awaiting item pickup.</p>
          </div>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item Title</th>
                  <th>Price</th>
                  <th>Seller</th>
                  <th>Your Confirmation</th>
                  <th>Seller Confirmation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {buyerData.map((item) => (
                  <tr key={item._id}>
                    <td className={styles.itemTitleCell}>
                      <Link to={`/auction/${item._id}`}>{item.title}</Link>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{item.currentBid}</td>
                    <td>{item.seller?.name || 'A Student'}</td>
                    <td>
                      {item.handover?.buyerConfirmed ? (
                        '✅ Confirmed'
                      ) : (
                        <button
                          onClick={() => handleConfirm(item._id)}
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                          disabled={actionLoading}
                        >
                          Confirm Received
                        </button>
                      )}
                    </td>
                    <td>{item.handover?.sellerConfirmed ? '✅ Confirmed' : '⏳ Pending'}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: '700',
                          fontSize: '12px',
                          color: item.status === 'completed' ? 'var(--success)' : '#7c3aed',
                        }}
                      >
                        {item.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
