import ItemAlert from '../models/ItemAlert.js';
import Auction from '../models/Auction.js';
import Notification from '../models/Notification.js';

// ── GET /api/alerts (List student's active item alerts) ─────────────────────
export const getMyAlerts = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const alerts = await ItemAlert.find({ user: userId }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      alerts,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/alerts (Create item alert / watchlist request) ────────────────
export const createAlert = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { keywords, category = 'all', maxBudget } = req.body;

    if (!keywords || !keywords.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide item keywords (e.g. "scientific calculator", "gear cycle").' });
    }

    const budgetNum = Number(maxBudget);
    if (!budgetNum || budgetNum < 1) {
      return res.status(400).json({ success: false, message: 'Please specify a maximum budget greater than ₹0.' });
    }

    const alert = await ItemAlert.create({
      user: userId,
      keywords: keywords.trim(),
      category: ['all', 'cycles', 'calculators', 'books', 'electronics', 'others'].includes(category) ? category : 'all',
      maxBudget: budgetNum,
    });

    // Immediately search for any currently active auctions matching this alert
    const searchFilter = {
      status: 'active',
      closedEarly: { $ne: true },
      closingAt: { $gt: new Date() },
      startingPrice: { $lte: budgetNum },
      $or: [
        { title: { $regex: keywords.trim(), $options: 'i' } },
        { description: { $regex: keywords.trim(), $options: 'i' } },
      ],
    };

    if (category && category !== 'all') {
      searchFilter.category = category;
    }

    const existingMatches = await Auction.find(searchFilter).limit(4).lean();

    res.status(201).json({
      success: true,
      message: `Alert set for "${keywords.trim()}" up to ₹${budgetNum}! You'll be notified as soon as a student lists it.`,
      alert,
      existingMatches,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/alerts/:id (Delete alert) ───────────────────────────────────
export const deleteAlert = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const deleted = await ItemAlert.findOneAndDelete({ _id: id, user: userId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Alert removed successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ── Helper: Trigger matching alerts when a new auction is published ────────
export const checkAndTriggerAlerts = async (auction) => {
  try {
    // Find all active alerts from other users
    const query = {
      active: true,
      user: { $ne: auction.seller },
      maxBudget: { $gte: auction.startingPrice },
    };

    if (auction.category) {
      query.$or = [{ category: 'all' }, { category: auction.category }];
    }

    const alerts = await ItemAlert.find(query);

    for (const alert of alerts) {
      // Check if keyword matches title or description
      const regex = new RegExp(alert.keywords.trim(), 'i');
      const matchesTitle = regex.test(auction.title);
      const matchesDesc = regex.test(auction.description);

      if (matchesTitle || matchesDesc) {
        // Create match notification
        await Notification.create({
          recipient: alert.user,
          type: 'alert_match',
          title: `🎯 Item Alert Match: "${auction.title}"`,
          message: `An item matching your alert for "${alert.keywords}" was just listed for starting price ₹${auction.startingPrice} (within your budget of ₹${alert.maxBudget})!`,
          data: {
            auctionId: auction._id,
            alertId: alert._id,
            startingPrice: auction.startingPrice,
          },
        });

        // Update trigger metrics
        alert.triggeredCount += 1;
        alert.lastTriggeredAt = new Date();
        await alert.save();
      }
    }
  } catch (err) {
    console.error('Error triggering item alerts:', err);
  }
};
