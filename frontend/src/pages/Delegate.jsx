import { useState } from 'react';
import { UserPlus, Info } from 'lucide-react';

const Delegate = ({ provider, address }) => {
  const [delegatee, setDelegatee] = useState('');
  const [isDelegating, setIsDelegating] = useState(false);
  const [txHash, setTxHash] = useState('');

  const handleDelegate = async (e) => {
    e.preventDefault();
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setIsDelegating(true);
      // In a full implementation, this interacts with ERC20Votes contract
      // const signer = await provider.getSigner();
      // const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20VotesABI, signer);
      // const tx = await tokenContract.delegate(delegatee);
      // await tx.wait();

      // Simulated Delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockHash = `0x${Math.random().toString(16).slice(2, 66).padEnd(64, '0')}`;
      setTxHash(mockHash);
      setDelegatee('');
    } catch (error) {
      console.error("Error delegating votes:", error);
      alert("Failed to delegate votes");
    } finally {
      setIsDelegating(false);
    }
  };

  return (
    <div className="form-container">
      <div className="page-header">
        <h1 className="page-title">Delegate Votes</h1>
        <p className="page-subtitle">Assign your governance voting power to yourself or a trusted representative.</p>
      </div>

      <div className="glass-panel">
        <form onSubmit={handleDelegate}>
          <div className="form-group">
            <label className="form-label" htmlFor="delegatee">Delegatee Address</label>
            <input
              id="delegatee"
              type="text"
              className="form-input"
              placeholder="0x..."
              value={delegatee}
              onChange={(e) => setDelegatee(e.target.value)}
              required
            />
            <p className="mt-4 text-muted" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={14} /> To vote yourself, delegate to your own address.
            </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px' }}
            disabled={isDelegating || !address}
          >
            <UserPlus size={18} />
            {isDelegating ? 'Delegating...' : 'Delegate Votes'}
          </button>
        </form>

        {txHash && (
          <div className="glass-panel mt-4" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <h4 style={{ color: 'var(--success)', marginBottom: '8px' }}>Delegation Successful!</h4>
            <div style={{ wordBreak: 'break-all', fontSize: '0.85rem' }}>
              <span className="text-muted">Transaction Hash: </span>
              {txHash}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Delegate;
