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
  const [eligibleBidders, setEligibleBidders] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [bidInput, setBidInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Early Close Modal State
  const [showCloseEarlyModal, setShowCloseEarlyModal] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState('');
  const [closeEarlyError, setCloseEarlyError] = useState('');
  const [closingEarly, setClosingEarly] = useState(false);

  // Contact Mobile Exchange Modal State
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState('');
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [phoneModalDismissed, setPhoneModalDismissed] = useState(false);

  // Anti-Sniping Alert State
  const [antiSnipeAlert, setAntiSnipeAlert] = useState(false);

  // Auto-Bidding (Proxy Bidding) State
  const [autoBidAmount, setAutoBidAmount] = useState('');
  const [submittingAutoBid, setSubmittingAutoBid] = useState(false);
  const [autoBidMsg, setAutoBidMsg] = useState('');
  const [autoBidErr, setAutoBidErr] = useState('');

  // Item Q&A State
  const [questions, setQuestions] = useState([]);
  const [questionInput, setQuestionInput] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [qaError, setQaError] = useState('');
  const [replyInputs, setReplyInputs] = useState({});
  const [answeringId, setAnsweringId] = useState(null);

  const fetchQuestions = () => {
    auctionApi
      .getQuestions(id)
      .then((res) => {
        setQuestions(res.questions || []);
      })
      .catch(() => {});
  };

  const fetchAuction = () => {
    auctionApi
      .getById(id)
      .then((res) => {
        setAuction(res.auction);
        setBids(res.bids || []);
        setEligibleBidders(res.eligibleBidders || []);
        if (res.eligibleBidders && res.eligibleBidders.length > 0) {
          const leader = res.eligibleBidders.find((b) => b.isLeading) || res.eligibleBidders[0];
          setSelectedWinnerId(leader.bidderId);
        }
      })
      .catch((err) => {
        setBidError(err.message || 'Failed to load auction.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAuction();
    fetchQuestions();

    const socket = io('/', { withCredentials: true });
    socket.emit('join:auction', id);

    socket.on('bid:update', (data) => {
      if (data.auctionId === id) {
        setAuction((prev) => (prev ? { ...prev, currentBid: data.currentBid, bidCount: data.bidCount } : prev));
        setBids((prev) => [data.latestBid, ...prev.map((b) => ({ ...b, isLeading: false }))]);
        fetchAuction();
      }
    });

    socket.on('auction:status', (data) => {
      if (data.auctionId === id) {
        setAuction((prev) => (prev ? { ...prev, ...data } : prev));
      }
    });

    socket.on('auction:extended', (data) => {
      if (data.auctionId === id) {
        setAuction((prev) =>
          prev
            ? {
                ...prev,
                closingAt: data.newClosingAt,
                extendedByAntiSnipe: true,
                extensionCount: data.extensionCount,
              }
            : prev
        );
        setAntiSnipeAlert(true);
        setTimeout(() => setAntiSnipeAlert(false), 8000);
      }
    });

    socket.on('question:new', (newQ) => {
      if (newQ.auction === id) {
        setQuestions((prev) => [newQ, ...prev.filter((q) => q._id !== newQ._id)]);
      }
    });

    socket.on('question:answered', (updatedQ) => {
      if (updatedQ.auction === id) {
        setQuestions((prev) => prev.map((q) => (q._id === updatedQ._id ? updatedQ : q)));
      }
    });

    socket.on('auction:max_price_hit', (data) => {
      if (data.auctionId === id) {
        setAuction((prev) =>
          prev
            ? {
                ...prev,
                currentBid: data.currentBid,
                winner: data.winner,
                status: 'handover_pending',
                hitMaxPrice: true,
                closedEarly: true,
              }
            : prev
        );
        fetchAuction();
      }
    });

    socket.on('auction:phone_shared', (data) => {
      if (data.auctionId === id) {
        setAuction((prev) => (prev ? { ...prev, handover: data.handover } : prev));
      }
    });

    return () => {
      socket.emit('leave:auction', id);
      socket.disconnect();
    };
  }, [id]);

  // Check if current user is matched and needs to be prompted for phone number
  useEffect(() => {
    if (!auction || !user || phoneModalDismissed) return;
    const isMatched = ['pending_seller_decision', 'handover_pending', 'completed'].includes(auction.status);
    if (!isMatched) return;

    const isCurrentSeller = auction.seller && (auction.seller._id === user._id || auction.seller === user._id);
    const isCurrentWinner = auction.winner && (auction.winner._id === user._id || auction.winner === user._id);

    if (isCurrentSeller && !auction.handover?.sellerPhone) {
      setShowPhoneModal(true);
    } else if (isCurrentWinner && !auction.handover?.buyerPhone) {
      setShowPhoneModal(true);
    }
  }, [auction, user, phoneModalDismissed]);

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

  const isSeller = user && auction.seller && (auction.seller._id === user._id || auction.seller === user._id);
  const isWinner = user && auction.winner && (auction.winner._id === user._id || auction.winner === user._id);
  const isAuctionOpen =
    auction.status === 'active' && !auction.closedEarly && new Date(auction.closingAt) > new Date();
  const isLocked = auction.bidCount > 0;

  const calculatedMin =
    auction.bidCount === 0
      ? auction.startingPrice
      : (auction.currentBid || auction.startingPrice) + auction.minIncrement;
  const minNextBid = auction.maxPrice ? Math.min(calculatedMin, auction.maxPrice) : calculatedMin;

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

    if (auction.maxPrice && amountNum > auction.maxPrice) {
      setBidError(`Bid cannot exceed the seller's maximum price of ₹${auction.maxPrice}.`);
      return;
    }

    setSubmittingBid(true);
    try {
      const res = await auctionApi.placeBid(id, amountNum);
      if (res.hitMaxPrice) {
        setBidSuccess(`🎉 You reached the seller's maximum price of ₹${auction.maxPrice}! Bidding completed and you are matched with the seller!`);
        setShowPhoneModal(true);
      } else {
        setBidSuccess(`Successfully placed leading bid of ₹${amountNum}! 🎉`);
      }
      setBidInput('');
      fetchAuction();
    } catch (err) {
      setBidError(err.message || 'Failed to place bid.');
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleCloseAuctionEarly = async () => {
    setCloseEarlyError('');
    setClosingEarly(true);
    try {
      await auctionApi.closeEarly(id, {
        selectedBidderId: auction.bidCount > 0 ? selectedWinnerId : undefined,
      });
      setShowCloseEarlyModal(false);
      fetchAuction();
    } catch (err) {
      setCloseEarlyError(err.message || 'Failed to close auction early.');
    } finally {
      setClosingEarly(false);
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

  const handleSharePhone = async (e) => {
    e.preventDefault();
    setPhoneError('');
    setPhoneSuccess('');

    const clean = phoneInput.toString().replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setPhoneError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setPhoneSubmitting(true);
    try {
      const res = await auctionApi.sharePhone(id, clean);
      setPhoneSuccess('Mobile number saved! Direct communication is now enabled.');
      setAuction((prev) => (prev ? { ...prev, handover: res.handover } : prev));
      setTimeout(() => {
        setShowPhoneModal(false);
      }, 1200);
    } catch (err) {
      setPhoneError(err.message || 'Failed to share mobile number.');
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const handleSetAutoBid = async (e) => {
    e.preventDefault();
    setAutoBidErr('');
    setAutoBidMsg('');

    if (!user) {
      navigate('/login');
      return;
    }

    const val = Number(autoBidAmount);
    if (!val || val < minNextBid) {
      setAutoBidErr(`Auto-bid ceiling must be at least ₹${minNextBid}`);
      return;
    }

    if (auction.maxPrice && val > auction.maxPrice) {
      setAutoBidErr(`Auto-bid ceiling cannot exceed max price of ₹${auction.maxPrice}`);
      return;
    }

    setSubmittingAutoBid(true);
    try {
      const res = await auctionApi.setAutoBid(id, val);
      setAutoBidMsg(res.message || `Auto-bid active up to ₹${val}!`);
      setAutoBidAmount('');
      fetchAuction();
    } catch (err) {
      setAutoBidErr(err.message || 'Failed to configure auto-bid.');
    } finally {
      setSubmittingAutoBid(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    setQaError('');

    if (!user) {
      navigate('/login');
      return;
    }

    if (!questionInput.trim()) return;

    setAskingQuestion(true);
    try {
      const res = await auctionApi.askQuestion(id, questionInput.trim());
      setQuestionInput('');
      setQuestions((prev) => [res.question, ...prev]);
    } catch (err) {
      setQaError(err.message || 'Failed to submit question.');
    } finally {
      setAskingQuestion(false);
    }
  };

  const handleAnswerQuestion = async (qId) => {
    const text = replyInputs[qId];
    if (!text || !text.trim()) return;

    setAnsweringId(qId);
    try {
      const res = await auctionApi.answerQuestion(id, qId, text.trim());
      setQuestions((prev) => prev.map((q) => (q._id === qId ? res.question : q)));
      setReplyInputs((prev) => ({ ...prev, [qId]: '' }));
    } catch (err) {
      alert(err.message || 'Failed to submit answer.');
    } finally {
      setAnsweringId(null);
    }
  };

  const images =
    auction.images && auction.images.length > 0
      ? auction.images
      : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];

  const selectedCandidate = eligibleBidders.find((b) => b.bidderId === selectedWinnerId);
  const highestBidderCandidate = eligibleBidders.find((b) => b.isLeading) || eligibleBidders[0];
  const isOverridingHighest =
    selectedCandidate &&
    highestBidderCandidate &&
    selectedCandidate.bidderId !== highestBidderCandidate.bidderId;

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
            <div className={styles.detailsHeader}>
              <h2 className={styles.sectionTitle}>Item Description</h2>
              {isLocked && (
                <span className={styles.lockBadge} title="Terms locked because bids exist">
                  🔒 Listing Terms Permanently Locked
                </span>
              )}
            </div>
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
              {auction.maxPrice && (
                <div className={styles.specItem}>
                  <span className={styles.specLabel}>Max Price / Cap</span>
                  <span className={styles.specValue} style={{ color: '#b45309', fontWeight: '700' }}>
                    ₹{auction.maxPrice} (Instant Match)
                  </span>
                </div>
              )}
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

          {/* Item Q&A Section */}
          <div className={styles.qaCard}>
            <div className={styles.qaCardHeader}>
              <h2 className={styles.qaHeading}>
                💬 Questions Before Bidding ({questions.length})
              </h2>
            </div>
            <p className={styles.qaSubtext}>
              Buyers can ask specific details before bidding (e.g. brakes, markings, display). Seller answers are public to prevent repeat questions.
            </p>

            {qaError && <div className={styles.bidAlertError} style={{ marginBottom: '14px' }}>{qaError}</div>}

            <div className={styles.qaList}>
              {questions.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                  No questions asked yet. Be the first to ask the seller before bidding!
                </p>
              ) : (
                questions.map((q) => (
                  <div key={q._id} className={styles.qaItem}>
                    <div className={styles.questionRow}>
                      <span className={styles.qaAvatar}>🙋</span>
                      <div className={styles.questionContent}>
                        <div className={styles.questionAuthorRow}>
                          <span className={styles.questionAuthor}>{q.asker?.name || 'Campus Student'}</span>
                          <span>{new Date(q.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className={styles.questionText}>{q.question}</p>
                      </div>
                    </div>

                    {q.answer ? (
                      <div className={styles.answerRow}>
                        <span className={styles.qaAvatar}>💬</span>
                        <div className={styles.answerContent}>
                          <div className={styles.answerAuthorRow}>
                            <span>👑 Seller Answer</span>
                            <span>{new Date(q.answeredAt || q.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className={styles.answerText}>{q.answer}</p>
                        </div>
                      </div>
                    ) : isSeller ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAnswerQuestion(q._id);
                        }}
                        className={styles.sellerReplyForm}
                      >
                        <input
                          type="text"
                          placeholder="Write a public answer for all bidders..."
                          value={replyInputs[q._id] || ''}
                          onChange={(e) =>
                            setReplyInputs((prev) => ({ ...prev, [q._id]: e.target.value }))
                          }
                          className={styles.sellerReplyInput}
                          required
                          disabled={answeringId === q._id}
                        />
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                          disabled={answeringId === q._id || !replyInputs[q._id]?.trim()}
                        >
                          {answeringId === q._id ? 'Answering...' : 'Reply'}
                        </button>
                      </form>
                    ) : (
                      <p className={styles.noAnswerPending}>⏳ Awaiting seller response...</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Buyer Question Submission Box */}
            {!isSeller && (
              <form onSubmit={handleAskQuestion} className={styles.askForm}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
                  Ask the Seller a Question:
                </label>
                <textarea
                  placeholder="e.g. Does the brake cable need replacement? Any missing accessories?"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  className={styles.askTextarea}
                  rows={2}
                  maxLength={500}
                  required
                  disabled={askingQuestion}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="btn btn-secondary"
                    style={{ fontSize: '13px' }}
                    disabled={askingQuestion || !questionInput.trim()}
                  >
                    {askingQuestion ? 'Submitting...' : 'Post Question'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Bidding Box & Bid History */}
        <div className={styles.rightCol}>
          {/* Auction Overview & Action Card */}
          <div className={styles.bidCard}>
            <div className={styles.timerRow}>
              <span className={styles.timeLabel}>
                {auction.closedEarly ? 'Auction Closed Early:' : 'Time Remaining:'}
              </span>
              <CountdownTimer closingAt={auction.closingAt} status={auction.status} />
            </div>

            {/* Anti-Sniping Extension Banner */}
            {(auction.extendedByAntiSnipe || antiSnipeAlert) && (
              <div className={styles.antiSnipeBanner}>
                <span className={styles.antiSnipeIcon}>⏱️</span>
                <div>
                  <div className={styles.antiSnipeTitle}>Anti-Sniping Active (+60s Extension)!</div>
                  <p className={styles.antiSnipeDesc}>
                    A bid was placed in the last 30 seconds. The auction has been extended by 60 seconds to prevent last-second sniping!
                  </p>
                </div>
              </div>
            )}

            <h1 className={styles.itemTitle}>{auction.title}</h1>

            <div className={styles.priceContainer}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className={styles.priceLabel}>
                    {auction.bidCount > 0 ? 'Current Leading Bid' : 'Starting Bid'}
                  </span>
                  <div className={styles.currentPrice}>
                    ₹{auction.currentBid !== null ? auction.currentBid : auction.startingPrice}
                  </div>
                </div>

                {auction.maxPrice && (
                  <div style={{ textAlign: 'right' }}>
                    <span className={styles.priceLabel} style={{ color: '#b45309' }}>
                      Max Price / Ceiling
                    </span>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#b45309' }}>
                      ₹{auction.maxPrice}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auto-completes at this price</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                <span className={styles.bidCountBadge}>
                  {auction.bidCount} {auction.bidCount === 1 ? 'bid placed' : 'bids placed'}
                </span>
                {auction.hitMaxPrice && (
                  <span style={{ fontSize: '12px', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                    🎯 Max Price Reached!
                  </span>
                )}
              </div>
            </div>

            {/* Max Price Hit Banner */}
            {auction.hitMaxPrice && (
              <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', padding: '12px 14px', margin: '14px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>🎯</span>
                <div>
                  <strong style={{ color: '#065f46', fontSize: '14px' }}>Maximum Price (₹{auction.maxPrice}) Hit!</strong>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#047857' }}>
                    Bidding completed immediately because the seller's ceiling price was reached. Buyer and seller are matched!
                  </p>
                </div>
              </div>
            )}

            {/* Early Closure Audit Banner */}
            {auction.closedEarly && !auction.hitMaxPrice && (
              <div className={styles.earlyCloseBanner}>
                <span style={{ fontSize: '18px' }}>⚡</span>
                <div>
                  <strong>Closed Early by Seller</strong>
                  <p>
                    {auction.closedEarlyAt
                      ? new Date(auction.closedEarlyAt).toLocaleString()
                      : 'Closed early before scheduled deadline.'}
                  </p>
                  {auction.winnerSelectionMethod === 'seller_selected' && (
                    <span className={styles.overrideNotice}>
                      ⚠️ Winner selected manually by seller override
                    </span>
                  )}
                  {auction.winnerSelectionMethod === 'automatic_highest' && (
                    <span className={styles.highestNotice}>
                      🏆 Winner confirmed as highest accepted bid
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Bidding Form or State Messages */}
            {isAuctionOpen ? (
              isSeller ? (
                <div className={styles.sellerNotice}>
                  <p>👑 You are the seller of this auction.</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 12px' }}>
                    {isLocked
                      ? '🔒 Listing details are locked because bids have been accepted.'
                      : 'You may close this auction early at any time.'}
                  </p>

                  <button
                    onClick={() => setShowCloseEarlyModal(true)}
                    className="btn btn-secondary"
                    style={{ width: '100%', borderColor: 'var(--warning)', color: '#b45309' }}
                  >
                    ⚡ Close Auction Early
                  </button>
                </div>
              ) : (
                <>
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
                      max={auction.maxPrice || undefined}
                      step={auction.minIncrement}
                      className={styles.bidField}
                      required
                      disabled={submittingBid}
                    />
                    <button type="submit" className="btn btn-primary" disabled={submittingBid}>
                      {submittingBid ? 'Placing...' : 'Place Bid'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span className={styles.bidHint}>
                      Next min: ₹{minNextBid} (₹{auction.minIncrement} increment)
                    </span>
                    {auction.maxPrice && (
                      <button
                        type="button"
                        onClick={() => setBidInput(auction.maxPrice.toString())}
                        style={{ background: 'none', border: 'none', color: '#b45309', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                      >
                        ⚡ Buy Now for ₹{auction.maxPrice}
                      </button>
                    )}
                  </div>
                </form>

                {/* Automatic Proxy Bidding Feature */}
                <div className={styles.autoBidBox}>
                  <div className={styles.autoBidHeader}>
                    <span className={styles.autoBidTitle}>
                      🤖 Automatic Bidding (Proxy)
                    </span>
                    {auction.myAutoBidMax && (
                      <span className={styles.autoBidActiveBadge}>
                        Active Ceiling: ₹{auction.myAutoBidMax}
                      </span>
                    )}
                  </div>
                  <p className={styles.autoBidDesc}>
                    Set your maximum budget. BIDZONE will automatically place the minimum counter-bids to keep you in the lead up to your limit.
                  </p>

                  {autoBidErr && <div className={styles.bidAlertError} style={{ marginBottom: '8px' }}>{autoBidErr}</div>}
                  {autoBidMsg && <div className={styles.bidAlertSuccess} style={{ marginBottom: '8px' }}>{autoBidMsg}</div>}

                  <form onSubmit={handleSetAutoBid} className={styles.autoBidForm}>
                    <input
                      type="number"
                      placeholder={`Max ceiling (e.g. ₹${(auction.currentBid || auction.startingPrice) + auction.minIncrement * 3})`}
                      value={autoBidAmount}
                      onChange={(e) => setAutoBidAmount(e.target.value)}
                      min={minNextBid}
                      max={auction.maxPrice || undefined}
                      step={auction.minIncrement}
                      className={styles.autoBidField}
                      required
                      disabled={submittingAutoBid}
                    />
                    <button
                      type="submit"
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
                      disabled={submittingAutoBid}
                    >
                      {submittingAutoBid ? 'Setting...' : 'Set Auto-Bid'}
                    </button>
                  </form>
                </div>
              </>
            )
            ) : (
              <div className={styles.closedNotice}>
                <p>
                  {auction.hitMaxPrice
                    ? 'This auction reached its maximum buyout price and has completed!'
                    : auction.closedEarly
                    ? 'This auction was closed early by the seller.'
                    : 'This auction is no longer accepting bids.'}
                </p>
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
                  {auction.winner && (
                    <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)' }}>
                      Winner: {auction.winner?.name || 'Chosen Student'}
                    </span>
                  )}
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

            {/* Handover & Communication Section (Shown for matched buyer and seller) */}
            {(auction.status === 'handover_pending' || auction.status === 'completed' || auction.hitMaxPrice) &&
              (isSeller || isWinner) && (
                <div className={styles.handoverBox}>
                  <h4>🤝 Campus Handover & Communication</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Coordinate physical campus meetup, inspect the item, and confirm handover.
                  </p>

                  {/* Direct Contact / Mobile Number Exchange Card */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        📱 Direct Mobile Communication
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPhoneModal(true)}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                      >
                        {(isSeller && auction.handover?.sellerPhone) || (isWinner && auction.handover?.buyerPhone)
                          ? 'Edit My Number'
                          : '+ Enter Mobile Number'}
                      </button>
                    </div>

                    {/* Current User's Shared Phone */}
                    <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                      {isSeller ? (
                        auction.handover?.sellerPhone ? (
                          <span style={{ color: 'var(--success)' }}>
                            ✅ Your shared number: <strong>+91 {auction.handover.sellerPhone}</strong>
                          </span>
                        ) : (
                          <span style={{ color: '#b45309', fontWeight: '600' }}>
                            ⚠️ You haven't shared your mobile number yet.
                          </span>
                        )
                      ) : (
                        auction.handover?.buyerPhone ? (
                          <span style={{ color: 'var(--success)' }}>
                            ✅ Your shared number: <strong>+91 {auction.handover.buyerPhone}</strong>
                          </span>
                        ) : (
                          <span style={{ color: '#b45309', fontWeight: '600' }}>
                            ⚠️ You haven't shared your mobile number yet.
                          </span>
                        )
                      )}
                    </div>

                    {/* Matched Peer's Phone */}
                    <div>
                      {isSeller ? (
                        auction.handover?.buyerPhone ? (
                          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '8px 10px' }}>
                            <div style={{ fontWeight: '700', color: '#065f46', fontSize: '13px', marginBottom: '4px' }}>
                              👤 Buyer's Mobile: +91 {auction.handover.buyerPhone}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                              <a
                                href={`tel:+91${auction.handover.buyerPhone}`}
                                className="btn btn-primary"
                                style={{ fontSize: '11px', padding: '4px 8px', textDecoration: 'none' }}
                              >
                                📞 Call Buyer
                              </a>
                              <a
                                href={`https://wa.me/91${auction.handover.buyerPhone}?text=${encodeURIComponent(`Hi! I am the seller of "${auction.title}" on BIDZONE. Let's arrange our campus meetup!`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary"
                                style={{ fontSize: '11px', padding: '4px 8px', background: '#25D366', color: '#fff', borderColor: '#25D366', textDecoration: 'none' }}
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            ⏳ Waiting for buyer to enter their mobile number...
                          </p>
                        )
                      ) : (
                        auction.handover?.sellerPhone ? (
                          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '8px 10px' }}>
                            <div style={{ fontWeight: '700', color: '#065f46', fontSize: '13px', marginBottom: '4px' }}>
                              👤 Seller's Mobile: +91 {auction.handover.sellerPhone}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                              <a
                                href={`tel:+91${auction.handover.sellerPhone}`}
                                className="btn btn-primary"
                                style={{ fontSize: '11px', padding: '4px 8px', textDecoration: 'none' }}
                              >
                                📞 Call Seller
                              </a>
                              <a
                                href={`https://wa.me/91${auction.handover.sellerPhone}?text=${encodeURIComponent(`Hi! I am the winning buyer of "${auction.title}" on BIDZONE. Let's coordinate campus handover!`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary"
                                style={{ fontSize: '11px', padding: '4px 8px', background: '#25D366', color: '#fff', borderColor: '#25D366', textDecoration: 'none' }}
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            ⏳ Waiting for seller to enter their mobile number...
                          </p>
                        )
                      )}
                    </div>
                  </div>

                  {/* Handover Statuses */}
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

                  {auction.status === 'handover_pending' &&
                    ((isSeller && !auction.handover?.sellerConfirmed) ||
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
                        {new Date(b.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={styles.bidAmountWrapper}>
                      <span className={styles.bidAmount}>₹{b.amount}</span>
                      {b.isLeading && <span className={styles.leadingBadge}>Top Bid</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Number Pop-up Modal */}
      {showPhoneModal && (
        <div className={styles.modalOverlay} onClick={() => { setShowPhoneModal(false); setPhoneModalDismissed(true); }}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                📱 Exchange Mobile Number
              </h3>
              <button
                type="button"
                onClick={() => { setShowPhoneModal(false); setPhoneModalDismissed(true); }}
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 16px' }}>
              🎉 <strong>You have matched for "{auction.title}"!</strong> Enter your 10-digit mobile number so you and the {isSeller ? 'buyer' : 'seller'} can exchange contacts and coordinate campus handover.
            </p>

            {phoneError && <div className={styles.bidAlertError} style={{ marginBottom: '12px' }}>{phoneError}</div>}
            {phoneSuccess && <div className={styles.bidAlertSuccess} style={{ marginBottom: '12px' }}>{phoneSuccess}</div>}

            <form onSubmit={handleSharePhone}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                  Your Mobile Number
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    maxLength={10}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '15px', letterSpacing: '1px' }}
                    required
                    autoFocus
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Exchanged securely with the verified student matched on this listing.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setShowPhoneModal(false); setPhoneModalDismissed(true); }}
                  className="btn btn-secondary"
                  disabled={phoneSubmitting}
                >
                  I'll do this later
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={phoneSubmitting}
                >
                  {phoneSubmitting ? 'Sharing...' : 'Share My Number'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Early Close Modal */}
      {showCloseEarlyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCloseEarlyModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>⚡ Close Auction Early</h3>
              <p className={styles.modalSubtitle}>
                Closing this auction early will immediately stop all bidding permanently. This action is irreversible.
              </p>
            </div>

            {closeEarlyError && (
              <div className={styles.bidAlertError} style={{ marginBottom: '16px' }}>
                {closeEarlyError}
              </div>
            )}

            {auction.bidCount === 0 ? (
              <div className={styles.zeroBidsNotice}>
                <p>
                  No bids have been placed on this listing yet. If you close now, the auction will end as <strong>unsold</strong>.
                </p>
              </div>
            ) : (
              <div className={styles.biddersSelectionSection}>
                <label className={styles.modalSectionLabel}>
                  Select the Winning Bidder from Accepted Bids:
                </label>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Only students who placed at least one accepted bid are eligible. Their highest accepted bid amount is shown below.
                </p>

                <div className={styles.bidderRadioList}>
                  {eligibleBidders.map((cand) => (
                    <label
                      key={cand.bidderId}
                      className={`${styles.bidderRadioItem} ${selectedWinnerId === cand.bidderId ? styles.selectedRadio : ''}`}
                    >
                      <input
                        type="radio"
                        name="winnerSelection"
                        value={cand.bidderId}
                        checked={selectedWinnerId === cand.bidderId}
                        onChange={() => setSelectedWinnerId(cand.bidderId)}
                      />
                      <div className={styles.candidateDetails}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '700' }}>{cand.bidderName}</span>
                          {cand.isLeading && (
                            <span className={styles.highestPill}>Top Bidder 🏆</span>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Placed at {new Date(cand.placedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <span className={styles.candidateAmount}>₹{cand.highestBid}</span>
                    </label>
                  ))}
                </div>

                {/* Overriding Disclosure */}
                {isOverridingHighest && (
                  <div className={styles.overrideAlert}>
                    ⚠️ <strong>Seller Override Notice:</strong> You are selecting a bidder other than
                    the highest overall bidder (₹{highestBidderCandidate?.highestBid}). This will override
                    the normal highest-bid outcome, and this selection will be recorded in the audit trail.
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowCloseEarlyModal(false)}
                className="btn btn-secondary"
                disabled={closingEarly}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseAuctionEarly}
                className="btn btn-primary"
                style={{ backgroundColor: '#dc2626' }}
                disabled={closingEarly || (auction.bidCount > 0 && !selectedWinnerId)}
              >
                {closingEarly ? 'Closing Auction...' : 'Confirm & Close Early'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
