import { Link } from 'react-router-dom';
import CountdownTimer from './CountdownTimer.jsx';
import StatusBadge from './StatusBadge.jsx';
import styles from './AuctionCard.module.css';

export default function AuctionCard({ auction }) {
  const displayImage =
    auction.images && auction.images.length > 0
      ? auction.images[0]
      : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';

  const conditionLabels = {
    new: 'Brand New',
    'like-new': 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  };

  const highestPrice = auction.currentBid !== null ? auction.currentBid : auction.startingPrice;
  const isBidPlaced = auction.currentBid !== null;

  return (
    <Link to={`/auction/${auction._id}`} className={styles.card}>
      <div className={styles.imageContainer}>
        <img src={displayImage} alt={auction.title} className={styles.image} loading="lazy" />
        <div className={styles.badgeTopLeft}>
          <span className={styles.conditionTag}>
            {conditionLabels[auction.condition] || auction.condition}
          </span>
        </div>
        <div className={styles.badgeTopRight}>
          <StatusBadge status={auction.status} />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.categoryRow}>
          <span className={styles.category}>{auction.category}</span>
          <CountdownTimer closingAt={auction.closingAt} status={auction.status} />
        </div>

        <h3 className={styles.title} title={auction.title}>
          {auction.title}
        </h3>

        <div className={styles.footer}>
          <div className={styles.priceSection}>
            <span className={styles.priceLabel}>
              {isBidPlaced ? 'Current Bid' : 'Starting Price'}
            </span>
            <div className={styles.price}>₹{highestPrice}</div>
          </div>

          <div className={styles.bidsBadge}>
            <span className={styles.bidsCount}>{auction.bidCount}</span>
            <span className={styles.bidsText}>{auction.bidCount === 1 ? 'bid' : 'bids'}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
