import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './Auth.module.css';

export default function LoginPage() {
  const { login }   = useAuth();
  const navigate    = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // --- Client-side validation (mirrors backend rules) ----------------------
  function validate() {
    if (!email.trim())    return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
    if (!password)        return 'Password is required.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // Use the server's message directly — it's already generic for security
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.logo}>BZ</span>
          <h1 className={styles.title}>BIDZONE</h1>
          <p className={styles.subtitle}>Campus Auction Marketplace</p>
        </div>

        <h2 className={styles.heading}>Welcome back</h2>
        <p className={styles.subheading}>Sign in to your student account</p>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span className={styles.errorIcon}>!</span>
            {error}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="you@college.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.btn}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} aria-label="Signing in..." /> : 'Sign In'}
          </button>
        </form>

        <p className={styles.switchText}>
          New to BIDZONE?{' '}
          <Link to="/signup" className={styles.link}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
