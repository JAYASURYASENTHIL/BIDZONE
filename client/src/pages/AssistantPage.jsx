import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chatApi, auctionApi } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import styles from './AssistantPage.module.css';

function formatChatMessage(text) {
  if (!text) return '';
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    let parsed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    parsed = parsed.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" class="chat-link" style="color: var(--primary); text-decoration: underline;">$1</a>'
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

export default function AssistantPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionStatuses, setActionStatuses] = useState({});

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `👋 Hi ${user?.name ? `**${user.name}**` : 'there'}! I am your **BIDZONE AI Assistant**.\n\n` +
        `Tell me in plain language what you need, like:\n` +
        `• *"Find me a cycle under ₹2,000 and bid for me"*\n` +
        `• *"Scientific calculator under ₹400"*\n` +
        `• *"Who were bidding for my products?"*\n` +
        `• *"What items am I currently winning?"*`,
      suggestions: [
        'Find cycle under ₹2,000 and bid for me',
        'Scientific calculator under ₹400',
        'Who is bidding on my products?',
        'What am I winning?',
        'How does anti-sniping work?',
        'How does max price work?',
      ],
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

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
    if (!user) {
      navigate('/login');
      return;
    }

    setActionProcessing(true);
    try {
      const res = await auctionApi.placeBid(action.auctionId, action.suggestedBid);
      setActionStatuses((prev) => ({
        ...prev,
        [index]: { success: true, text: `🎉 Placed your authorized bid of ₹${action.suggestedBid} on "${action.title}"!` },
      }));

      // Add assistant confirmation bubble
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `✅ **Bid Placed!** You are now leading with **₹${action.suggestedBid}** on [${action.title}](/auction/${action.auctionId}). I'll notify you if you get outbid or when the auction concludes.`,
          suggestions: ['What am I winning?', 'Explore other auctions'],
        },
      ]);
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
    if (!user) {
      navigate('/login');
      return;
    }

    setActionProcessing(true);
    try {
      const res = await auctionApi.setAutoBid(action.auctionId, action.maxBudget);
      setActionStatuses((prev) => ({
        ...prev,
        [index]: { success: true, text: `🤖 Auto-bid ceiling of ₹${action.maxBudget} set for "${action.title}"!` },
      }));

      // Add assistant confirmation bubble
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `🤖 **Auto-Bidding Configured!** I will automatically place counter-bids on [${action.title}](/auction/${action.auctionId}) to keep you ahead, never exceeding your limit of **₹${action.maxBudget}**.`,
          suggestions: ['What am I winning?', 'Check my alerts'],
        },
      ]);
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
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.robotBadge}>🤖</span>
          <div>
            <h1 className={styles.title}>AI Campus Assistant</h1>
            <p className={styles.subtitle}>
              Ask questions, discover campus deals, and authorize intelligent automated bidding.
            </p>
          </div>
        </div>
      </div>

      {/* Safety & Integrity Guarantee Card */}
      <div className={styles.safetyCard}>
        <div className={styles.safetyHeader}>
          <span>🛡️</span>
          <span>BIDZONE AI Assistant Safety Commitments</span>
        </div>
        <div className={styles.safetyGrid}>
          <div className={styles.safetyItem}>
            <span className={styles.safetyItemTitle}>1. Never Acts Without Go-Ahead</span>
            <p className={styles.safetyItemDesc}>
              The assistant never places bids autonomously. You must explicitly review and confirm every action.
            </p>
          </div>
          <div className={styles.safetyItem}>
            <span className={styles.safetyItemTitle}>2. Never Exceeds Your Agreed Limit</span>
            <p className={styles.safetyItemDesc}>
              Automatic counter-bids stop strictly at your chosen budget ceiling.
            </p>
          </div>
          <div className={styles.safetyItem}>
            <span className={styles.safetyItemTitle}>3. Never Reveals Student Accounts</span>
            <p className={styles.safetyItemDesc}>
              Private proxy limits and sensitive student credentials are kept 100% confidential.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <div className={styles.chatBox}>
        {/* Messages */}
        <div className={styles.messagesArea}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`${styles.messageRow} ${
                msg.sender === 'user' ? styles.userRow : styles.botRow
              }`}
            >
              <div
                className={`${styles.avatar} ${
                  msg.sender === 'user' ? styles.userAvatar : styles.botAvatar
                }`}
              >
                {msg.sender === 'user' ? (user?.name ? user.name[0].toUpperCase() : 'U') : '🤖'}
              </div>

              <div
                className={`${styles.bubble} ${
                  msg.sender === 'user' ? styles.userBubble : styles.botBubble
                }`}
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
                          >
                            <img
                              src={
                                item.images && item.images.length > 0
                                  ? item.images[0]
                                  : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80'
                              }
                              alt={item.title}
                              className={styles.itemImg}
                            />
                            <div className={styles.itemInfo}>
                              <span className={styles.itemTitle}>{item.title}</span>
                              <div className={styles.itemPriceRow}>
                                <span className={styles.itemPrice}>₹{item.currentPrice}</span>
                                <span className={styles.itemActionPill}>View & Bid →</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Proposed Action Confirmation Card */}
                    {msg.proposedAction && msg.proposedAction.type === 'bid_confirmation' && (
                      <div className={styles.actionCard}>
                        <div className={styles.actionHeader}>
                          <span>⚡</span>
                          <span>Student Authorization Required</span>
                        </div>
                        <div className={styles.actionDetails}>
                          Item: <strong>{msg.proposedAction.title}</strong>
                          <br />
                          Current Price: <strong>₹{msg.proposedAction.currentPrice}</strong> | Next Min: <strong>₹{msg.proposedAction.suggestedBid}</strong>
                        </div>

                        {actionStatuses[index] ? (
                          <div
                            className={styles.actionStatusMsg}
                            style={{
                              color: actionStatuses[index].success ? '#047857' : '#dc2626',
                            }}
                          >
                            {actionStatuses[index].text}
                          </div>
                        ) : (
                          <div className={styles.actionBtnGroup}>
                            <button
                              type="button"
                              onClick={() => handleConfirmBid(msg.proposedAction, index)}
                              className={styles.confirmBtn}
                              disabled={actionProcessing}
                            >
                              ⚡ Confirm Bid of ₹{msg.proposedAction.suggestedBid}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetAutoBid(msg.proposedAction, index)}
                              className={styles.autoBidBtn}
                              disabled={actionProcessing}
                            >
                              🤖 Set Auto-Bid to ₹{msg.proposedAction.maxBudget}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setActionStatuses((prev) => ({
                                  ...prev,
                                  [index]: { success: false, text: 'Action dismissed.' },
                                }))
                              }
                              className={styles.dismissBtn}
                              disabled={actionProcessing}
                            >
                              ✕ Dismiss
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
              <div className={`${styles.avatar} ${styles.botAvatar}`}>🤖</div>
              <div className={styles.typingIndicator}>
                <div className={styles.dot} />
                <div className={styles.dot} />
                <div className={styles.dot} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length > 0 &&
          messages[messages.length - 1].suggestions &&
          messages[messages.length - 1].suggestions.length > 0 && (
            <div className={styles.chipsContainer}>
              {messages[messages.length - 1].suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(s)}
                  className={styles.chip}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className={styles.inputForm}
        >
          <input
            type="text"
            placeholder="Ask me anything (e.g., 'Find me a cycle under ₹2000 and bid for me')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={styles.inputField}
            disabled={loading}
          />
          <button type="submit" className={styles.sendBtn} disabled={!input.trim() || loading}>
            <span>Ask Assistant</span>
            <span>➤</span>
          </button>
        </form>
      </div>
    </div>
  );
}
