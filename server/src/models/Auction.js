import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['cycles', 'calculators', 'books', 'electronics', 'others'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    condition: {
      type: String,
      required: [true, 'Condition is required'],
      enum: ['new', 'like-new', 'good', 'fair', 'poor'],
    },
    images: [
      {
        type: String,
      },
    ],
    startingPrice: {
      type: Number,
      required: [true, 'Starting price is required'],
      min: [1, 'Starting price must be at least 1'],
    },
    maxPrice: {
      type: Number,
      required: [true, 'Maximum price is required'],
      min: [1, 'Maximum price must be at least 1'],
      validate: {
        validator: function (val) {
          if (val == null) return true;
          return val > this.startingPrice;
        },
        message: 'Maximum price must be strictly greater than starting price',
      },
    },
    hitMaxPrice: {
      type: Boolean,
      default: false,
    },
    minIncrement: {
      type: Number,
      required: [true, 'Minimum increment is required'],
      min: [1, 'Minimum increment must be at least 1'],
      default: 10,
    },
    closingAt: {
      type: Date,
      required: [true, 'Closing date and time is required'],
    },
    status: {
      type: String,
      enum: [
        'active',
        'pending_seller_decision',
        'approved',
        'rejected',
        'cancelled',
        'handover_pending',
        'completed',
        'unsold',
        'pickup_failed',
      ],
      default: 'active',
    },
    currentBid: {
      type: Number,
      default: null,
    },
    bidCount: {
      type: Number,
      default: 0,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Early closing metadata
    closedEarly: {
      type: Boolean,
      default: false,
    },
    closedEarlyAt: {
      type: Date,
      default: null,
    },
    closedEarlyBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    winnerSelectionMethod: {
      type: String,
      enum: ['automatic_highest', 'seller_selected', 'none'],
      default: 'automatic_highest',
    },
    selectedWinningBid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bid',
      default: null,
    },
    selectedWinningAmount: {
      type: Number,
      default: null,
    },
    // Anti-Sniping Last-Minute Extension
    extendedByAntiSnipe: {
      type: Boolean,
      default: false,
    },
    extensionCount: {
      type: Number,
      default: 0,
    },
    // Automatic Proxy Bids
    proxyBids: [
      {
        bidder: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        maxAmount: {
          type: Number,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    handover: {
      sellerConfirmed: { type: Boolean, default: false },
      buyerConfirmed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
      sellerPhone: { type: String, default: null },
      buyerPhone: { type: String, default: null },
      sellerPhoneSharedAt: { type: Date, default: null },
      buyerPhoneSharedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for checking if auction is actively accepting bids
auctionSchema.virtual('isOpen').get(function () {
  return this.status === 'active' && !this.closedEarly && new Date(this.closingAt) > new Date();
});

const Auction = mongoose.model('Auction', auctionSchema);

export default Auction;
