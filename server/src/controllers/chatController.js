import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';

/**
 * Helper to parse budget / price numbers from natural text.
 * Handles: "5k" -> 5000, "within 5k", "under 5000", "below 3000", "under ₹2,500", etc.
 */
const extractBudget = (text) => {
  const clean = text.toLowerCase();
  
  // Match patterns like "5k", "2.5k", "10k"
  const kMatch = clean.match(/(?:under|within|below|max|around|budget|<=?|at\s*most)?\s*₹?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  // Match patterns like "under 5000", "within 3000", "below 1500", "5000 rs", "₹5000"
  const numMatch = clean.match(/(?:under|within|below|max|budget|<=?|at\s*most|₹)\s*₹?\s*(\d{2,6})\b/i);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  // Match trailing "within 5000"
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

  // Extract general noun words (excluding stop words)
  const tokens = clean
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['select', 'show', 'find', 'give', 'within', 'under', 'below', 'price', 'with', 'want', 'need', 'some', 'good', 'best', 'for', 'the'].includes(w));

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

      // Find all auctions created by this seller
      const sellerAuctions = await Auction.find({ seller: userId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean();

      if (sellerAuctions.length === 0) {
        return res.json({
          reply: `👋 Hello **${user?.name || 'Seller'}**, you currently don't have any listed products. Click **"Sell Item"** in the top navigation to list your cycles, books, or electronics!`,
          suggestions: ['Sell an Item', 'Browse Products', 'How bidding works'],
        });
      }

      // Collect auction IDs
      const auctionIds = sellerAuctions.map((a) => a._id);
      const bids = await Bid.find({ auction: { $in: auctionIds } })
        .populate('bidder', 'name email campus department')
        .sort({ amount: -1 })
        .lean();

      let reply = `📊 **Here is the bidding activity on your listings, ${user?.name}:**\n\n`;
      let totalBidsCount = 0;

      sellerAuctions.forEach((item, index) => {
        const itemBids = bids.filter((b) => b.auction.toString() === item._id.toString());
        totalBidsCount += itemBids.length;

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
          
          // Unique bidders list
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
        suggestions: ['My Seller Dashboard', 'Sell Another Item', 'Check Active Handovers'],
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. INTENT: Buyer asking "select me phone within 5k" or search/recommendation
    // ──────────────────────────────────────────────────────────────────────────
    const budget = extractBudget(queryText);
    const { category, keywords } = extractKeywordsAndCategory(queryText);

    const isSearchIntent =
      Boolean(budget) ||
      Boolean(category) ||
      /\b(find|search|show|select|looking\s*for|any|suggest|recommend|buy|need)\b/i.test(cleanLower) ||
      /\b(phone|cycle|calculator|book|laptop|gadget|under|within|cheap|best)\b/i.test(cleanLower);

    if (isSearchIntent) {
      // Build search query for active auctions
      const filter = {
        status: 'active',
        closedEarly: { $ne: true },
        closingAt: { $gt: new Date() },
      };

      if (category) {
        filter.category = category;
      }

      if (budget) {
        // Price should be within budget: startingPrice <= budget or currentBid <= budget
        filter.$or = [
          { currentBid: { $lte: budget, $ne: null } },
          { currentBid: null, startingPrice: { $lte: budget } },
        ];
      }

      // Keyword text matching if specific search term
      if (keywords.length > 0 && !category) {
        const regexPattern = keywords.join('|');
        filter.$or = [
          { title: { $regex: regexPattern, $options: 'i' } },
          { description: { $regex: regexPattern, $options: 'i' } },
        ];
      }

      const matchingAuctions = await Auction.find(filter)
        .sort({ currentBid: 1, startingPrice: 1 })
        .limit(6)
        .lean();

      if (matchingAuctions.length === 0) {
        // Broaden search slightly (any category within budget or just category)
        const fallbackFilter = { status: 'active', closedEarly: { $ne: true }, closingAt: { $gt: new Date() } };
        if (category) fallbackFilter.category = category;
        const alternativeAuctions = await Auction.find(fallbackFilter).sort({ startingPrice: 1 }).limit(4).lean();

        let reply = `🔍 I couldn't find active auctions matching **${category || queryText}** ${budget ? `within ₹${budget.toLocaleString()}` : ''}.\n\n`;
        if (alternativeAuctions.length > 0) {
          reply += `Here are some active **${category || 'popular'}** items currently listed on campus:`;
          return res.json({
            reply,
            items: alternativeAuctions.map((a) => ({
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
            })),
            suggestions: ['Explore All Auctions', 'Cycles under ₹2000', 'Calculators', 'Electronics'],
          });
        }

        return res.json({
          reply: `I searched the campus catalog, but no active listings match your criteria right now. Check back soon or browse the full [Explore Page](/explore)!`,
          suggestions: ['Explore Catalog', 'Sell an Item', 'How bidding works'],
        });
      }

      // Format found recommendations
      let reply = `🎉 **Found ${matchingAuctions.length} item${matchingAuctions.length > 1 ? 's' : ''}** `;
      if (category) reply += `in **${category}** `;
      if (budget) reply += `within **₹${budget.toLocaleString()}** `;
      reply += `for you:\n\n`;

      matchingAuctions.forEach((item, idx) => {
        const price = item.currentBid || item.startingPrice;
        reply += `**${idx + 1}. [${item.title}](/auction/${item._id})** — **₹${price}**\n`;
        reply += `• Condition: *${item.condition}* | Bids: **${item.bidCount}** | Max Cap: **₹${item.maxPrice || '—'}**\n`;
        reply += `• [View Item & Bid](/auction/${item._id})\n\n`;
      });

      return res.json({
        reply,
        items: matchingAuctions.map((a) => ({
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
        })),
        suggestions: ['Show more items', 'Sort by lowest price', 'Explore all'],
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. INTENT: Buyer asks "What am I winning / did anyone outbid me?"
    // ──────────────────────────────────────────────────────────────────────────
    if (/\b(what\s*(?:am\s*i|are\s*my)\s*(?:winning|leading)|my\s*bids?|did\s*(?:anyone|someone)\s*outbid\s*me|outbid)\b/i.test(cleanLower)) {
      if (!userId) {
        return res.json({
          reply: '🔒 **Please log in** to check your active bids and see which auctions you are winning.',
          suggestions: ['Log In', 'Explore Products', 'Help'],
        });
      }

      const userBids = await Bid.find({ bidder: userId }).sort({ placedAt: -1 }).lean();
      const userAuctionIds = [...new Set(userBids.map((b) => b.auction.toString()))];

      const bidAuctions = await Auction.find({ _id: { $in: userAuctionIds } }).lean();

      const leading = [];
      const outbid = [];
      const won = [];

      for (const a of bidAuctions) {
        const isLead = userBids.some((b) => b.auction.toString() === a._id.toString() && b.isLeading);
        if (a.status === 'active' && !a.closedEarly) {
          if (isLead) leading.push(a);
          else outbid.push(a);
        } else if (a.winner?.toString() === userId) {
          won.push(a);
        }
      }

      let reply = `🏆 **Your Bidding Summary, ${user?.name}:**\n\n`;
      if (leading.length > 0) {
        reply += `**🟢 You are in the Lead on ${leading.length} item(s):**\n`;
        leading.forEach((a) => {
          reply += `• **[${a.title}](/auction/${a._id})** — Your top bid: **₹${a.currentBid}**\n`;
        });
        reply += `\n`;
      } else {
        reply += `• *You currently do not have any leading bids.*\n\n`;
      }

      if (outbid.length > 0) {
        reply += `**⚠️ You have been Outbid on ${outbid.length} item(s):**\n`;
        outbid.forEach((a) => {
          reply += `• **[${a.title}](/auction/${a._id})** — Current price: **₹${a.currentBid}** (Click to place a counter-bid!)\n`;
        });
        reply += `\n`;
      }

      if (won.length > 0) {
        reply += `**🎉 Won & In Progress (${won.length}):**\n`;
        won.forEach((a) => {
          reply += `• **[${a.title}](/auction/${a._id})** — Status: *${a.status}*\n`;
        });
      }

      return res.json({
        reply,
        suggestions: ['My Bids Dashboard', 'Explore New Auctions', 'Check Notifications'],
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. INTENT: FAQs & How BIDZONE Works
    // ──────────────────────────────────────────────────────────────────────────
    if (/\b(how\s*(?:does\s*)?(?:max\s*price|buyout|cap|ceiling)\s*work)\b/i.test(cleanLower)) {
      return res.json({
        reply: `⚡ **How the Max Price / Buyout Cap Works:**\n\n` +
          `1. **Seller Sets Cap:** When listing an item at \`/sell\`, the seller configures a **Starting Price** and a **Max Price** (e.g. Starting: ₹500, Max Cap: ₹1,500).\n` +
          `2. **Ceiling Rule:** Bids higher than the max price are blocked. No one can bid above the seller's set cap.\n` +
          `3. **Instant Win:** If any bidder bids the exact max price (or clicks *"⚡ Buy Now"*), **the auction immediately completes!**\n` +
          `4. **Direct Match:** Bidding stops, the buyer is confirmed as the winner, and both participants get an immediate pop-up to exchange mobile numbers for campus handover!`,
        suggestions: ['How to exchange phone numbers?', 'How does campus handover work?', 'Explore Auctions'],
      });
    }

    if (/\b(how\s*(?:to|do\s*we)?\s*(?:exchange|share)\s*(?:phone|mobile|number|contacts?))\b/i.test(cleanLower)) {
      return res.json({
        reply: `📱 **How Mobile Number Exchange Works:**\n\n` +
          `1. **Automatic Pop-up:** Once buyer and seller are matched (either by hitting the max price or seller price approval), an automatic modal pops up asking for your 10-digit mobile number.\n` +
          `2. **Strict Privacy:** Your mobile number is **strictly hidden from the public** and only revealed to your matched buyer or seller.\n` +
          `3. **Direct Contact:** As soon as numbers are exchanged, you get instant **📞 One-Touch Calling** and **💬 WhatsApp** buttons with pre-filled auction details to easily coordinate campus meetup!`,
        suggestions: ['How does handover work?', 'What is max price?', 'Explore Catalog'],
      });
    }

    if (/\b(handover|pickup|meetup|completed?)\b/i.test(cleanLower)) {
      return res.json({
        reply: `🤝 **How Campus Handover Works:**\n\n` +
          `1. Buyer and seller coordinate a safe meetup spot on campus (e.g. Student Center, library, tech park, food court).\n` +
          `2. The buyer physically inspects the item to verify its condition.\n` +
          `3. Both the buyer and seller log into BIDZONE and click **"I Confirm Handover Completed"**.\n` +
          `4. Once both parties confirm, the transaction is marked **Completed**!`,
        suggestions: ['How does max price work?', 'My Handovers', 'Explore Auctions'],
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. DEFAULT / GENERAL ASSISTANT RESPONSE
    // ──────────────────────────────────────────────────────────────────────────
    return res.json({
      reply: `👋 Hello${user?.name ? ` **${user.name}**` : ''}! I am **BidBot**, your campus auction assistant. Here is what I can help you with:\n\n` +
        `• 🔍 **Search & Deals:** *"Select me phone within 5k"*, *"Cycles under ₹2500"*, *"Engineering books"*\n` +
        `• 👥 **Seller Insights:** *"Who is bidding for my products?"*, *"Bids on my listings"*\n` +
        `• 🏆 **Buyer Status:** *"What am I winning?"*, *"Did anyone outbid me?"*\n` +
        `• 💡 **Platform Rules:** *"How does max price work?"*, *"How do we exchange phone numbers?"*`,
      suggestions: [
        'Phones under 5k',
        'Cycles under 3000',
        'Who is bidding on my products?',
        'What am I winning?',
        'How does max price work?',
      ],
    });
  } catch (err) {
    next(err);
  }
};
