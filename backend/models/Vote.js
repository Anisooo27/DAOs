const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  proposalId: { type: String, required: true },
  voter: { type: String, required: true },
  // choice is usually 0 (Against), 1 (For), 2 (Abstain) in OpenZeppelin Governor
  choice: { type: Number, required: true },
  signature: { type: String, required: true },
}, { timestamps: true });

// Prevent duplicate voting per proposal and voter
voteSchema.index({ proposalId: 1, voter: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
