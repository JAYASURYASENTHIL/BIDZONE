import mongoose from 'mongoose';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { checkAndTriggerAlerts } from './alertController.js';

// ── Helper to check if auction has passed closing time ─────────────────────
const isAuctionExpired = (auction) => {
  return new Date() >= new Date(auction.closingAt);
};

// ── POST /api/auctions (Create auction) ────────────────────────────────────
export const createAuction = async (req, res, next) => {
  try {
    const { title, category, description, condition, startingPrice, maxPrice, minIncrement, closingAt } = req.body;
    const sellerId = req.session.userId;

    if (!title || !category || !description || !condition || !startingPrice || !maxPrice || !closingAt) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields, including starting price and max price.' });
    }

    const closeDate = new Date(closingAt);
    if (isNaN(closeDate.getTime()) || closeDate <= new Date()) {
      return res.status(400).json({ success: false, message: 'Closing time must be a valid future date.' });
    }

    const startPriceNum = Number(startingPrice);
    const maxPriceNum = Number(maxPrice);
    const minIncNum = Number(minIncrement) || 10;
    if (startPriceNum < 1 || maxPriceNum < 1 || minIncNum < 1) {
      return res.status(400).json({ success: false, message: 'Prices and increments must be positive numbers.' });
    }

    if (maxPriceNum <= startPriceNum) {
      return res.status(400).json({ success: false, message: 'Maximum (Buy-It-Now / Cap) price must be strictly greater than the starting price.' });
    }

    const images = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];

    const auction = await Auction.create({
      seller: sellerId,
      title: title.trim(),
      category,
      description: description.trim(),
      condition,
      startingPrice: startPriceNum,
      maxPrice: maxPriceNum,
      hitMaxPrice: false,
      minIncrement: minIncNum,
      closingAt: closeDate,
      images,
      currentBid: null,
      bidCount: 0,
      status: 'active',
      closedEarly: false,
    });

    res.status(201).json({
      success: true,
      message: 'Auction listing created successfully.',
      auction,
    });

    // Asynchronously check and trigger matching item alerts for students
    checkAndTriggerAlerts(auction).catch((err) => console.error('Alert check error:', err));
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auctions (Browse active auctions with search & filters) ───────
export const getAuctions = async (req, res, next) => {
  try {
    const { search, category, condition, sort = 'ending_soon', page = 1, limit = 12 } = req.query;

    const query = { status: 'active', closedEarly: { $ne: true }, closingAt: { $gt: new Date() } };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (condition && condition !== 'all') {
      query.condition = condition;
    }

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    let sortOptions = { closingAt: 1 };
    if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    } else if (sort === 'price_asc') {
      sortOptions = { startingPrice: 1 };
    } else if (sort === 'price_desc') {
      sortOptions = { startingPrice: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 12);
    const skip = (pageNum - 1) * limitNum;

    const [auctions, total] = await Promise.all([
      Auction.find(query)
        .populate('seller', 'name')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Auction.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      auctions,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auctions/:id (Auction details, eligible bidders & bid history) ─
export const getAuctionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid auction ID.' });
    }

    const auction = await Auction.findById(id)
      .populate('seller', 'name email _id')
      .populate('winner', 'name _id')
      .lean();

    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    // Auto update status if scheduled deadline expired and auction was not closed early
    if (auction.status === 'active' && !auction.closedEarly && isAuctionExpired(auction)) {
      if (auction.bidCount === 0) {
        auction.status = 'unsold';
        auction.winnerSelectionMethod = 'none';
        await Auction.updateOne({ _id: auction._id }, { status: 'unsold', winnerSelectionMethod: 'none' });
      } else {
        const leadingBid = await Bid.findOne({ auction: auction._id, isLeading: true });
        if (leadingBid) {
          auction.status = 'pending_seller_decision';
          auction.winner = leadingBid.bidder;
          auction.winnerSelectionMethod = 'automatic_highest';
          auction.selectedWinningBid = leadingBid._id;
          auction.selectedWinningAmount = leadingBid.amount;
          await Auction.updateOne(
            { _id: auction._id },
            {
              status: 'pending_seller_decision',
              winner: leadingBid.bidder,
              winnerSelectionMethod: 'automatic_highest',
              selectedWinningBid: leadingBid._id,
              selectedWinningAmount: leadingBid.amount,
            }
          );
        }
      }
    }

    // Fetch bid history
    const bids = await Bid.find({ auction: id })
      .populate('bidder', 'name _id')
      .sort({ placedAt: -1 })
      .limit(50)
      .lean();

    // Safe public bids (display name and safe attributes)
    const safeBids = bids.map((b) => ({
      _id: b._id,
      bidderId: b.bidder?._id,
      bidderName: b.bidder?.name || 'Anonymous Student',
      amount: b.amount,
      placedAt: b.placedAt,
      isLeading: b.isLeading,
    }));

    // Compute unique eligible bidders list for the seller's early close selection
    // Each eligible bidder is displayed with their highest accepted bid amount
    const eligibleBiddersMap = new Map();
    for (const b of bids) {
      const bId = b.bidder?._id?.toString();
      if (bId && !eligibleBiddersMap.has(bId)) {
        eligibleBiddersMap.set(bId, {
          bidderId: bId,
          bidderName: b.bidder?.name || 'A Student',
          highestBid: b.amount,
          placedAt: b.placedAt,
          isLeading: b.isLeading,
        });
      }
    }
    const eligibleBidders = Array.from(eligibleBiddersMap.values());

    const userId = req.session?.userId;
    const isSeller = auction.seller && (auction.seller._id?.toString() === userId || auction.seller.toString() === userId);
    const isWinner = auction.winner && (auction.winner._id?.toString() === userId || auction.winner.toString() === userId);

    const safeAuction = auction.toObject ? auction.toObject() : { ...auction };
    if (!isSeller && !isWinner && safeAuction.handover) {
      delete safeAuction.handover.sellerPhone;
      delete safeAuction.handover.buyerPhone;
    }

    // Keep proxy limits confidential: only show requester their own limit
    const myProxy = userId && auction.proxyBids ? auction.proxyBids.find((p) => p.bidder.toString() === userId) : null;
    delete safeAuction.proxyBids;

    res.status(200).json({
      success: true,
      auction: safeAuction,
      bids: safeBids,
      eligibleBidders,
      isLocked: auction.bidCount > 0,
      myAutoBidMax: myProxy ? myProxy.maxAmount : null,
    });
  } catch (err) {
    next(err);
  }
};

// ── In-memory per-auction bid lock ─────────────────────────────────────────
// Prevents two bids on the same auction from racing through validation at the
// same time on this process. Simple and effective for a single-server deploy.
const _bidLocks = new Set();

// ── POST /api/auctions/:id/bids (Place a bid) ──────────────────────────────
export const placeBid = async (req, res, next) => {
  const { id } = req.params;

  // If a bid for this auction is already in-flight, reject immediately.
  if (_bidLocks.has(id)) {
    return res.status(429).json({
      success: false,
      message: 'Another bid is being processed for this auction. Please try again in a moment.',
    });
  }
  _bidLocks.add(id); // Lock this auction for the duration of this request.

  try {
    const { amount } = req.body;
    const bidderId = req.session.userId;

    const bidAmount = Number(amount);
    if (!bidAmount || bidAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid bid amount.' });
    }

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    if (auction.seller.toString() === bidderId) {
      return res.status(403).json({ success: false, message: 'Sellers cannot bid on their own auctions.' });
    }

    // Prevent bidding if auction was closed early or is not active or passed deadline
    if (auction.closedEarly || auction.status !== 'active' || isAuctionExpired(auction)) {
      return res.status(400).json({
        success: false,
        message: auction.closedEarly
          ? 'This auction was closed early by the seller and is no longer accepting bids.'
          : 'This auction has ended or is not active.',
      });
    }

    // Check maximum price rule: no one can bid above the max price set by seller
    if (auction.maxPrice && bidAmount > auction.maxPrice) {
      return res.status(400).json({
        success: false,
        message: `Bids cannot exceed the maximum price of ₹${auction.maxPrice} set by the seller.`,
      });
    }

    const calculatedMin =
      auction.bidCount === 0 ? auction.startingPrice : (auction.currentBid || auction.startingPrice) + auction.minIncrement;
    const minRequired = auction.maxPrice ? Math.min(calculatedMin, auction.maxPrice) : calculatedMin;

    if (bidAmount < minRequired) {
      return res.status(400).json({
        success: false,
        message: `Your bid must be at least ₹${minRequired}.`,
      });
    }

    const hitsMaxPrice = Boolean(auction.maxPrice && bidAmount === auction.maxPrice);
    const finalBidAmount = hitsMaxPrice ? auction.maxPrice : bidAmount;

    const prevLeader = await Bid.findOne({ auction: id, isLeading: true });
    if (prevLeader) {
      await Bid.updateOne({ _id: prevLeader._id }, { isLeading: false });
    }

    const newBid = await Bid.create({
      auction: id,
      bidder: bidderId,
      amount: finalBidAmount,
      isLeading: true,
      placedAt: new Date(),
    });

    auction.currentBid = finalBidAmount;
    auction.bidCount += 1;

    // ── Last-minute anti-sniping extension ──────────────────────────────────
    // If a valid bid arrives in the last 30 seconds, closing time moves to 60 seconds after that bid
    const nowTime = new Date();
    const timeRemainingMs = new Date(auction.closingAt).getTime() - nowTime.getTime();
    let wasExtended = false;

    if (!hitsMaxPrice && timeRemainingMs <= 30000 && timeRemainingMs > 0) {
      auction.closingAt = new Date(nowTime.getTime() + 60000);
      auction.extendedByAntiSnipe = true;
      auction.extensionCount = (auction.extensionCount || 0) + 1;
      wasExtended = true;
    }

    // When max price is hit, the bid completes immediately and matches buyer and seller
    if (hitsMaxPrice) {
      const now = new Date();
      auction.winner = bidderId;
      auction.hitMaxPrice = true;
      auction.status = 'handover_pending';
      auction.closedEarly = true;
      auction.closedEarlyAt = now;
      auction.winnerSelectionMethod = 'automatic_highest';
      auction.selectedWinningBid = newBid._id;
      auction.selectedWinningAmount = finalBidAmount;
    }

    await auction.save();

    if (prevLeader && prevLeader.bidder.toString() !== bidderId) {
      await Notification.create({
        recipient: prevLeader.bidder,
        type: 'outbid',
        title: 'You have been outbid!',
        message: `Someone placed a higher bid of ₹${finalBidAmount} on "${auction.title}". Place a new bid to regain the lead!`,
        data: { auctionId: auction._id, amount: finalBidAmount },
      });
    }

    if (hitsMaxPrice) {
      // Notify winner
      await Notification.create({
        recipient: bidderId,
        type: 'max_price_hit',
        title: '🎯 Max Price Hit — You Won the Auction! 🏆',
        message: `Congratulations! You reached the seller's maximum price of ₹${auction.maxPrice} for "${auction.title}". Bidding is complete and you are matched with the seller! Please enter your mobile number to coordinate campus handover.`,
        data: { auctionId: auction._id, amount: auction.maxPrice },
      });

      // Notify seller
      await Notification.create({
        recipient: auction.seller,
        type: 'max_price_hit',
        title: '🎉 Max Price Hit on Your Listing!',
        message: `A student placed the maximum price of ₹${auction.maxPrice} for "${auction.title}". The auction is complete and you are matched with the buyer! Please enter your mobile number to coordinate campus handover.`,
        data: { auctionId: auction._id, amount: auction.maxPrice },
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${id}`).emit('bid:update', {
        auctionId: id,
        currentBid: finalBidAmount,
        bidCount: auction.bidCount,
        latestBid: {
          _id: newBid._id,
          amount: finalBidAmount,
          placedAt: newBid.placedAt,
          bidderName: req.user?.name || 'A Student',
        },
      });

      if (hitsMaxPrice) {
        io.to(`auction:${id}`).emit('auction:max_price_hit', {
          auctionId: id,
          currentBid: finalBidAmount,
          winner: bidderId,
          status: 'handover_pending',
          hitMaxPrice: true,
        });

        io.to(`auction:${id}`).emit('auction:status', {
          auctionId: id,
          status: 'handover_pending',
          winner: bidderId,
          hitMaxPrice: true,
          closedEarly: true,
        });
      }
      if (wasExtended) {
        io.to(`auction:${id}`).emit('auction:extended', {
          auctionId: id,
          newClosingAt: auction.closingAt,
          extensionCount: auction.extensionCount,
          message: '⏱️ Auction extended by 60 seconds due to a bid in the final 30 seconds!',
        });
      }
    }

    res.status(201).json({
      success: true,
      message: hitsMaxPrice
        ? `🎉 Maximum price of ₹${auction.maxPrice} hit! The auction is completed and you are matched with the seller!`
        : wasExtended
        ? 'Bid placed! Closing time extended by 60s (Anti-Sniping protection).'
        : 'Bid placed successfully!',
      currentBid: finalBidAmount,
      bidCount: auction.bidCount,
      hitMaxPrice: hitsMaxPrice,
      status: auction.status,
      closingAt: auction.closingAt,
      wasExtended,
    });

    // Check and trigger any registered automatic proxy bids
    if (!hitsMaxPrice && auction.status === 'active') {
      processAutoBids(auction, bidderId, io).catch((err) => console.error('Auto-bid error:', err));
    }
  } catch (err) {
    next(err);
  } finally {
    // Always release the lock — even if an error was thrown.
    _bidLocks.delete(id);
  }
};

// ── Helper: Process Automatic Proxy Bids ─────────────────────────────────────
export const processAutoBids = async (auction, currentLeadingBidderId, io) => {
  try {
    if (auction.status !== 'active' || auction.closedEarly) return;
    if (!auction.proxyBids || auction.proxyBids.length === 0) return;

    // Filter proxies from other users
    const otherProxies = auction.proxyBids
      .filter((p) => p.bidder.toString() !== currentLeadingBidderId.toString())
      .sort((a, b) => b.maxAmount - a.maxAmount);

    if (otherProxies.length === 0) return;

    const topProxy = otherProxies[0];
    const nextRequired = (auction.currentBid || auction.startingPrice) + auction.minIncrement;

    if (topProxy.maxAmount >= nextRequired) {
      // Determine auto-bid amount: only as much as needed to lead
      let autoBidAmount = nextRequired;
      if (auction.maxPrice && autoBidAmount > auction.maxPrice) {
        autoBidAmount = auction.maxPrice;
      }

      const hitsMax = Boolean(auction.maxPrice && autoBidAmount === auction.maxPrice);

      // Unset previous leading bid
      await Bid.updateMany({ auction: auction._id, isLeading: true }, { isLeading: false });

      const autoBid = await Bid.create({
        auction: auction._id,
        bidder: topProxy.bidder,
        amount: autoBidAmount,
        isLeading: true,
        placedAt: new Date(),
      });

      auction.currentBid = autoBidAmount;
      auction.bidCount += 1;

      if (hitsMax) {
        const now = new Date();
        auction.winner = topProxy.bidder;
        auction.hitMaxPrice = true;
        auction.status = 'handover_pending';
        auction.closedEarly = true;
        auction.closedEarlyAt = now;
        auction.winnerSelectionMethod = 'automatic_highest';
        auction.selectedWinningBid = autoBid._id;
        auction.selectedWinningAmount = autoBidAmount;
      }

      await auction.save();

      const bidderDoc = await User.findById(topProxy.bidder).select('name');

      // Notify outbid user
      await Notification.create({
        recipient: currentLeadingBidderId,
        type: 'outbid',
        title: 'You have been outbid by an automatic proxy bid!',
        message: `An automatic proxy bid of ₹${autoBidAmount} was placed on "${auction.title}". Place a new bid to regain the lead!`,
        data: { auctionId: auction._id, amount: autoBidAmount },
      });

      // Notify proxy bidder
      await Notification.create({
        recipient: topProxy.bidder,
        type: 'auto_bid_placed',
        title: '🤖 Automatic Proxy Bid Placed For You!',
        message: `We automatically placed a bid of ₹${autoBidAmount} on "${auction.title}" to keep you leading (within your ₹${topProxy.maxAmount} maximum limit).`,
        data: { auctionId: auction._id, amount: autoBidAmount, maxLimit: topProxy.maxAmount },
      });

      if (io) {
        io.to(`auction:${auction._id}`).emit('bid:update', {
          auctionId: auction._id,
          currentBid: autoBidAmount,
          bidCount: auction.bidCount,
          latestBid: {
            _id: autoBid._id,
            amount: autoBidAmount,
            placedAt: autoBid.placedAt,
            bidderName: bidderDoc?.name || 'A Student',
            isAutoBid: true,
          },
        });

        if (hitsMax) {
          io.to(`auction:${auction._id}`).emit('auction:max_price_hit', {
            auctionId: auction._id,
            currentBid: autoBidAmount,
            winner: topProxy.bidder,
            status: 'handover_pending',
            hitMaxPrice: true,
          });
        }
      }
    }
  } catch (err) {
    console.error('Error in processAutoBids:', err);
  }
};

// ── POST /api/auctions/:id/auto-bid (Set maximum proxy auto-bid limit) ──────
export const setAutoBid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { maxAmount } = req.body;
    const userId = req.session.userId;

    const maxLimit = Number(maxAmount);
    if (!maxLimit || maxLimit <= 0) {
      return res.status(400).json({ success: false, message: 'Please specify a valid maximum budget limit for automatic bidding.' });
    }

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    if (auction.seller.toString() === userId) {
      return res.status(403).json({ success: false, message: 'Sellers cannot bid on their own auctions.' });
    }

    if (auction.closedEarly || auction.status !== 'active' || isAuctionExpired(auction)) {
      return res.status(400).json({ success: false, message: 'This auction has ended or is not active.' });
    }

    const calculatedMin =
      auction.bidCount === 0 ? auction.startingPrice : (auction.currentBid || auction.startingPrice) + auction.minIncrement;
    const minRequired = auction.maxPrice ? Math.min(calculatedMin, auction.maxPrice) : calculatedMin;

    if (maxLimit < minRequired) {
      return res.status(400).json({
        success: false,
        message: `Your auto-bid limit must be at least ₹${minRequired}.`,
      });
    }

    if (auction.maxPrice && maxLimit > auction.maxPrice) {
      return res.status(400).json({
        success: false,
        message: `Auto-bid limit cannot exceed the seller's maximum price ceiling of ₹${auction.maxPrice}.`,
      });
    }

    if (!auction.proxyBids) auction.proxyBids = [];

    const existingIdx = auction.proxyBids.findIndex((p) => p.bidder.toString() === userId);
    if (existingIdx >= 0) {
      auction.proxyBids[existingIdx].maxAmount = maxLimit;
      auction.proxyBids[existingIdx].createdAt = new Date();
    } else {
      auction.proxyBids.push({ bidder: userId, maxAmount: maxLimit });
    }

    await auction.save();

    const io = req.app.get('io');
    const leadingBid = await Bid.findOne({ auction: id, isLeading: true });
    const currentLeaderId = leadingBid ? leadingBid.bidder.toString() : null;

    // If user is not currently leading, trigger auto-bid immediately to take the lead
    if (currentLeaderId !== userId) {
      await processAutoBids(auction, currentLeaderId || 'none', io);
    }

    res.status(200).json({
      success: true,
      message: `Automatic bidding activated up to ₹${maxLimit}! BIDZONE will automatically place the minimum needed to keep you in the lead.`,
      maxLimit,
      currentBid: auction.currentBid,
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/auctions/:id (Edit listing by seller — LOCKED after first bid) ─
export const updateAuction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sellerId = req.session.userId;
    const { title, category, description, condition, startingPrice, maxPrice, minIncrement, closingAt } = req.body;

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    if (auction.seller.toString() !== sellerId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this listing.' });
    }

    // STRICT LOCK RULE: Once the first accepted bid exists, permanently lock all terms
    if (auction.bidCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          'Listing details are permanently locked because at least one valid bid has been placed. Title, category, description, condition, starting price, minimum increment, photos, and closing time cannot be altered.',
        isLocked: true,
      });
    }

    if (auction.status !== 'active' || auction.closedEarly || isAuctionExpired(auction)) {
      return res.status(400).json({ success: false, message: 'Only active auctions can be edited.' });
    }

    // Before any bid, seller may edit all terms
    if (title && title.trim()) auction.title = title.trim();
    if (category) auction.category = category;
    if (description && description.trim()) auction.description = description.trim();
    if (condition) auction.condition = condition;
    if (startingPrice) auction.startingPrice = Number(startingPrice);
    if (maxPrice) {
      const maxP = Number(maxPrice);
      if (maxP <= auction.startingPrice) {
        return res.status(400).json({ success: false, message: 'Maximum price must be strictly greater than starting price.' });
      }
      auction.maxPrice = maxP;
    }
    if (minIncrement) auction.minIncrement = Number(minIncrement);
    if (closingAt) {
      const newClosing = new Date(closingAt);
      if (newClosing > new Date()) auction.closingAt = newClosing;
    }

    await auction.save();

    res.status(200).json({
      success: true,
      message: 'Listing updated successfully.',
      auction,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/auctions/:id (Cancel auction by seller — Allowed only before first bid)
export const cancelAuction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sellerId = req.session.userId;

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    if (auction.seller.toString() !== sellerId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to cancel this listing.' });
    }

    if (auction.status === 'completed' || auction.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed or already cancelled auction.' });
    }

    // If bids exist, seller cannot unilaterally cancel; they must use "Close Auction Early"
    if (auction.bidCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot cancel an auction after bids have been accepted. Please use "Close Auction Early" to conclude the auction and select an eligible winner.',
      });
    }

    auction.status = 'cancelled';
    await auction.save();

    res.status(200).json({
      success: true,
      message: 'Auction cancelled successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auctions/:id/close-early (Seller-controlled early closing) ────
export const closeAuctionEarly = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { selectedBidderId, reason } = req.body;
    const sellerId = req.session.userId;

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    if (auction.seller.toString() !== sellerId) {
      return res.status(403).json({ success: false, message: 'Only the seller can close this auction early.' });
    }

    if (auction.status !== 'active' || auction.closedEarly || isAuctionExpired(auction)) {
      return res.status(400).json({
        success: false,
        message: 'This auction is not active or has already been closed.',
      });
    }

    const now = new Date();

    // Scenario A: Zero bids placed -> Closes early as unsold
    if (auction.bidCount === 0) {
      auction.status = 'unsold';
      auction.closedEarly = true;
      auction.closedEarlyAt = now;
      auction.closedEarlyBy = sellerId;
      auction.winnerSelectionMethod = 'none';
      await auction.save();

      const io = req.app.get('io');
      if (io) {
        io.to(`auction:${id}`).emit('auction:status', {
          auctionId: id,
          status: 'unsold',
          closedEarly: true,
          closedEarlyAt: now,
          winnerSelectionMethod: 'none',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Auction closed early with no bids.',
        auction,
      });
    }

    // Scenario B: Valid bids exist -> Seller selects an eligible winner
    if (!selectedBidderId) {
      return res.status(400).json({
        success: false,
        message: 'Please select an eligible winning bidder from the accepted bids list.',
      });
    }

    // Ensure the selected bidder has placed at least one accepted bid on this auction
    const bidderBids = await Bid.find({ auction: id, bidder: selectedBidderId }).sort({ amount: -1 });
    if (!bidderBids || bidderBids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid selection: The chosen student has not placed any accepted bids on this auction.',
      });
    }

    // The chosen winning amount is that bidder's highest accepted bid
    const topBidOfBidder = bidderBids[0];

    // Determine the overall highest bid on the auction
    const highestOverallBid = await Bid.findOne({ auction: id }).sort({ amount: -1 });
    const isHighestOverall =
      highestOverallBid && highestOverallBid.bidder.toString() === selectedBidderId.toString();

    const winnerSelectionMethod = isHighestOverall ? 'automatic_highest' : 'seller_selected';

    // Transition state
    auction.status = 'pending_seller_decision';
    auction.winner = selectedBidderId;
    auction.currentBid = topBidOfBidder.amount;
    auction.selectedWinningBid = topBidOfBidder._id;
    auction.selectedWinningAmount = topBidOfBidder.amount;
    auction.closedEarly = true;
    auction.closedEarlyAt = now;
    auction.closedEarlyBy = sellerId;
    auction.winnerSelectionMethod = winnerSelectionMethod;
    await auction.save();

    // Create notification for the chosen winner
    await Notification.create({
      recipient: selectedBidderId,
      type: 'auction_won',
      title: 'Auction Closed Early — You are the Winner! 🏆',
      message: `The seller closed the auction for "${auction.title}" early and confirmed your bid of ₹${topBidOfBidder.amount} as the winning price (${winnerSelectionMethod === 'seller_selected' ? 'chosen by seller' : 'top bid'}). Awaiting seller decision finalization.`,
      data: {
        auctionId: auction._id,
        amount: topBidOfBidder.amount,
        selectionMethod: winnerSelectionMethod,
      },
    });

    // Notify other bidders that the auction was closed early
    const otherBidders = await Bid.find({ auction: id, bidder: { $ne: selectedBidderId } }).distinct('bidder');
    for (const bId of otherBidders) {
      await Notification.create({
        recipient: bId,
        type: 'auction_closed',
        title: 'Auction Closed Early',
        message: `The auction for "${auction.title}" was closed early by the seller.`,
        data: { auctionId: auction._id },
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${id}`).emit('auction:status', {
        auctionId: id,
        status: 'pending_seller_decision',
        winner: selectedBidderId,
        winningAmount: topBidOfBidder.amount,
        closedEarly: true,
        closedEarlyAt: now,
        winnerSelectionMethod,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Auction closed early successfully. Winner determined via ${winnerSelectionMethod === 'seller_selected' ? 'seller selection' : 'highest bid'}.`,
      auction,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auctions/:id/decide (Seller approve or reject winning bid) ────
export const sellerDecide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;
    const sellerId = req.session.userId;

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    if (auction.seller.toString() !== sellerId) {
      return res.status(403).json({ success: false, message: 'Only the seller can approve or reject the final price.' });
    }

    if (auction.status !== 'pending_seller_decision') {
      return res.status(400).json({ success: false, message: 'Auction is not awaiting a decision.' });
    }

    if (decision === 'approve') {
      auction.status = 'handover_pending';
      await auction.save();

      if (auction.winner) {
        await Notification.create({
          recipient: auction.winner,
          type: 'seller_approved',
          title: 'Winning Bid Accepted! 🎉',
          message: `The seller accepted your winning bid of ₹${auction.currentBid} for "${auction.title}". Please proceed to arrange campus handover.`,
          data: { auctionId: auction._id },
        });
      }
    } else if (decision === 'reject') {
      auction.status = 'rejected';
      await auction.save();

      if (auction.winner) {
        await Notification.create({
          recipient: auction.winner,
          type: 'seller_rejected',
          title: 'Offer Declined',
          message: `The seller declined the final bid for "${auction.title}". The item will not proceed to handover.`,
          data: { auctionId: auction._id },
        });
      }
    } else {
      return res.status(400).json({ success: false, message: "Invalid decision. Must be 'approve' or 'reject'." });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${id}`).emit('auction:status', {
        auctionId: id,
        status: auction.status,
      });
    }

    res.status(200).json({
      success: true,
      message: `Auction price has been ${decision}d.`,
      auction,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auctions/:id/handover (Confirm handover by buyer or seller) ───
export const confirmHandover = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    if (auction.status !== 'handover_pending') {
      return res.status(400).json({ success: false, message: 'Auction is not in pending handover state.' });
    }

    const isSeller = auction.seller.toString() === userId;
    const isBuyer = auction.winner && auction.winner.toString() === userId;

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ success: false, message: 'You are neither the seller nor the winning buyer.' });
    }

    if (isSeller) {
      auction.handover.sellerConfirmed = true;
    }
    if (isBuyer) {
      auction.handover.buyerConfirmed = true;
    }

    if (auction.handover.sellerConfirmed && auction.handover.buyerConfirmed) {
      auction.status = 'completed';
      auction.handover.completedAt = new Date();

      await Notification.create({
        recipient: auction.seller,
        type: 'handover_update',
        title: 'Handover Completed! 🤝',
        message: `Both parties confirmed item handover for "${auction.title}". Sale successfully completed!`,
        data: { auctionId: auction._id },
      });

      await Notification.create({
        recipient: auction.winner,
        type: 'handover_update',
        title: 'Purchase Completed! 🤝',
        message: `Both parties confirmed item handover for "${auction.title}". Enjoy your purchase!`,
        data: { auctionId: auction._id },
      });
    }

    await auction.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${id}`).emit('auction:status', {
        auctionId: id,
        status: auction.status,
        handover: auction.handover,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Handover status updated.',
      handover: auction.handover,
      status: auction.status,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auctions/:id/contact-phone (Share mobile number between matched buyer and seller) ─
export const shareContactPhone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { phone } = req.body;
    const userId = req.session.userId;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please provide a mobile number.' });
    }

    // Clean phone number: remove non-digits, accept 10-digit mobile number
    const cleanPhone = phone.toString().replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number (e.g. 9876543210).',
      });
    }

    const auction = await Auction.findById(id).populate('seller', 'name email').populate('winner', 'name email');
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    const isSeller = auction.seller && (auction.seller._id?.toString() === userId || auction.seller.toString() === userId);
    const isWinner = auction.winner && (auction.winner._id?.toString() === userId || auction.winner.toString() === userId);

    if (!isSeller && !isWinner) {
      return res.status(403).json({
        success: false,
        message: 'Only the seller or the matched winning buyer can exchange mobile numbers for this listing.',
      });
    }

    // Ensure matched state (pending_seller_decision, handover_pending, completed)
    const matchedStatuses = ['pending_seller_decision', 'handover_pending', 'completed'];
    if (!matchedStatuses.includes(auction.status)) {
      return res.status(400).json({
        success: false,
        message: 'Mobile numbers can only be exchanged once buyer and seller are matched.',
      });
    }

    if (!auction.handover) {
      auction.handover = {};
    }

    const now = new Date();
    if (isSeller) {
      auction.handover.sellerPhone = cleanPhone;
      auction.handover.sellerPhoneSharedAt = now;
    } else if (isWinner) {
      auction.handover.buyerPhone = cleanPhone;
      auction.handover.buyerPhoneSharedAt = now;
    }

    await auction.save();

    // Notify the other party
    const otherUserId = isSeller ? auction.winner?._id : auction.seller?._id;
    const senderRole = isSeller ? 'Seller' : 'Buyer';
    const senderName = (isSeller ? auction.seller?.name : auction.winner?.name) || senderRole;

    if (otherUserId) {
      await Notification.create({
        recipient: otherUserId,
        type: 'contact_shared',
        title: `📱 ${senderRole} Shared Mobile Number!`,
        message: `${senderName} shared their mobile number (+91 ${cleanPhone}) for "${auction.title}". You can now call or WhatsApp them to coordinate campus handover!`,
        data: { auctionId: auction._id, phone: cleanPhone, senderRole },
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${id}`).emit('auction:phone_shared', {
        auctionId: id,
        isSeller,
        isBuyer: isWinner,
        phone: cleanPhone,
        handover: auction.handover,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Mobile number shared successfully! Both parties can now connect.',
      handover: auction.handover,
      sharedPhone: cleanPhone,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/dashboard/buyer (Buyer Dashboard data) ─────────────────────────
export const getBuyerDashboard = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    const userBids = await Bid.find({ bidder: userId }).sort({ placedAt: -1 }).lean();
    const auctionIds = [...new Set(userBids.map((b) => b.auction.toString()))];

    const auctions = await Auction.find({ _id: { $in: auctionIds } })
      .populate('seller', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    const activeLeading = [];
    const outbid = [];
    const pendingWins = [];
    const handoverPending = [];
    const completedPurchases = [];
    const other = [];

    for (const a of auctions) {
      const isLead = a.currentBid && userBids.some((b) => b.auction.toString() === a._id.toString() && b.isLeading);

      if (a.status === 'active' && !a.closedEarly) {
        if (isLead) activeLeading.push(a);
        else outbid.push(a);
      } else if (a.status === 'pending_seller_decision' && a.winner?.toString() === userId) {
        pendingWins.push(a);
      } else if (a.status === 'handover_pending' && a.winner?.toString() === userId) {
        handoverPending.push(a);
      } else if (a.status === 'completed' && a.winner?.toString() === userId) {
        completedPurchases.push(a);
      } else {
        other.push(a);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        activeLeading,
        outbid,
        pendingWins,
        handoverPending,
        completedPurchases,
        other,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/dashboard/seller (Seller Dashboard data) ───────────────────────
export const getSellerDashboard = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    const listings = await Auction.find({ seller: userId })
      .populate('winner', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const active = [];
    const pendingDecision = [];
    const handoverPending = [];
    const completed = [];
    const closedOthers = [];

    for (const a of listings) {
      if (a.status === 'active' && !a.closedEarly) {
        active.push(a);
      } else if (a.status === 'pending_seller_decision') {
        pendingDecision.push(a);
      } else if (a.status === 'handover_pending') {
        handoverPending.push(a);
      } else if (a.status === 'completed') {
        completed.push(a);
      } else {
        closedOthers.push(a);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        active,
        pendingDecision,
        handoverPending,
        completed,
        closedOthers,
      },
    });
  } catch (err) {
    next(err);
  }
};
