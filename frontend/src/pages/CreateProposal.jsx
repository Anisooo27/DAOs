import { useState } from 'react';
import { Send, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreateProposal = ({ provider, address }) => {
  const [description, setDescription] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [value, setValue] = useState('0');
  const [calldata, setCalldata] = useState('0x'); // Fallback signature hex
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Real implementation would interact with Governor smart contract
      // const signer = await provider.getSigner();
      // const governor = new ethers.Contract(GOVERNOR_ADDRESS, GovernorABI, signer);
      // const tx = await governor.propose([targetAddress], [value], [calldata], description);
      // const receipt = await tx.wait();
      
      console.log("Mock Proposal Created:", { description, targetAddress, value, calldata });
      
      // Simulate confirmation time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to cast vote (simulating the newly generated proposal ID being 123)
      navigate('/cast-vote?proposalId=123');
    } catch (error) {
      console.error("Error creating proposal:", error);
      alert("Failed to create proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <div className="page-header">
        <h1 className="page-title">Propose Action</h1>
        <p className="page-subtitle">Draft a new proposal for the DAO to vote on, detailing payload targets and descriptions.</p>
      </div>

      <div className="glass-panel">
        <form onSubmit={handleCreateProposal}>
          <div className="form-group">
            <label className="form-label" htmlFor="description">Proposal Description</label>
            <textarea
              id="description"
              className="form-input"
              rows="4"
              placeholder="# Markdown supported&#10;Describe the rationale and outcome of this proposal..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>

          <div className="form-group mt-4">
            <label className="form-label" htmlFor="target">Target Contract Address</label>
            <input
              id="target"
              type="text"
              className="form-input"
              placeholder="0x..."
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              required
            />
          </div>

          <div className="form-group mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <label className="form-label" htmlFor="value">Value (ETH)</label>
              <input
                id="value"
                type="number"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="calldata">Calldata</label>
              <input
                id="calldata"
                type="text"
                className="form-input"
                placeholder="0x..."
                value={calldata}
                onChange={(e) => setCalldata(e.target.value)}
              />
            </div>
          </div>

          <div className="glass-panel mt-4 mb-4" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px' }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent-secondary)' }}>
              <FileText size={16} /> 
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Proposal Lifecycle</span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
              Creating a proposal generates a unique Proposal ID. Voting is off-chain, requiring a minimum active threshold before it can be queued for on-chain execution.
            </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px' }}
            disabled={isSubmitting || !address}
          >
            <Send size={18} />
            {isSubmitting ? 'Submitting to Network...' : 'Submit Proposal'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateProposal;
