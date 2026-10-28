import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { auctionApi } from '../api/api.js';
import AuctionCard from '../components/AuctionCard.jsx';
import styles from './ExplorePage.module.css';

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || 'all';
  const condition = searchParams.get('condition') || 'all';
  const sort = searchParams.get('sort') || 'ending_soon';

  const [searchInput, setSearchInput] = useState(search);

  const categories = [
    { id: 'all', label: 'All Items', icon: '🏷️' },
    { id: 'cycles', label: 'Cycles', icon: '🚲' },
    { id: 'calculators', label: 'Calculators', icon: '🔢' },
    { id: 'books', label: 'Books', icon: '📚' },
    { id: 'electronics', label: 'Electronics', icon: '💻' },
    { id: 'others', label: 'Others', icon: '📦' },
  ];

  useEffect(() => {
    setLoading(true);
    auctionApi
      .list({
        search,
        category: category !== 'all' ? category : undefined,
        condition: condition !== 'all' ? condition : undefined,
        sort,
      })
      .then((res) => {
        setAuctions(res.auctions || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load auctions.');
      })
      .finally(() => setLoading(false));
  }, [search, category, condition, sort]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      newParams.set('search', searchInput.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const setCategoryFilter = (catId) => {
    const newParams = new URLSearchParams(searchParams);
    if (catId === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', catId);
    }
    setSearchParams(newParams);
  };

  const handleFilterChange = (key, val) => {
    const newParams = new URLSearchParams(searchParams);
    if (val === 'all' || !val) {
      newParams.delete(key);
    } else {
      newParams.set(key, val);
    }
    setSearchParams(newParams);
  };

  return (
    <div className={styles.page}>
      {/* Hero Banner */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <span className={styles.badge}>Campus Auction Marketplace</span>
            <h1 className={styles.headline}>Buy & Sell Verified Campus Gear</h1>
            <p className={styles.subheadline}>
              Place real-time bids on cycles, calculators, books, and gadgets from fellow students. Safe on-campus handover.
            </p>

            <form onSubmit={handleSearchSubmit} className={styles.searchBox}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search cycles, casio fx-991, engineering textbooks..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={styles.searchInput}
              />
              <button type="submit" className={`btn btn-primary ${styles.searchBtn}`}>
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Main Catalog */}
      <section className="container">
        {/* Category Pills */}
        <div className={styles.categoryBar}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`${styles.categoryPill} ${category === cat.id ? styles.activePill : ''}`}
            >
              <span className={styles.catIcon}>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Filter & Sort Controls */}
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Condition:</label>
            <select
              value={condition}
              onChange={(e) => handleFilterChange('condition', e.target.value)}
              className={styles.selectInput}
            >
              <option value="all">All Conditions</option>
              <option value="new">Brand New</option>
              <option value="like-new">Like New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Sort by:</label>
            <select
              value={sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className={styles.selectInput}
            >
              <option value="ending_soon">Ending Soonest</option>
              <option value="newest">Recently Listed</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Content States */}
        {loading ? (
          <div className={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="btn btn-secondary" style={{ marginTop: '12px' }}>
              Retry
            </button>
          </div>
        ) : auctions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📦</div>
            <h3 className={styles.emptyTitle}>No active auctions found</h3>
            <p className={styles.emptySubtitle}>
              {search || category !== 'all' || condition !== 'all'
                ? 'Try adjusting your search terms or filters.'
                : 'Be the first student to list an item for auction on campus!'}
            </p>
            <Link to="/sell" className="btn btn-primary" style={{ marginTop: '16px' }}>
              + List an Item for Sale
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {auctions.map((auction) => (
              <AuctionCard key={auction._id} auction={auction} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
