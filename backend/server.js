require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { ethers } = require('ethers');
const Vote = require('./models/Vote');
const Delegation = require('./models/Delegation');
const Proposal = require('./models/Proposal');
const {
  GOVERNOR_ABI,
  GOVERNOR_ADDRESS,
  RPC_URL,
  PRIVATE_KEY,
  isConfigured
} = require('./config/contractConfig');

const app = express();
app.use(express.json());

// Enhanced CORS for production
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB only when running the server directly (not during tests)
// Tests manage their own connection via mongodb-memory-server

// --- Endpoints ---

// GET /config/contract
app.get('/config/contract', (req, res) => {
  res.json({ governorAddress: GOVERNOR_ADDRESS });
});

// 0. POST /delegate
// Collect delegations off-chain
app.post('/delegate', async (req, res) => {
  try {
    const { delegatorAddress, delegateeAddress, signature } = req.body;

    // Validate required fields
    if (!delegatorAddress || !delegateeAddress || !signature) {
      return res.status(400).json({ error: 'Missing required fields: delegatorAddress, delegateeAddress, signature' });
    }

    // Verify signature
    const message = `Delegate votes to ${delegateeAddress}`;
    let signerAddress;
    try {
      signerAddress = ethers.verifyMessage(message, signature);
    } catch (verificationError) {
      console.error('Signature verification error:', verificationError);
      return res.status(400).json({ error: `Signature verification failed: ${verificationError.message || 'Unknown error'}` });
    }

    if (signerAddress.toLowerCase() !== delegatorAddress.toLowerCase()) {
      console.error(`Invalid signature: expected ${delegatorAddress.toLowerCase()}, got ${signerAddress.toLowerCase()}`);
      return res.status(401).json({ error: 'Invalid signature: signer does not match delegator' });
    }

    const newDelegation = new Delegation({
      delegatorAddress: delegatorAddress.toLowerCase(),
      delegateeAddress: delegateeAddress.toLowerCase(),
      signature
    });

    await newDelegation.save();
    return res.status(201).json({ message: 'Delegation recorded successfully', delegation: newDelegation });

  } catch (error) {
    console.error('Error saving delegation:', error);
    return res.status(500).json({ error: `Internal server error while recording delegation: ${error.message || 'Unknown error'}` });
  }
});

// 0.5 POST /propose
// Create a new off-chain proposal
app.post('/propose', async (req, res) => {
  try {
    const { proposalId, proposerAddress, description, target, value, calldata, signature } = req.body;

    if (!proposalId || !proposerAddress || !description || !target || value === undefined || !calldata || !signature) {
      return res.status(400).json({ error: 'Missing required fields for proposal' });
    }

    const message = JSON.stringify({
      proposalDescription: description,
      targetContract: target,
      value: value.toString(),
      calldata: calldata
    });

    let signerAddress;
    try {
      signerAddress = ethers.verifyMessage(message, signature);
    } catch (err) {
      console.error('Proposal signature verification error:', err);
      return res.status(400).json({ error: `Signature verification failed: ${err.message || 'Unknown error'}` });
    }

    if (signerAddress.toLowerCase() !== proposerAddress.toLowerCase()) {
      console.error(`Invalid signature: expected ${proposerAddress.toLowerCase()}, got ${signerAddress.toLowerCase()}`);
      return res.status(401).json({ error: 'Invalid signature: signer does not match proposer' });
    }

    const newProposal = new Proposal({
      proposalId,
      proposerAddress: proposerAddress.toLowerCase(),
      description,
      target,
      value: value.toString(),
      calldata,
      signature
    });

    await newProposal.save();
    return res.status(201).json({ success: true, proposalId });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Proposal with this ID already exists' });
    }
    console.error('Error creating proposal:', error.message || error);
    return res.status(500).json({ error: `Internal server error while creating proposal: ${error.message || 'Unknown error'}` });
  }
});

// 1. POST /vote
// Collect confidential votes
// Requires: proposalId, voter, choice, signature
app.post('/vote', async (req, res) => {
  try {
    const { proposalId, voter, choice, signature } = req.body;

    // Validate required fields
    if (!proposalId || !voter || choice === undefined || !signature) {
      return res.status(400).json({ error: 'Missing required fields: proposalId, voter, choice, signature' });
    }

    // Convert choice to Number if it comes as a string
    const numericChoice = Number(choice);
    if (isNaN(numericChoice)) {
      return res.status(400).json({ error: 'Choice must be a number' });
    }

    // In a production environment with a live frontend, we would verify the signature here:
    // const message = ethers.getBytes(ethers.id(`${proposalId}-${choice}`));
    // const signerAddress = ethers.verifyMessage(message, signature);
    // if (signerAddress.toLowerCase() !== voter.toLowerCase()) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    const newVote = new Vote({
      proposalId,
      voter: voter.toLowerCase(),
      choice: numericChoice,
      signature
    });

    await newVote.save();
    return res.status(201).json({ message: 'Vote recorded successfully', vote: newVote });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Voter has already cast a vote for this proposal' });
    }
    console.error('Error saving vote:', error);
    return res.status(500).json({ error: 'Internal server error while recording vote' });
  }
});

// 2. GET /results/:proposalId
// Return aggregated results for a specific proposal
app.get('/results/:proposalId', async (req, res) => {
  try {
    const { proposalId } = req.params;

    const results = await Vote.aggregate([
      { $match: { proposalId: proposalId } },
      { $group: { _id: "$choice", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Format results to a more readable object { choice0: count, choice1: count, ... }
    // e.g., { 0: 5, 1: 10, 2: 1 } 
    // 0 = Against, 1 = For, 2 = Abstain in standard OpenZeppelin governor
    const formattedResults = results.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return res.status(200).json({
      proposalId,
      results: formattedResults
    });

  } catch (error) {
    console.error('Error fetching results:', error);
    return res.status(500).json({ error: 'Internal server error while fetching results' });
  }
});

// 2.5 GET /proposals
// Return all proposals with their aggregated votes
app.get('/proposals', async (req, res) => {
  try {
    const proposals = await Proposal.aggregate([
      {
        $lookup: {
          from: 'votes',
          localField: 'proposalId',
          foreignField: 'proposalId',
          as: 'votes'
        }
      },
      {
        $project: {
          proposalId: 1,
          proposerAddress: 1,
          description: 1,
          target: 1,
          value: 1,
          calldata: 1,
          timestamp: 1,
          status: 1,
          votes: { choice: 1 }
        }
      },
      {
        $sort: { timestamp: -1 }
      }
    ]);

    const formattedProposals = proposals.map(p => {
      const tally = { '0': 0, '1': 0, '2': 0 };
      if (p.votes) {
        p.votes.forEach(v => {
          if (tally[v.choice] !== undefined) {
            tally[v.choice]++;
          }
        });
      }
      return {
        proposalId: p.proposalId,
        proposerAddress: p.proposerAddress,
        description: p.description,
        target: p.target,
        value: p.value,
        calldata: p.calldata,
        timestamp: p.timestamp,
        status: p.status || 'ACTIVE',
        results: tally
      };
    });

    return res.status(200).json(formattedProposals);
  } catch (err) {
    console.error('Error fetching proposals:', err);
    return res.status(500).json({ error: 'Internal server error while fetching proposals' });
  }
});

// POST /proposals/:proposalId/execute
// Mark a proposal as executed off-chain
app.post('/proposals/:proposalId/execute', async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { executorAddress, governorAddress, transactionHash } = req.body || {};

    console.log(`\n--- Proposal Execution Trace ---`);
    console.log(`[on-chain] Relayer Wallet: ${executorAddress || 'Frontend Wallet'}`);
    console.log(`[on-chain] Governor Address: ${governorAddress || 'Unknown'}`);
    console.log(`[on-chain] Proposal ID: ${proposalId}`);
    console.log(`[on-chain] Transaction Hash: ${transactionHash || 'Unknown'}`);

    const proposal = await Proposal.findOneAndUpdate(
      { proposalId },
      { status: 'EXECUTED' },
      { new: true }
    );
    
    if (!proposal) {
      console.log(`[database] MongoDB Update Status: FAILED (Proposal not found)`);
      console.log(`--------------------------------\n`);
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    console.log(`[database] MongoDB Update Status: SUCCESS (Marked as EXECUTED)`);
    console.log(`--------------------------------\n`);
    
    return res.status(200).json({ success: true, proposal });
  } catch (error) {
    console.error(`[database] MongoDB Update Status: FAILED (Error)`);
    console.error('Error executing proposal:', error);
    console.log(`--------------------------------\n`);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. POST /submit/:proposalId
// Aggregate off-chain votes and submit the winning choice to the DAOGovernor
// contract on-chain via castVote, using a funded relayer wallet.
app.post('/submit/:proposalId', async (req, res) => {
  try {
    const { proposalId } = req.params;

    // --- Guard: refuse gracefully if contract isn't configured ---
    if (!isConfigured()) {
      return res.status(503).json({
        error: 'On-chain submission not configured. Set GOVERNOR_ADDRESS and PRIVATE_KEY in your .env file.'
      });
    }

    // --- Step 1: Aggregate off-chain votes from MongoDB ---
    const results = await Vote.aggregate([
      { $match: { proposalId: proposalId } },
      { $group: { _id: '$choice', count: { $sum: 1 } } }
    ]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'No votes found for this proposal' });
    }

    // Build a readable payload: { "0": 3, "1": 10, "2": 1 }
    const submittedPayload = results.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    // --- Step 2: Determine the winning choice by plurality ---
    // OpenZeppelin convention: 0 = Against, 1 = For, 2 = Abstain
    const winningEntry = results.reduce((best, curr) =>
      curr.count > best.count ? curr : best
    );
    const winningChoice = winningEntry._id; // numeric (0, 1, or 2)

    // --- Step 3: Connect to the DAOGovernor contract via ethers.js ---
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(GOVERNOR_ADDRESS, GOVERNOR_ABI, wallet);

    console.log(`[on-chain] Relayer wallet: ${wallet.address}`);
    console.log(`[on-chain] Submitting castVote(${proposalId}, ${winningChoice}) to Governor @ ${GOVERNOR_ADDRESS}`);
    console.log('[on-chain] Full tally payload:', submittedPayload);

    // --- Step 4: Send the transaction and wait for 1 confirmation ---
    // proposalId from the URL is a string; the contract expects uint256.
    // ethers.js handles BigInt conversion automatically from a numeric string.
    const tx = await contract.castVote(proposalId, winningChoice);
    const receipt = await tx.wait();

    return res.status(200).json({
      message: 'Results successfully submitted on-chain via castVote',
      proposalId,
      winningChoice,
      submittedPayload,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    });

  } catch (error) {
    console.error('Error submitting results on-chain:', error);
    // Surface a helpful message when the RPC/contract call fails
    return res.status(500).json({
      error: 'On-chain submission failed',
      details: error.reason || error.message
    });
  }
});

// Export the app for testing
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dao_voting')
    .then(() => {
      console.log('MongoDB connected successfully');
      app.listen(PORT, '0.0.0.0', () => console.log(`Backend server running on port ${PORT}`));
    })
    .catch(err => console.error('MongoDB connection error:', err));
}


//cd governor-starter
//cd design-and-Implement-a-DAO-Governance-Smart-Contract-System-with-Off-Chain-Voting-Integration
//cd backend
//node server.js