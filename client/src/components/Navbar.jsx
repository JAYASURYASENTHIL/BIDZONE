import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { notificationApi } from '../api/api.js';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      notificationApi
        .getAll()
        .then((data) => setUnreadCount(data.unreadCount || 0))
        .catch(() => {});
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.navContainer}`}>
        {/* Brand Logo */}
        <Link to="/explore" className={styles.brand}>
          <div className={styles.logoBadge}>BZ</div>
          <span className={styles.brandName}>BIDZONE</span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className={styles.desktopNav}>
          <NavLink
            to="/explore"
            className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink)}
          >
            Explore
          </NavLink>
          <NavLink
            to="/assistant"
            className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink)}
          >
            🤖 AI Assistant
          </NavLink>
          <NavLink
            to="/my-bids"
            className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink)}
          >
            My Bids
          </NavLink>
          <NavLink
            to="/seller-dashboard"
            className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink)}
          >
            My Listings
          </NavLink>
          <NavLink
            to="/purchases"
            className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.activeLink}` : styles.navLink)}
          >
            Sales & Handover
          </NavLink>
        </nav>

        {/* Right Action buttons */}
        <div className={styles.actions}>
          <Link to="/sell" className={`btn btn-primary ${styles.sellBtn}`}>
            <span>+ Sell Item</span>
          </Link>

          {user && (
            <Link to="/notifications" className={styles.notifBtn} title="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && <span className={styles.notifBadge}>{unreadCount}</span>}
            </Link>
          )}

          {user ? (
            <div className={styles.userMenu}>
              <Link to="/profile" className={styles.userProfileBtn}>
                <div className={styles.userAvatar}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className={styles.userName}>{user.name}</span>
              </Link>
              <button onClick={handleLogout} className={styles.logoutBtn} title="Sign Out">
                Sign Out
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-secondary">
              Sign In
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className={styles.mobileToggle}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <Link to="/explore" onClick={() => setMobileMenuOpen(false)}>Explore Auctions</Link>
          <Link to="/assistant" onClick={() => setMobileMenuOpen(false)}>🤖 AI Assistant</Link>
          <Link to="/my-bids" onClick={() => setMobileMenuOpen(false)}>My Bids</Link>
          <Link to="/seller-dashboard" onClick={() => setMobileMenuOpen(false)}>My Listings</Link>
          <Link to="/purchases" onClick={() => setMobileMenuOpen(false)}>Sales & Handover</Link>
          <Link to="/sell" onClick={() => setMobileMenuOpen(false)}>+ Sell an Item</Link>
          <Link to="/notifications" onClick={() => setMobileMenuOpen(false)}>Notifications ({unreadCount})</Link>
          <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>My Profile</Link>
          {user && (
            <button onClick={handleLogout} className={styles.mobileLogout}>
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
