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
    handover: {
      sellerConfirmed: { type: Boolean, default: false },
      buyerConfirmed: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for checking if auction is actively accepting bids
auctionSchema.virtual('isOpen').get(function () {
  return this.status === 'active' && new Date(this.closingAt) > new Date();
});

const Auction = mongoose.model('Auction', auctionSchema);

export default Auction;
