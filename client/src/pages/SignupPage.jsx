import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './Auth.module.css';

export default function SignupPage() {
  const { signup }  = useAuth();
  const navigate    = useNavigate();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // --- Client-side validation (mirrors backend rules exactly) ---------------
  // Backend: name 2-100 chars, email valid, password min 8 + uppercase + number
  function validate() {
    if (!name.trim())  return 'Name is required.';
    if (name.trim().length < 2)  return 'Name must be at least 2 characters.';
    if (name.trim().length > 100) return 'Name must not exceed 100 characters.';
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
    if (!password)     return 'Password is required.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      await signup(name.trim(), email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Password strength indicator
  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthClass = [styles.s0, styles.s1, styles.s2, styles.s3, styles.s4][strength];

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.logo}>BZ</span>
          <h1 className={styles.title}>BIDZONE</h1>
          <p className={styles.subtitle}>Campus Auction Marketplace</p>
        </div>

        <h2 className={styles.heading}>Create your account</h2>
        <p className={styles.subheading}>Join the campus marketplace</p>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span className={styles.errorIcon}>!</span>
            {error}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>Full Name</label>
            <input
              id="name"
              type="text"
              className={styles.input}
              placeholder="Jayasurya Senthil"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              disabled={loading}
              required
            />
          </div>

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
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
              required
            />
            {password && (
              <div className={styles.strengthRow}>
                <div className={styles.strengthBar}>
                  <div className={`${styles.strengthFill} ${strengthClass}`}
                       style={{ width: `${strength * 25}%` }} />
                </div>
                <span className={`${styles.strengthLabel} ${strengthClass}`}>
                  {strengthLabel}
                </span>
              </div>
            )}
            <p className={styles.hint}>
              At least 8 characters, one uppercase letter and one number
            </p>
          </div>

          <button
            type="submit"
            className={styles.btn}
            disabled={loading}
          >
            {loading
              ? <span className={styles.spinner} aria-label="Creating account..." />
              : 'Create Account'}
          </button>
        </form>

        <p className={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
