import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      // If logout fails server-side, clear local state anyway
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <span className={styles.navLogo}>BZ</span>
          <span className={styles.navTitle}>BIDZONE</span>
        </div>

        <div className={styles.navRight}>
          <span className={styles.navUser}>
            {user?.name}
          </span>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Welcome banner ─────────────────────────────────────────────── */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.avatarCircle}>
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <h1 className={styles.heroTitle}>Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p className={styles.heroSub}>
            {user?.email} &nbsp;&bull;&nbsp; Student Marketplace Account
          </p>
        </div>
      </header>

      {/* ── Dashboard cards ────────────────────────────────────────────── */}
      <main className={styles.main}>
        <p className={styles.sectionLabel}>What would you like to do today?</p>

        <div className={styles.cards}>
          {/* Buyer Dashboard */}
          <div className={styles.card}>
            <div className={`${styles.cardIcon} ${styles.buyerIcon}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72
                         a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <h2 className={styles.cardTitle}>Buyer Dashboard</h2>
            <p className={styles.cardDesc}>
              Browse active auctions, place bids and track items you are watching.
            </p>
            <div className={styles.comingSoon}>Coming soon</div>
          </div>

          {/* Seller Dashboard */}
          <div className={styles.card}>
            <div className={`${styles.cardIcon} ${styles.sellerIcon}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16
                         a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <h2 className={styles.cardTitle}>Seller Dashboard</h2>
            <p className={styles.cardDesc}>
              List items for auction, manage your listings and track your earnings.
            </p>
            <div className={styles.comingSoon}>Coming soon</div>
          </div>
        </div>

        {/* Account info strip */}
        <div className={styles.infoStrip}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Account ID</span>
            <span className={styles.infoValue}>{user?._id?.slice(-12)?.toUpperCase()}</span>
          </div>
          <div className={styles.infoDivider} />
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Member since</span>
            <span className={styles.infoValue}>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })
                : '--'}
            </span>
          </div>
          <div className={styles.infoDivider} />
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Role</span>
            <span className={styles.infoValue}>Buyer &amp; Seller</span>
          </div>
        </div>
      </main>
    </div>
  );
}
