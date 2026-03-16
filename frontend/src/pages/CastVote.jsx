import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { CheckCircle, XCircle, MinusCircle, ShieldCheck } from 'lucide-react';
import config from '../config';

const CastVote = ({ provider, address }) => {
  const [searchParams] = useSearchParams();
  const initialProposalId = searchParams.get('proposalId') || '';
  
  const [proposalId, setProposalId] = useState(initialProposalId);
  const [choice, setChoice] = useState(null);
  const [isCasting, setIsCasting] = useState(false);
  const [status, setStatus] = useState(null);

  const OPTIONS = [
    { id: 0, label: 'Against', icon: XCircle, color: 'var(--danger)' },
    { id: 1, label: 'For', icon: CheckCircle, color: 'var(--success)' },
    { id: 2, label: 'Abstain', icon: MinusCircle, color: 'var(--text-muted)' }
  ];

  const handleSignAndVote = async () => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }
    
    if (!proposalId.trim() || choice === null) {
      alert("Please enter a Proposal ID and select a voting option.");
      return;
    }

    try {
      setIsCasting(true);
      setStatus(null);

      // Sign the vote
      const signer = await provider.getSigner();
      const message = ethers.getBytes(ethers.id(`${proposalId}-${choice}`));
      const signature = await signer.signMessage(message);

      // Send to off-chain backend
      const response = await fetch(config.VOTE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proposalId,
          voter: address,
          choice,
          signature
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'Vote successfully recorded off-chain!' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to record vote' });
      }

    } catch (error) {
      console.error("Error casting vote:", error);
      setStatus({ type: 'error', message: 'Error signing or submitting vote. See console for details.' });
    } finally {
      setIsCasting(false);
    }
  };

  return (
    <div className="form-container">
      <div className="page-header">
        <h1 className="page-title">Cast Off-Chain Vote</h1>
        <p className="page-subtitle">Sign your democratic choice securely via MetaMask for gasless off-chain recording.</p>
      </div>

      <div className="glass-panel">
        <div className="form-group mb-4">
          <label className="form-label" htmlFor="proposalId">Proposal ID</label>
          <input
            id="proposalId"
            type="text"
            className="form-input"
            style={{ fontSize: '1.2rem', padding: '16px' }}
            placeholder="e.g., 123"
            value={proposalId}
            onChange={(e) => setProposalId(e.target.value)}
          />
        </div>

        <label className="form-label mb-4" style={{ display: 'block' }}>Select your choice:</label>
        
        <div className="content-grid mb-4" style={{ gap: '16px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isSelected = choice === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setChoice(opt.id)}
                className="btn"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px 16px',
                  height: 'auto',
                  background: isSelected ? `rgba(${opt.color === 'var(--success)' ? '16, 185, 129' : opt.color === 'var(--danger)' ? '239, 68, 68' : '148, 163, 184'}, 0.15)` : 'rgba(255, 255, 255, 0.05)',
                  borderColor: isSelected ? opt.color : 'var(--panel-border)',
                  color: isSelected ? opt.color : 'var(--text-main)',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                  boxShadow: isSelected ? `0 4px 12px rgba(${opt.color === 'var(--success)' ? '16, 185, 129' : opt.color === 'var(--danger)' ? '239, 68, 68' : '148, 163, 184'}, 0.2)` : 'none',
                }}
              >
                <Icon size={28} style={{ marginBottom: '12px', color: isSelected ? opt.color : 'var(--text-muted)' }} />
                <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{opt.label}</span>
              </button>
            )
          })}
        </div>

        <div className="glass-panel mt-4 mb-4" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px' }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent-primary)' }}>
            <ShieldCheck size={16} /> 
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Secure Signature</span>
          </div>
          <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
            Voting requires signing a typed message with your connected wallet. This generates a cryptographic proof of your choice without incurring any gas fees.
          </p>
        </div>

        <button 
          onClick={handleSignAndVote}
          className="btn btn-primary" 
          style={{ width: '100%', padding: '16px', fontSize: '1.05rem' }}
          disabled={isCasting || choice === null || !proposalId || !address}
        >
          {isCasting ? 'Waiting for Signature...' : 'Sign & Submit Vote'}
        </button>

        {status && (
          <div 
            className="glass-panel mt-4" 
            style={{ 
              background: status.type === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', 
              borderColor: status.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' 
            }}
          >
            <h4 style={{ color: status.type === 'success' ? 'var(--success)' : 'var(--danger)', marginBottom: '4px' }}>
              {status.type === 'success' ? 'Success' : 'Error'}
            </h4>
            <div style={{ fontSize: '0.9rem' }}>{status.message}</div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CastVote;
