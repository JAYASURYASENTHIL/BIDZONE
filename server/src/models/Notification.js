import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'outbid',
        'auction_won',
        'auction_closed',
        'seller_approved',
        'seller_rejected',
        'handover_update',
        'listing_cancelled',
        'max_price_hit',
        'contact_shared',
        'alert_match',
        'question_received',
        'question_answered',
        'auto_bid_placed',
        'auto_bid_outbid',
        'auction_extended',
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    data: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
