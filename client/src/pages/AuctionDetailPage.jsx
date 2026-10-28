import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { auctionApi } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import styles from './AuctionDetailPage.module.css';

export default function AuctionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [bidInput, setBidInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAuction = () => {
    auctionApi
      .getById(id)
      .then((res) => {
        setAuction(res.auction);
        setBids(res.bids || []);
      })
      .catch((err) => {
        setBidError(err.message || 'Failed to load auction.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAuction();

    // Setup Socket.io real-time listener
    const socket = io('/', { withCredentials: true });
    socket.emit('join:auction', id);

    socket.on('bid:update', (data) => {
      if (data.auctionId === id) {
        setAuction((prev) => (prev ? { ...prev, currentBid: data.currentBid, bidCount: data.bidCount } : prev));
        setBids((prev) => [data.latestBid, ...prev.map((b) => ({ ...b, isLeading: false }))]);
      }
    });

    socket.on('auction:status', (data) => {
      if (data.auctionId === id) {
        setAuction((prev) => (prev ? { ...prev, status: data.status } : prev));
      }
    });

    return () => {
      socket.emit('leave:auction', id);
      socket.disconnect();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading auction details...</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2>Auction not found</h2>
        <Link to="/explore" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to Explore
        </Link>
      </div>
    );
  }

  const isSeller = user && auction.seller && auction.seller._id === user._id;
  const isWinner = user && auction.winner && auction.winner._id === user._id;
  const isAuctionOpen = auction.status === 'active' && new Date(auction.closingAt) > new Date();

  const minNextBid =
    auction.bidCount === 0
      ? auction.startingPrice
      : (auction.currentBid || auction.startingPrice) + auction.minIncrement;

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    setBidError('');
    setBidSuccess('');

    if (!user) {
      navigate('/login');
      return;
    }

    const amountNum = Number(bidInput);
    if (!amountNum || amountNum < minNextBid) {
      setBidError(`Bid must be at least ₹${minNextBid}`);
      return;
    }

    setSubmittingBid(true);
    try {
      await auctionApi.placeBid(id, amountNum);
      setBidSuccess(`Successfully placed leading bid of ₹${amountNum}! 🎉`);
      setBidInput('');
      fetchAuction();
    } catch (err) {
      setBidError(err.message || 'Failed to place bid.');
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleSellerDecision = async (decision) => {
    setActionLoading(true);
    try {
      await auctionApi.decide(id, decision);
      fetchAuction();
    } catch (err) {
      alert(err.message || 'Failed to process decision.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHandoverConfirm = async () => {
    setActionLoading(true);
    try {
      await auctionApi.handover(id);
      fetchAuction();
    } catch (err) {
      alert(err.message || 'Failed to confirm handover.');
    } finally {
      setActionLoading(false);
    }
  };

  const images =
    auction.images && auction.images.length > 0
      ? auction.images
      : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.breadcrumbs}>
        <Link to="/explore">Explore</Link>
        <span>/</span>
        <span className={styles.crumbCategory}>{auction.category}</span>
        <span>/</span>
        <span className={styles.crumbCurrent}>{auction.title}</span>
      </div>

      <div className={styles.layout}>
        {/* Left Column: Image Gallery & Description */}
        <div className={styles.leftCol}>
          <div className={styles.gallery}>
            <div className={styles.mainImageWrapper}>
              <img src={images[selectedImage]} alt={auction.title} className={styles.mainImage} />
              <div className={styles.statusFloat}>
                <StatusBadge status={auction.status} />
              </div>
            </div>

            {images.length > 1 && (
              <div className={styles.thumbnails}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`${styles.thumbBtn} ${selectedImage === idx ? styles.activeThumb : ''}`}
                  >
                    <img src={img} alt="" className={styles.thumbImg} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.detailsCard}>
            <h2 className={styles.sectionTitle}>Item Description</h2>
            <p className={styles.descriptionText}>{auction.description}</p>

            <h2 className={styles.sectionTitle} style={{ marginTop: '24px' }}>
              Specifications
            </h2>
            <div className={styles.specGrid}>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Category</span>
                <span className={styles.specValue}>{auction.category}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Condition</span>
                <span className={styles.specValue}>{auction.condition}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Starting Price</span>
                <span className={styles.specValue}>₹{auction.startingPrice}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Min. Increment</span>
                <span className={styles.specValue}>₹{auction.minIncrement}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Seller</span>
                <span className={styles.specValue}>{auction.seller?.name || 'Campus Student'}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Listed On</span>
                <span className={styles.specValue}>
                  {new Date(auction.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bidding Box & Bid History */}
        <div className={styles.rightCol}>
          {/* Auction Overview & Action Card */}
          <div className={styles.bidCard}>
            <div className={styles.timerRow}>
              <span className={styles.timeLabel}>Time Remaining:</span>
              <CountdownTimer closingAt={auction.closingAt} status={auction.status} />
            </div>

            <h1 className={styles.itemTitle}>{auction.title}</h1>

            <div className={styles.priceContainer}>
              <span className={styles.priceLabel}>
                {auction.bidCount > 0 ? 'Current Leading Bid' : 'Starting Bid'}
              </span>
              <div className={styles.currentPrice}>
                ₹{auction.currentBid !== null ? auction.currentBid : auction.startingPrice}
              </div>
              <span className={styles.bidCountBadge}>
                {auction.bidCount} {auction.bidCount === 1 ? 'bid placed' : 'bids placed'}
              </span>
            </div>

            {/* Bidding Form or State Messages */}
            {isAuctionOpen ? (
              isSeller ? (
                <div className={styles.sellerNotice}>
                  <p>👑 You are the seller of this auction.</p>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Bidding is active. You will review the winning bid when the auction closes.
                  </span>
                </div>
              ) : (
                <form onSubmit={handlePlaceBid} className={styles.bidForm}>
                  {bidError && <div className={styles.bidAlertError}>{bidError}</div>}
                  {bidSuccess && <div className={styles.bidAlertSuccess}>{bidSuccess}</div>}

                  <div className={styles.bidInputGroup}>
                    <span className={styles.currencyPrefix}>₹</span>
                    <input
                      type="number"
                      placeholder={`Min ₹${minNextBid}`}
                      value={bidInput}
                      onChange={(e) => setBidInput(e.target.value)}
                      min={minNextBid}
                      step={auction.minIncrement}
                      className={styles.bidField}
                      required
                      disabled={submittingBid}
                    />
                    <button type="submit" className="btn btn-primary" disabled={submittingBid}>
                      {submittingBid ? 'Placing...' : 'Place Bid'}
                    </button>
                  </div>
                  <span className={styles.bidHint}>
                    Next minimum bid is ₹{minNextBid} (₹{auction.minIncrement} increment)
                  </span>
                </form>
              )
            ) : (
              <div className={styles.closedNotice}>
                <p>This auction is no longer accepting bids.</p>
                <div style={{ marginTop: '8px' }}>
                  <StatusBadge status={auction.status} />
                </div>
              </div>
            )}

            {/* Seller Decision Workflow */}
            {isSeller && auction.status === 'pending_seller_decision' && (
              <div className={styles.decisionBox}>
                <h4>Auction Concluded! Your Decision is Required:</h4>
                <p>
                  Winning Bid: <strong>₹{auction.currentBid}</strong>
                </p>
                <div className={styles.decisionActions}>
                  <button
                    onClick={() => handleSellerDecision('approve')}
                    className="btn btn-primary"
                    disabled={actionLoading}
                  >
                    Accept Winning Price
                  </button>
                  <button
                    onClick={() => handleSellerDecision('reject')}
                    className="btn btn-danger"
                    disabled={actionLoading}
                  >
                    Reject Price
                  </button>
                </div>
              </div>
            )}

            {/* Handover Tracker Workflow */}
            {auction.status === 'handover_pending' && (isSeller || isWinner) && (
              <div className={styles.handoverBox}>
                <h4>🤝 Campus Handover Confirmation</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Meet on campus to inspect the item. Both buyer and seller must confirm handover.
                </p>

                <div className={styles.handoverStatusRow}>
                  <div>
                    Seller Status:{' '}
                    <strong>{auction.handover?.sellerConfirmed ? '✅ Confirmed' : '⏳ Pending'}</strong>
                  </div>
                  <div>
                    Buyer Status:{' '}
                    <strong>{auction.handover?.buyerConfirmed ? '✅ Confirmed' : '⏳ Pending'}</strong>
                  </div>
                </div>

                {((isSeller && !auction.handover?.sellerConfirmed) ||
                  (isWinner && !auction.handover?.buyerConfirmed)) && (
                  <button
                    onClick={handleHandoverConfirm}
                    className="btn btn-primary"
                    style={{ marginTop: '12px', width: '100%' }}
                    disabled={actionLoading}
                  >
                    I Confirm Handover Completed
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Public Bid History */}
          <div className={styles.historyCard}>
            <h3 className={styles.historyTitle}>Public Bid History ({bids.length})</h3>
            {bids.length === 0 ? (
              <p className={styles.noBidsText}>No bids yet. Be the first to bid!</p>
            ) : (
              <ul className={styles.bidList}>
                {bids.map((b, idx) => (
                  <li key={b._id || idx} className={`${styles.bidItem} ${b.isLeading ? styles.leadingItem : ''}`}>
                    <div className={styles.bidderInfo}>
                      <span className={styles.bidderName}>{b.bidderName}</span>
                      <span className={styles.bidTime}>
                        {new Date(b.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {new Date(b.placedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={styles.bidAmountCol}>
                      <span className={styles.bidAmount}>₹{b.amount}</span>
                      {b.isLeading && <span className={styles.leadingPill}>Leading</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
