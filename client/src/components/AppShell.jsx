import Navbar from './Navbar.jsx';

export default function AppShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, paddingBottom: '60px' }}>{children}</main>
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          backgroundColor: '#fff',
          padding: '24px 0',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '13px',
        }}
      >
        <div className="container">
          <p>© {new Date().getFullYear()} BIDZONE — Campus Auction Marketplace. Built for university students.</p>
        </div>
      </footer>
    </div>
  );
}
