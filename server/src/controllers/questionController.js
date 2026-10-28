import Question from '../models/Question.js';
import Auction from '../models/Auction.js';
import Notification from '../models/Notification.js';

// ── GET /api/auctions/:id/questions (Get Q&A for an auction) ───────────────
export const getAuctionQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId;

    const auction = await Auction.findById(id).select('seller');
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    const isSeller = userId && auction.seller.toString() === userId;

    let query;
    if (isSeller) {
      // Seller sees all questions (answered and pending)
      query = { auction: id };
    } else if (userId) {
      // User sees all answered public questions PLUS their own pending questions
      query = {
        auction: id,
        $or: [{ answer: { $ne: null } }, { asker: userId }],
      };
    } else {
      // Guests see only answered public questions
      query = { auction: id, answer: { $ne: null } };
    }

    const questions = await Question.find(query)
      .populate('asker', 'name campus department')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      questions,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auctions/:id/questions (Ask a question before bidding) ───────
export const askQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question } = req.body;
    const userId = req.session.userId;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide question text.' });
    }

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    if (auction.seller.toString() === userId) {
      return res.status(400).json({ success: false, message: 'You cannot ask questions on your own listing.' });
    }

    const newQuestion = await Question.create({
      auction: id,
      asker: userId,
      question: question.trim(),
    });

    const populated = await newQuestion.populate('asker', 'name');

    // Notify the seller
    await Notification.create({
      recipient: auction.seller,
      type: 'question_received',
      title: `❓ New Question on "${auction.title}"`,
      message: `${populated.asker?.name || 'A student'} asked: "${question.trim()}". Tap to answer!`,
      data: { auctionId: auction._id, questionId: newQuestion._id },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${id}`).emit('question:new', {
        auctionId: id,
        question: populated,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Question submitted. The seller will be notified to answer.',
      question: populated,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auctions/:id/questions/:questionId/answer (Seller answers question) ─
export const answerQuestion = async (req, res, next) => {
  try {
    const { id, questionId } = req.params;
    const { answer } = req.body;
    const userId = req.session.userId;

    if (!answer || !answer.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide an answer.' });
    }

    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ success: false, message: 'Auction not found.' });
    }

    if (auction.seller.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only the seller can answer questions for this listing.' });
    }

    const questionDoc = await Question.findOne({ _id: questionId, auction: id });
    if (!questionDoc) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    questionDoc.answer = answer.trim();
    questionDoc.answeredAt = new Date();
    questionDoc.isPublic = true;
    await questionDoc.save();

    const populated = await questionDoc.populate('asker', 'name');

    // Notify the student who asked
    await Notification.create({
      recipient: questionDoc.asker,
      type: 'question_answered',
      title: `💬 Seller Answered on "${auction.title}"`,
      message: `The seller replied: "${answer.trim()}"`,
      data: { auctionId: auction._id, questionId: questionDoc._id },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`auction:${id}`).emit('question:answered', {
        auctionId: id,
        question: populated,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Answer published publicly on the auction page.',
      question: populated,
    });
  } catch (err) {
    next(err);
  }
};
