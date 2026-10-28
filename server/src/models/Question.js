import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      index: true,
    },
    asker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [500, 'Question cannot exceed 500 characters'],
    },
    answer: {
      type: String,
      trim: true,
      maxlength: [1000, 'Answer cannot exceed 1000 characters'],
      default: null,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Question = mongoose.model('Question', questionSchema);

export default Question;
