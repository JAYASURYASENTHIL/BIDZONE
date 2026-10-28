import mongoose from 'mongoose';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import Notification from '../models/Notification.js';

// ── Helper to check if auction has passed closing time ─────────────────────
const isAuctionExpired = (auction) => {
  return new Date() >= new Date(auction.closingAt);
};

// ── POST /api/auctions (Create auction) ────────────────────────────────────
export const createAuction = async (req, res, next) => {
  try {
    const { title, category, description, condition, startingPrice, minIncrement, closingAt } = req.body;
    const sellerId = req.session.userId;

    if (!title || !category || !description || !condition || !startingPrice || !closingAt) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    const closeDate = new Date(closingAt);
    if (isNaN(closeDate.getTime()) || closeDate <= new Date()) {
      return res.status(400).json({ success: false, message: 'Closing time must be a valid future date.' });
    }

    const startPriceNum = Number(startingPrice);
    const minIncNum = Number(minIncrement) || 10;
    if (startPriceNum < 1 || minIncNum < 1) {
      return res.status(400).json({ success: false, message: 'Prices and increments must be positive numbers.' });
    }

    // Process uploaded images
    const images = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];

    const auction = await Auction.create({
      seller: sellerId,
      title: title.trim(),
      category,
      description: description.trim(),
      condition,
      startingPrice: startPriceNum,
      minIncrement: minIncNum,
      closingAt: closeDate,
      images,
      currentBid: null,
      bidCount: 0,
      status: 'active',
    });

    res.status(201).json({
      success: true,
      message: 'Auction listing created successfully.',
      auction,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auctions (Browse active auctions with search & filters) ───────
export const getAuctions = async (req, res, next) => {
  try {
    const { search, category, condition, sort = 'ending_soon', page = 1, limit = 12 } = req.query;

    const query = { status: 'active', closingAt: { $gt: new Date() } };

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

    let sortOptions = { closingAt: 1 }; // default: ending soon
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

// ── GET /api/auctions/:id (Auction details & bid history) ───────────────────
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

    // Auto update status if expired and still active
    if (auction.status === 'active' && isAuctionExpired(auction)) {
      if (auction.bidCount === 0) {
        auction.status = 'unsold';
        await Auction.updateOne({ _id: auction._id }, { status: 'unsold' });
      } else {
        const leadingBid = await Bid.findOne({ auction: auction._id, isLeading: true });
        if (leadingBid) {
          auction.status = 'pending_seller_decision';
          auction.winner = leadingBid.bidder;
          await Auction.updateOne(
            { _id: auction._id },
            { status: 'pending_seller_decision', winner: leadingBid.bidder }
          );
        }
      }
    }

    // Fetch public bid history (never reveal full private bidder information)
    const bids = await Bid.find({ auction: id })
      .populate('bidder', 'name')
      .sort({ placedAt: -1 })
      .limit(30)
      .lean();

    const safeBids = bids.map((b) => ({
      _id: b._id,
      amount: b.amount,
      placedAt: b.placedAt,
      isLeading: b.isLeading,
      bidderName: b.bidder?.name || 'Anonymous Student',
    }));

    res.status(200).json({
      success: true,
      auction,
      bids: safeBids,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auctions/:id/bids (Place a bid) ──────────────────────────────
export const placeBid = async (req, res, next) => {
  try {
    const { id } = req.params;
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

    // Check if seller is trying to bid on their own item
    if (auction.seller.toString() === bidderId) {
      return res.status(403).json({ success: false, message: 'Sellers cannot bid on their own auctions.' });
    }

    // Check if auction is open and within server time
    if (auction.status !== 'active' || isAuctionExpired(auction)) {
      return res.status(400).json({ success: false, message: 'This auction has ended or is not active.' });
    }

    // Check minimum required bid
    const minRequired =
      auction.bidCount === 0 ? auction.startingPrice : (auction.currentBid || auction.startingPrice) + auction.minIncrement;

    if (bidAmount < minRequired) {
      return res.status(400).json({
        success: false,
        message: `Your bid must be at least ₹${minRequired}.`,
      });
    }

    // Find the previous leading bid to notify the outbid student
    const prevLeader = await Bid.findOne({ auction: id, isLeading: true });

    // Mark previous leader as not leading
    if (prevLeader) {
      await Bid.updateOne({ _id: prevLeader._id }, { isLeading: false });
    }

    // Create the new bid
    const newBid = await Bid.create({
      auction: id,
      bidder: bidderId,
      amount: bidAmount,
      isLeading: true,
      placedAt: new Date(),
    });

    // Update auction with new current bid and count
    auction.currentBid = bidAmount;
    auction.bidCount += 1;
    await auction.save();

    // Notify previous leader if it's someone else
    if (prevLeader && prevLeader.bidder.toString() !== bidderId) {
      await Notification.create({
        recipient: prevLeader.bidder,
        type: 'outbid',
        title: 'You have been outbid!',
        message: `Someone placed a higher bid of ₹${bidAmount} on "${auction.title}". Place a new bid to regain the lead!`,
        data: { auctionId: auction._id, amount: bidAmount },
      });
    }

    // Broadcast live update if socket.io is attached
    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${id}`).emit('bid:update', {
        auctionId: id,
        currentBid: bidAmount,
        bidCount: auction.bidCount,
        latestBid: {
          _id: newBid._id,
          amount: bidAmount,
          placedAt: newBid.placedAt,
          bidderName: req.user?.name || 'A Student',
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Bid placed successfully!',
      currentBid: bidAmount,
      bidCount: auction.bidCount,
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/auctions/:id (Edit listing by seller) ───────────────────────
export const updateAuction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sellerId = req.session.userId;
    const { title, description, condition, startingPrice, minIncrement, closingAt } = req.body;

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    if (auction.seller.toString() !== sellerId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this listing.' });
    }

    if (auction.status !== 'active' || isAuctionExpired(auction)) {
      return res.status(400).json({ success: false, message: 'Only active auctions can be edited.' });
    }

    if (title) auction.title = title.trim();
    if (description) auction.description = description.trim();
    if (condition) auction.condition = condition;

    // Price and increment can only be modified if no bids have been placed yet
    if (auction.bidCount === 0) {
      if (startingPrice) auction.startingPrice = Number(startingPrice);
      if (minIncrement) auction.minIncrement = Number(minIncrement);
      if (closingAt) {
        const newClosing = new Date(closingAt);
        if (newClosing > new Date()) auction.closingAt = newClosing;
      }
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

// ── DELETE /api/auctions/:id (Cancel auction by seller) ────────────────────
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

    auction.status = 'cancelled';
    await auction.save();

    // Notify all bidders if there were bids
    const bidders = await Bid.find({ auction: id }).distinct('bidder');
    for (const bId of bidders) {
      await Notification.create({
        recipient: bId,
        type: 'listing_cancelled',
        title: 'Auction Cancelled',
        message: `The auction for "${auction.title}" was cancelled by the seller.`,
        data: { auctionId: auction._id },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Auction cancelled successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auctions/:id/decide (Seller approve or reject winning bid) ────
export const sellerDecide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision } = req.body; // 'approve' | 'reject'
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

    // If both confirmed, mark as completed
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

// ── GET /api/dashboard/buyer (Buyer Dashboard data) ─────────────────────────
export const getBuyerDashboard = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    // Find all distinct auctions the user has bid on
    const userBids = await Bid.find({ bidder: userId }).sort({ placedAt: -1 }).lean();
    const auctionIds = [...new Set(userBids.map((b) => b.auction.toString()))];

    const auctions = await Auction.find({ _id: { $in: auctionIds } })
      .populate('seller', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    // Categorize
    const activeLeading = [];
    const outbid = [];
    const pendingWins = [];
    const handoverPending = [];
    const completedPurchases = [];
    const other = [];

    for (const a of auctions) {
      const isLead = a.currentBid && userBids.some((b) => b.auction.toString() === a._id.toString() && b.isLeading);

      if (a.status === 'active') {
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
      if (a.status === 'active') {
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
