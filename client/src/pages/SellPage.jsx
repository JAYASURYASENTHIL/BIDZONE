import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auctionApi } from '../api/api.js';
import styles from './SellPage.module.css';

export default function SellPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('cycles');
  const [condition, setCondition] = useState('good');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minIncrement, setMinIncrement] = useState('10');

  // Default closing time: 3 days from now
  const defaultCloseDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const formattedDefaultClose = defaultCloseDate.toISOString().slice(0, 16);
  const [closingAt, setClosingAt] = useState(formattedDefaultClose);

  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      setError('You can upload a maximum of 5 photos.');
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    // Create preview URLs
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !description.trim() || !startingPrice || !maxPrice || !closingAt) {
      setError('Please fill out all required fields, including starting price and max price.');
      return;
    }

    if (Number(startingPrice) < 1) {
      setError('Starting price must be at least ₹1.');
      return;
    }

    if (Number(maxPrice) <= Number(startingPrice)) {
      setError('Maximum price must be strictly greater than the starting price (e.g. Starting: ₹500, Max Cap: ₹1200).');
      return;
    }

    if (new Date(closingAt) <= new Date()) {
      setError('Closing date must be in the future.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category', category);
      formData.append('condition', condition);
      formData.append('description', description.trim());
      formData.append('startingPrice', startingPrice);
      formData.append('maxPrice', maxPrice);
      formData.append('minIncrement', minIncrement || '10');
      formData.append('closingAt', closingAt);

      images.forEach((img) => {
        formData.append('images', img);
      });

      const res = await auctionApi.create(formData);
      navigate(`/auction/${res.auction._id}`);
    } catch (err) {
      setError(err.message || 'Failed to list item for auction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>List an Item for Auction</h1>
        <p className={styles.subtitle}>
          Set a starting price, max buyout ceiling, and deadline. Verified students across campus can bid on your gear!
        </p>
      </div>

      <div className={styles.card}>
        {error && <div className={styles.alertError}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Title */}
          <div className={styles.field}>
            <label className={styles.label}>
              Listing Title <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Hero Sprint Pro Cycle (21-Speed Gear) with Lock"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
              maxLength={120}
              required
            />
          </div>

          {/* Category & Condition */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={styles.select}
              >
                <option value="cycles">🚲 Cycles & Transportation</option>
                <option value="calculators">🔢 Scientific Calculators</option>
                <option value="books">📚 Course Books & Study Material</option>
                <option value="electronics">💻 Electronics & Accessories</option>
                <option value="others">📦 Other Campus Gear</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className={styles.select}
              >
                <option value="new">Brand New (Unused)</option>
                <option value="like-new">Like New (Mint condition)</option>
                <option value="good">Good (Normal minor wear)</option>
                <option value="fair">Fair (Fully functional, visible wear)</option>
                <option value="poor">Poor (Has noticeable issues)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label}>
              Description <span className={styles.required}>*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Mention details like usage duration, included accessories (charger, bill, keys), reason for selling, and campus pickup spot..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              maxLength={2000}
              required
            />
          </div>

          {/* Photos Upload */}
          <div className={styles.field}>
            <label className={styles.label}>Item Photos (Up to 5)</label>
            <div className={styles.photoUploadArea}>
              <input
                type="file"
                id="photoInput"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                disabled={images.length >= 5}
              />
              <label htmlFor="photoInput" className={styles.uploadBox}>
                <span style={{ fontSize: '24px' }}>📷</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                  {images.length >= 5 ? 'Max photos reached' : 'Click to select photos'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  PNG, JPG, WEBP up to 5MB each
                </span>
              </label>

              {previews.length > 0 && (
                <div className={styles.previewGrid}>
                  {previews.map((src, i) => (
                    <div key={i} className={styles.previewItem}>
                      <img src={src} alt="Preview" className={styles.previewImg} />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className={styles.removeBtn}
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pricing & Deadline */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>
                Starting Price (₹) <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                min="1"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Max Price / Ceiling (₹) <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 1500 (Instant buyout cap)"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                min={Number(startingPrice) ? Number(startingPrice) + 1 : 1}
                className={styles.input}
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                ⚡ When hit, bidding completes immediately and matches buyer.
              </span>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Minimum Bid Increment (₹)</label>
              <input
                type="number"
                placeholder="10"
                value={minIncrement}
                onChange={(e) => setMinIncrement(e.target.value)}
                min="1"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Auction Closes At <span className={styles.required}>*</span>
              </label>
              <input
                type="datetime-local"
                value={closingAt}
                onChange={(e) => setClosingAt(e.target.value)}
                className={styles.input}
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating Auction...' : 'Publish Auction Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
