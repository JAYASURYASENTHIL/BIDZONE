import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chatApi, auctionApi } from '../api/api.js';
import styles from './ChatBot.module.css';

// Simple markdown formatter helper for chat bubbles
function formatChatMessage(text) {
  if (!text) return '';
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    let parsed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    parsed = parsed.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" class="chat-link">$1</a>'
    );

    return (
      <span
        key={idx}
        dangerouslySetInnerHTML={{ __html: parsed }}
        style={{ display: 'block', minHeight: line.trim() === '' ? '8px' : 'auto' }}
      />
    );
  });
}

export default function ChatBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionStatuses, setActionStatuses] = useState({});

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '👋 Hi! I am **BidBot**, your campus auction assistant!\n\nYou can ask me things like:\n• *"Select me phone within 5k"*\n• *"Find me a cycle under ₹2000 and bid for me"*\n• *"Who were bidding for my products?"*\n• *"How does max price work?"*',
      suggestions: [
        'Find cycle under ₹2000 and bid for me',
        'Phones under 5k',
        'Who is bidding on my products?',
        'What am I winning?',
        'How does anti-sniping work?',
      ],
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = { sender: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(query);
      const botMsg = {
        sender: 'bot',
        text: res.reply || 'Here is what I found for you.',
        items: res.items || null,
        proposedAction: res.proposedAction || null,
        suggestions: res.suggestions || [],
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `⚠️ Sorry, I ran into an issue looking that up: ${err.message || 'Please try again.'}`,
          suggestions: ['Explore Catalog', 'Sell an Item', 'Help'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBid = async (action, index) => {
    setActionProcessing(true);
    try {
      await auctionApi.placeBid(action.auctionId, action.suggestedBid);
      setActionStatuses((prev) => ({
        ...prev,
        [index]: { success: true, text: `🎉 Placed your bid of ₹${action.suggestedBid} on "${action.title}"!` },
      }));
    } catch (err) {
      setActionStatuses((prev) => ({
        ...prev,
        [index]: { success: false, text: `⚠️ Bid failed: ${err.message || 'Try again'}` },
      }));
    } finally {
      setActionProcessing(false);
    }
  };

  const handleSetAutoBid = async (action, index) => {
    setActionProcessing(true);
    try {
      await auctionApi.setAutoBid(action.auctionId, action.maxBudget);
      setActionStatuses((prev) => ({
        ...prev,
        [index]: { success: true, text: `🤖 Auto-bid ceiling set to ₹${action.maxBudget} on "${action.title}"!` },
      }));
    } catch (err) {
      setActionStatuses((prev) => ({
        ...prev,
        [index]: { success: false, text: `⚠️ Auto-bid failed: ${err.message || 'Try again'}` },
      }));
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={styles.launcherBtn}
        aria-label="Toggle BidBot Assistant"
        title="Open Smart Campus Auction Assistant"
      >
        <span className={styles.launcherIcon}>{isOpen ? '✕' : '🤖'}</span>
        <span>{isOpen ? 'Close' : 'Ask BidBot'}</span>
        {!isOpen && <span className={styles.launcherBadge} />}
      </button>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerInfo}>
              <div className={styles.botAvatar}>🤖</div>
              <div>
                <h3 className={styles.botTitle}>BidBot • Smart Assistant</h3>
                <p className={styles.botSubtitle}>Ask about deals, bidders, or rules</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to="/assistant"
                onClick={() => setIsOpen(false)}
                style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}
                title="Open full page assistant"
              >
                Full Tab ↗
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={styles.closeBtn}
                title="Close Chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className={styles.messagesContainer}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${styles.messageRow} ${
                  msg.sender === 'user' ? styles.userRow : styles.botRow
                }`}
              >
                <div
                  className={
                    msg.sender === 'user' ? styles.userBubble : styles.botBubble
                  }
                >
                  {msg.sender === 'user' ? (
                    msg.text
                  ) : (
                    <div>
                      {formatChatMessage(msg.text)}

                      {/* Embedded recommendation cards */}
                      {msg.items && msg.items.length > 0 && (
                        <div className={styles.itemsGrid}>
                          {msg.items.map((item) => (
                            <Link
                              key={item._id}
                              to={`/auction/${item._id}`}
                              className={styles.itemCard}
                              onClick={() => setIsOpen(false)}
                            >
                              <img
                                src={
                                  item.images && item.images.length > 0
                                    ? item.images[0]
                                    : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=80'
                                }
                                alt={item.title}
                                className={styles.itemImg}
                              />
                              <div className={styles.itemDetails}>
                                <div className={styles.itemTitle}>{item.title}</div>
                                <div className={styles.itemMeta}>
                                  <span className={styles.itemPrice}>
                                    ₹{item.currentPrice}
                                  </span>
                                  {item.maxPrice && (
                                    <span className={styles.itemCap}>
                                      Cap: ₹{item.maxPrice}
                                    </span>
                                  )}
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    • {item.bidCount} bids
                                  </span>
                                </div>
                              </div>
                              <span className={styles.viewAction}>Bid →</span>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Proposed Action Confirmation Card */}
                      {msg.proposedAction && msg.proposedAction.type === 'bid_confirmation' && (
                        <div style={{ marginTop: '10px', padding: '10px', background: '#fff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#1d4ed8', marginBottom: '6px' }}>
                            ⚡ Explicit Authorization Required
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-main)', marginBottom: '8px' }}>
                            Item: <strong>{msg.proposedAction.title}</strong>
                            <br />
                            Suggested Bid: <strong>₹{msg.proposedAction.suggestedBid}</strong> | Max Cap: <strong>₹{msg.proposedAction.maxBudget}</strong>
                          </div>

                          {actionStatuses[index] ? (
                            <div style={{ fontSize: '11px', fontWeight: '600', color: actionStatuses[index].success ? '#047857' : '#dc2626' }}>
                              {actionStatuses[index].text}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleConfirmBid(msg.proposedAction, index)}
                                className="btn btn-primary"
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                                disabled={actionProcessing}
                              >
                                ⚡ Confirm Bid of ₹{msg.proposedAction.suggestedBid}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetAutoBid(msg.proposedAction, index)}
                                className="btn btn-secondary"
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                                disabled={actionProcessing}
                              >
                                🤖 Set Auto-Bid to ₹{msg.proposedAction.maxBudget}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className={`${styles.messageRow} ${styles.botRow}`}>
                <div className={styles.typingIndicator}>
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Dynamic Suggestion Chips */}
          {messages.length > 0 &&
            messages[messages.length - 1].suggestions &&
            messages[messages.length - 1].suggestions.length > 0 && (
              <div className={styles.suggestionsArea}>
                {messages[messages.length - 1].suggestions.map((suggestion, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => handleSend(suggestion)}
                    className={styles.chip}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className={styles.inputForm}
          >
            <input
              type="text"
              placeholder="Ask anything... (e.g. phone under 5k)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={styles.inputField}
              disabled={loading}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!input.trim() || loading}
              title="Send Message"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
