import mongoose from 'mongoose';

const itemAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    keywords: {
      type: String,
      required: [true, 'Keywords are required'],
      trim: true,
      maxlength: [100, 'Keywords cannot exceed 100 characters'],
    },
    category: {
      type: String,
      enum: ['all', 'cycles', 'calculators', 'books', 'electronics', 'others'],
      default: 'all',
    },
    maxBudget: {
      type: Number,
      required: [true, 'Maximum budget is required'],
      min: [1, 'Maximum budget must be at least 1'],
    },
    active: {
      type: Boolean,
      default: true,
    },
    triggeredCount: {
      type: Number,
      default: 0,
    },
    lastTriggeredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ItemAlert = mongoose.model('ItemAlert', itemAlertSchema);

export default ItemAlert;
