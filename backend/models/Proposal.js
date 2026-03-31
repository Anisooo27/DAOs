const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  proposalId: {
    type: String,
    required: true,
    unique: true,
  },
  proposerAddress: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  target: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  calldata: {
    type: String,
    required: true,
  },
  signature: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXECUTED'],
    default: 'ACTIVE',
  }
});

module.exports = mongoose.model('Proposal', proposalSchema);
