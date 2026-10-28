import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { chatApi } from '../api/api.js';
import styles from './ChatBot.module.css';

// Simple markdown formatter helper for chat bubbles
function formatChatMessage(text) {
  if (!text) return '';
  // Split into paragraphs / lines
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    // Replace **bold** with <strong>
    let parsed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Replace *italic* with <em>
    parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Replace markdown links [label](url) with <a> tags
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
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '👋 Hi! I am **BidBot**, your campus auction assistant!\n\nYou can ask me things like:\n• *"Select me phone within 5k"*\n• *"Who were bidding for my products?"*\n• *"What items am I winning?"*\n• *"How does max price work?"*',
      suggestions: [
        'Phones under 5k',
        'Cycles under 3000',
        'Who is bidding on my products?',
        'What am I winning?',
        'How does max price work?',
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

    // Add user message
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
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={styles.closeBtn}
              title="Close Chat"
            >
              ✕
            </button>
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
