import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import Notification from '../models/Notification.js';

export const startAuctionCloser = (io) => {
  const checkExpiredAuctions = async () => {
    try {
      const now = new Date();

      // Find active auctions whose scheduled closing time has passed and were not closed early
      const expiredAuctions = await Auction.find({
        status: 'active',
        closedEarly: { $ne: true },
        closingAt: { $lte: now },
      });

      for (const auction of expiredAuctions) {
        if (auction.bidCount === 0) {
          // No bids -> mark as unsold
          auction.status = 'unsold';
          auction.winnerSelectionMethod = 'none';
          await auction.save();

          await Notification.create({
            recipient: auction.seller,
            type: 'auction_closed',
            title: 'Auction Ended (Unsold)',
            message: `Your listing "${auction.title}" ended with no bids.`,
            data: { auctionId: auction._id },
          });
        } else {
          // Has bids -> find leading bid and set to pending_seller_decision with automatic_highest
          const leadingBid = await Bid.findOne({ auction: auction._id, isLeading: true });

          if (leadingBid) {
            auction.status = 'pending_seller_decision';
            auction.winner = leadingBid.bidder;
            auction.winnerSelectionMethod = 'automatic_highest';
            auction.selectedWinningBid = leadingBid._id;
            auction.selectedWinningAmount = leadingBid.amount;
            await auction.save();

            // Notify seller to review & approve
            await Notification.create({
              recipient: auction.seller,
              type: 'auction_closed',
              title: 'Auction Ended — Decision Required',
              message: `Your auction for "${auction.title}" ended at scheduled deadline with a top bid of ₹${leadingBid.amount}. Please review and approve or reject.`,
              data: { auctionId: auction._id, amount: leadingBid.amount, selectionMethod: 'automatic_highest' },
            });

            // Notify winning bidder
            await Notification.create({
              recipient: leadingBid.bidder,
              type: 'auction_won',
              title: 'You are the Top Bidder! 🏆',
              message: `The auction for "${auction.title}" ended with your leading bid of ₹${leadingBid.amount}. Awaiting seller approval.`,
              data: { auctionId: auction._id, amount: leadingBid.amount, selectionMethod: 'automatic_highest' },
            });
          } else {
            auction.status = 'unsold';
            auction.winnerSelectionMethod = 'none';
            await auction.save();
          }
        }

        // Broadcast event if socket io is provided
        if (io) {
          io.to(`auction:${auction._id}`).emit('auction:status', {
            auctionId: auction._id,
            status: auction.status,
            winnerSelectionMethod: auction.winnerSelectionMethod,
          });
        }
      }
    } catch (err) {
      console.error('[AuctionCloser] Error checking auctions:', err.message);
    }
  };

  // Run immediately on start, then every 30 seconds
  checkExpiredAuctions();
  const intervalId = setInterval(checkExpiredAuctions, 30 * 1000);

  return intervalId;
};
