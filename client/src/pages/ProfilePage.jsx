import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h1 className={styles.name}>{user?.name}</h1>
            <p className={styles.email}>{user?.email}</p>
            <span className={styles.roleTag}>Verified Campus Member</span>
          </div>
        </div>

        <div className={styles.infoSection}>
          <h3 className={styles.sectionTitle}>Account Details</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Account ID</span>
              <span className={styles.infoValue}>{user?._id}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Member Since</span>
              <span className={styles.infoValue}>
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Student Privilege</span>
              <span className={styles.infoValue}>Full Access (Buy & Sell)</span>
            </div>
          </div>
        </div>

        <div className={styles.quickLinks}>
          <h3 className={styles.sectionTitle}>Quick Navigation</h3>
          <div className={styles.linksGrid}>
            <Link to="/explore" className={styles.linkCard}>
              <span className={styles.linkIcon}>🏷️</span>
              <div>
                <strong>Explore Marketplace</strong>
                <p>Browse active auctions</p>
              </div>
            </Link>
            <Link to="/sell" className={styles.linkCard}>
              <span className={styles.linkIcon}>➕</span>
              <div>
                <strong>Sell an Item</strong>
                <p>Post a new listing</p>
              </div>
            </Link>
            <Link to="/my-bids" className={styles.linkCard}>
              <span className={styles.linkIcon}>🔨</span>
              <div>
                <strong>My Bids</strong>
                <p>Track your active bids</p>
              </div>
            </Link>
            <Link to="/seller-dashboard" className={styles.linkCard}>
              <span className={styles.linkIcon}>📋</span>
              <div>
                <strong>My Listings</strong>
                <p>Manage items you're selling</p>
              </div>
            </Link>
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={handleLogout} className="btn btn-danger">
            Sign Out of BIDZONE
          </button>
        </div>
      </div>
    </div>
  );
}
