import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import Question from '../models/Question.js';
import { callLLM } from '../services/llmService.js';

/**
 * Helper to parse budget / price numbers from natural text.
 * Handles: "5k" -> 5000, "within 5k", "under 5000", "below 3000", "under ₹2,500", etc.
 */
const extractBudget = (text) => {
  const clean = text.toLowerCase();

  const kMatch = clean.match(/(?:under|within|below|max|around|budget|<=?|at\s*most)?\s*₹?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  const numMatch = clean.match(/(?:under|within|below|max|budget|<=?|at\s*most|₹)\s*₹?\s*(\d{2,6})\b/i);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  const trailingMatch = clean.match(/\b(\d{2,6})\s*(?:rs|rupees|inr)\b/i);
  if (trailingMatch) {
    return parseInt(trailingMatch[1], 10);
  }

  return null;
};

/**
 * Helper to detect item category or keywords
 */
const extractKeywordsAndCategory = (text) => {
  const clean = text.toLowerCase();
  let category = null;
  const keywords = [];

  if (/\b(cycle|cycles|bicycle|bike|gear\s*cycle|hero|btwin)\b/i.test(clean)) {
    category = 'cycles';
    keywords.push('cycle');
  } else if (/\b(calc|calculator|calculators|fx|991|casio|scientific)\b/i.test(clean)) {
    category = 'calculators';
    keywords.push('calculator');
  } else if (/\b(book|books|textbook|textbooks|notes|material|author|novel)\b/i.test(clean)) {
    category = 'books';
    keywords.push('book');
  } else if (/\b(phone|mobile|smartphone|laptop|headphone|earphones|electronics|charger|watch|monitor|ipad|tablet)\b/i.test(clean)) {
    category = 'electronics';
    if (/\b(phone|mobile|smartphone|iphone|android)\b/i.test(clean)) keywords.push('phone', 'mobile');
    if (/\b(laptop|macbook|thinkpad)\b/i.test(clean)) keywords.push('laptop');
    if (/\b(headphone|earphones|airpods)\b/i.test(clean)) keywords.push('headphone');
  }

  const tokens = clean
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['select', 'show', 'find', 'give', 'within', 'under', 'below', 'price', 'with', 'want', 'need', 'some', 'good', 'best', 'for', 'the', 'bid'].includes(w));

  return { category, keywords: keywords.length > 0 ? keywords : tokens };
};

export const handleChatMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    const userId = req.session?.userId;
    const user = userId ? await User.findById(userId).select('name email') : null;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const queryText = message.trim();
    const cleanLower = queryText.toLowerCase();

    // Check if user is asking the assistant to bid for them
    const wantsToBid = /\b(bid\s*for\s*me|place\s*(?:a\s*)?bid|bid\s*on|help\s*me\s*bid|auto\s*bid)\b/i.test(cleanLower);

    // ──────────────────────────────────────────────────────────────────────────
    // 1. INTENT: Seller asks "who is bidding for my products / items?"
    // ──────────────────────────────────────────────────────────────────────────
    if (
      /\b(who\s*(?:is|are|were)?\s*bidding|bids?\s*on\s*my|my\s*bidders?|bidding\s*(?:on|for)\s*my\s*(?:products?|items?|auctions?|listings?))\b/i.test(cleanLower) ||
      (/\bmy\s*(?:products?|items?|listings?)\b/i.test(cleanLower) && /\b(bid|bids|bidders?|leading)\b/i.test(cleanLower))
    ) {
      if (!userId) {
        return res.json({
          reply: '🔒 **Please log in** so I can look up the bids placed on your active listings and products.',
          suggestions: ['Log In', 'Explore Products', 'Help'],
        });
      }

      const sellerAuctions = await Auction.find({ seller: userId })
        .sort({ updatedAt: -1 })
        .lean();

      if (sellerAuctions.length === 0) {
        return res.json({
          reply: `👋 **${user.name}**, you haven't listed any items for auction yet.\n\nReady to sell? Click **[+ Sell an Item](/sell)** to list your cycles, books, calculators, or electronics!`,
          suggestions: ['Sell an Item', 'Explore Auctions', 'How to sell?'],
        });
      }

      const auctionIds = sellerAuctions.map((a) => a._id);
      const bids = await Bid.find({ auction: { $in: auctionIds } })
        .populate('bidder', 'name email campus department')
        .sort({ amount: -1 })
        .lean();

      let reply = `📊 **Here is the bidding activity on your listings, ${user?.name}:**\n\n`;

      sellerAuctions.forEach((item, index) => {
        const itemBids = bids.filter((b) => b.auction.toString() === item._id.toString());

        const statusLabel =
          item.status === 'active'
            ? '🟢 Active'
            : item.status === 'handover_pending'
            ? '🤝 Matched & Awaiting Handover'
            : item.status === 'pending_seller_decision'
            ? '⚠️ Awaiting Your Decision'
            : item.status === 'completed'
            ? '✅ Completed Sale'
            : item.status;

        reply += `**${index + 1}. [${item.title}](/auction/${item._id})** — ${statusLabel}\n`;
        reply += `• **Starting Price:** ₹${item.startingPrice} | **Max Cap:** ₹${item.maxPrice || '—'}\n`;

        if (itemBids.length === 0) {
          reply += `• *No bids have been placed on this item yet.*\n\n`;
        } else {
          const leader = itemBids.find((b) => b.isLeading) || itemBids[0];
          reply += `• **Current Leading Price:** ₹${item.currentBid} by **${leader.bidder?.name || 'A Student'}** 🏆\n`;

          const uniqueBiddersMap = new Map();
          for (const b of itemBids) {
            const bName = b.bidder?.name || 'A Student';
            if (!uniqueBiddersMap.has(bName) || uniqueBiddersMap.get(bName) < b.amount) {
              uniqueBiddersMap.set(bName, b.amount);
            }
          }

          const biddersSummary = Array.from(uniqueBiddersMap.entries())
            .map(([name, topAmt]) => `${name} (₹${topAmt})`)
            .join(', ');

          reply += `• **Students who bid:** ${biddersSummary}\n`;
          if (item.status === 'active') {
            reply += `• *Action:* You can wait for more bids or click [Close Early](/auction/${item._id}) to select a winner.\n`;
          }
          reply += `\n`;
        }
      });

      return res.json({
        reply,
        suggestions: ['My Listings Dashboard', 'Explore Other Auctions', 'Help'],
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. RETRIEVE LIVE DATABASE CONTEXT FOR RAG
    // ──────────────────────────────────────────────────────────────────────────
    const budget = extractBudget(cleanLower);
    const { category, keywords } = extractKeywordsAndCategory(cleanLower);

    // Active listings filter
    const activeFilter = {
      status: 'active',
      closedEarly: { $ne: true },
      closingAt: { $gt: new Date() },
    };

    if (category) {
      activeFilter.category = category;
    }

    if (budget) {
      activeFilter.$or = [
        { currentBid: { $lte: budget } },
        { currentBid: null, startingPrice: { $lte: budget } },
      ];
    }

    if (keywords.length > 0 && !category) {
      const regexPattern = keywords.join('|');
      activeFilter.$or = [
        { title: { $regex: regexPattern, $options: 'i' } },
        { description: { $regex: regexPattern, $options: 'i' } },
      ];
    }

    const matchingAuctions = await Auction.find(activeFilter)
      .sort({ currentBid: 1, startingPrice: 1 })
      .limit(6)
      .lean();

    // Pull sample general active listings for global knowledge
    const allRecentAuctions = await Auction.find({
      status: 'active',
      closedEarly: { $ne: true },
      closingAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Pull recent answered Q&As
    const recentQAs = await Question.find({ isPublic: true, answer: { $exists: true, $ne: '' } })
      .populate('auction', 'title')
      .limit(6)
      .lean();

    // Format RAG context for the LLM
    const listingsContext = allRecentAuctions
      .map(
        (a) =>
          `- ID: ${a._id} | Title: "${a.title}" | Category: ${a.category} | Current/Start Price: ₹${a.currentBid || a.startingPrice} | Max Cap: ₹${a.maxPrice || 'None'} | Increment: ₹${a.minIncrement} | Condition: ${a.condition}`
      )
      .join('\n');

    const qaContext = recentQAs
      .map((q) => `- Item: "${q.auction?.title}" | Q: "${q.question}" | Seller Answer: "${q.answer}"`)
      .join('\n');

    const systemPrompt = `You are BidBot, a concise and direct campus auction assistant for students on BIDZONE.

LIVE CAMPUS DATABASE CONTEXT:
Active Listings:
${listingsContext || 'No active listings currently.'}

Recent Seller Q&A Answers:
${qaContext || 'No recent Q&As.'}

Student: ${user ? `${user.name} (${user.email})` : 'Guest student'}

STRICT RESPONSE GUIDELINES:
1. BREVITY IS MANDATORY: Give a direct, straight-to-the-point answer in 1 to 3 short sentences. Students do not want filler text or walls of boilerplate.
2. DO NOT RECITE UNPROMPTED RULES: NEVER list or recite platform rules (anti-sniping, proxy bidding, max price, safety commitments, platform reminders) UNLESS the student specifically asks "how does anti-sniping work?", "how does proxy bidding work?", or a direct rule question.
3. ITEM SEARCHES: If an item exists in the active listings, state its title and current price directly with markdown link [Title](/auction/id). If an item is NOT in the database, simply say: "No [item] listings are currently active on campus right now." Do NOT add lengthy apologies, reminders, or unrelated platform lectures.
4. BIDDING ON BEHALF: If the student asks to bid, mention that you've prepared their bid proposal for their authorization below.
`;

    // ──────────────────────────────────────────────────────────────────────────
    // 3. CALL REAL LLM SERVICE WITH GROUNDED RAG CONTEXT
    // ──────────────────────────────────────────────────────────────────────────
    const llmAnswer = await callLLM({
      systemPrompt,
      userMessage: queryText,
    });

    // Check if student asked to bid on their behalf and we have a top match
    let proposedAction = null;
    let itemsToReturn = null;

    if (matchingAuctions.length > 0) {
      itemsToReturn = matchingAuctions.map((a) => ({
        _id: a._id,
        title: a.title,
        category: a.category,
        currentPrice: a.currentBid || a.startingPrice,
        startingPrice: a.startingPrice,
        maxPrice: a.maxPrice,
        condition: a.condition,
        bidCount: a.bidCount,
        closingAt: a.closingAt,
        images: a.images,
      }));

      const topMatch = matchingAuctions[0];
      const nextMin =
        topMatch.bidCount === 0
          ? topMatch.startingPrice
          : (topMatch.currentBid || topMatch.startingPrice) + topMatch.minIncrement;

      if (wantsToBid) {
        proposedAction = {
          type: 'bid_confirmation',
          auctionId: topMatch._id,
          title: topMatch.title,
          currentPrice: topMatch.currentBid || topMatch.startingPrice,
          suggestedBid: nextMin,
          maxBudget: budget || (topMatch.maxPrice ? topMatch.maxPrice : nextMin),
          prompt: `Would you like me to place a bid of ₹${nextMin} on "${topMatch.title}"?`,
        };
      }
    }

    if (llmAnswer) {
      return res.json({
        reply: llmAnswer,
        items: itemsToReturn,
        proposedAction,
        suggestions: wantsToBid
          ? [`Confirm Bid of ₹${proposedAction?.suggestedBid || 100}`, 'Explore Other Options', 'Cancel']
          : ['Find cycle under ₹2000', 'Calculators under ₹400', 'Who is bidding on my products?', 'What am I winning?'],
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. FALLBACK SYNTHESIZER (In case network LLM times out)
    // ──────────────────────────────────────────────────────────────────────────
    let reply = '';
    if (matchingAuctions.length > 0) {
      reply += `🎉 **Found ${matchingAuctions.length} item${matchingAuctions.length > 1 ? 's' : ''}** `;
      if (category) reply += `in **${category}** `;
      if (budget) reply += `within **₹${budget.toLocaleString()}** `;
      reply += `for you:\n\n`;

      matchingAuctions.forEach((item, idx) => {
        const price = item.currentBid || item.startingPrice;
        reply += `**${idx + 1}. [${item.title}](/auction/${item._id})** — **₹${price}**\n`;
        reply += `• Condition: *${item.condition}* | Bids: **${item.bidCount}** | Max Cap: **₹${item.maxPrice || '—'}**\n`;
        reply += `• [View Item & Bid](/auction/${item._id})\n\n`;
      });

      if (wantsToBid) {
        reply += `\n🔒 **Bidding Safety Confirmation Required:**\n` +
          `Click below to authorize your bid!`;
      }
    } else {
      reply = `No listings matching "${queryText}" are currently active on campus right now.`;
    }

    return res.json({
      reply,
      items: itemsToReturn,
      proposedAction,
      suggestions: ['Cycles under ₹2000', 'Calculators', 'My Bids', 'Who is bidding on my products?'],
    });
  } catch (err) {
    next(err);
  }
};
