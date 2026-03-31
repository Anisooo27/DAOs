import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, MinusCircle, Search, Activity, RefreshCw, ShieldCheck, ExternalLink, Info } from 'lucide-react';
import { ethers } from 'ethers';
import config from '../config';

const Results = ({ provider, address }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProposalId = searchParams.get('proposalId') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialProposalId);
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Track submission status per proposalId
  const [submitStatuses, setSubmitStatuses] = useState({});
  const [isSubmittingMap, setIsSubmittingMap] = useState({});

  const OPTIONS = [
    { id: '1', label: 'For', icon: CheckCircle, color: 'var(--success)' },
    { id: '0', label: 'Against', icon: XCircle, color: 'var(--danger)' },
    { id: '2', label: 'Abstain', icon: MinusCircle, color: 'var(--text-muted)' }
  ];

  const fetchProposals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(config.PROPOSALS_ENDPOINT);
      const data = await response.json();
      
      if (response.ok) {
        setProposals(data);
      } else {
        setError(data.error || 'Failed to fetch proposals');
      }
    } catch (err) {
      console.error("Error fetching proposals:", err);
      setError('Could not connect to the backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams(searchQuery ? { proposalId: searchQuery } : {});
  };

  // When search query is entered, auto-filter the proposals
  const filteredProposals = proposals.filter(p => 
    p.proposalId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitOnChain = async (proposal) => {
    const { proposalId } = proposal;
    try {
      setIsSubmittingMap(prev => ({ ...prev, [proposalId]: true }));
      setSubmitStatuses(prev => ({ ...prev, [proposalId]: null }));
      
      if (!provider) throw new Error("Wallet provider not found. Please connect your wallet.");
      const signer = await provider.getSigner();

      const configRes = await fetch(config.CONFIG_ENDPOINT);
      if (!configRes.ok) throw new Error("Failed to fetch contract configuration.");
      const confData = await configRes.json();
      
      const GOVERNOR_ABI = [
        "function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) public payable returns (uint256)"
      ];

      const governorContract = new ethers.Contract(confData.governorAddress, GOVERNOR_ABI, signer);
      
      const descriptionHash = ethers.id(proposal.description);

      const tx = await governorContract.execute(
        [proposal.target],
        [proposal.value],
        [proposal.calldata],
        descriptionHash
      );
      
      await tx.wait(); // Wait for confirmation
      
      // Update backend status to EXECUTED
      const response = await fetch(config.EXECUTE_ENDPOINT(proposalId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          executorAddress: address,
          governorAddress: confData.governorAddress,
          transactionHash: tx.hash
        })
      });
      
      if (!response.ok) {
        console.warn("Executed on-chain but failed to update backend.");
      } else {
        setProposals(prev => prev.map(p => p.proposalId === proposalId ? { ...p, status: 'EXECUTED' } : p));
      }

      // Determine the correct network explorer string
      const network = await provider.getNetwork();
      let explorerUrl = null;
      if (network.chainId === 11155111n) {
        explorerUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
      } else if (network.chainId === 1n) {
        explorerUrl = `https://etherscan.io/tx/${tx.hash}`;
      }
      
      setSubmitStatuses(prev => ({
        ...prev, 
        [proposalId]: { 
          type: 'success', 
          message: 'Results successfully executed on-chain!', 
          txHash: tx.hash,
          explorerUrl
        }
      }));
      
    } catch (err) {
      console.error("Error submitting on-chain:", err);
      setSubmitStatuses(prev => ({
        ...prev, 
        [proposalId]: { type: 'error', message: err.reason || err.message || 'Execution failed.' }
      }));
    } finally {
      setIsSubmittingMap(prev => ({ ...prev, [proposalId]: false }));
    }
  };

  const calculateTotal = (res) => {
    if (!res) return 0;
    return (res['0'] || 0) + (res['1'] || 0) + (res['2'] || 0);
  };

  const calculatePercentage = (count, total) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  return (
    <div className="form-container" style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <h1 className="page-title">Voting Results</h1>
        <p className="page-subtitle">Real-time off-chain aggregation of all DAO proposals.</p>
      </div>

      <div className="glass-panel mb-4">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <div className="form-group mb-0" style={{ flexGrow: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by Proposal ID or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }}>
            <Search size={18} /> Search
          </button>
        </form>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>All Proposals</h3>
        <button 
          className="btn" 
          style={{ padding: '6px 12px', fontSize: '0.9rem' }}
          onClick={fetchProposals}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> Refresh List
        </button>
      </div>

      {isLoading && proposals.length === 0 && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <Activity className="text-accent" size={32} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 16px' }} />
          <p className="text-muted">Loading proposals framework...</p>
        </div>
      )}

      {error && (
        <div className="glass-panel mb-4" style={{ borderLeft: '4px solid var(--danger)' }}>
          <h4 style={{ color: 'var(--danger)', marginBottom: '4px' }}>Error</h4>
          <p className="text-muted">{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {!isLoading && filteredProposals.length === 0 && !error && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
            <Info className="text-muted" size={32} style={{ margin: '0 auto 16px' }} />
            <p className="text-muted">No proposals found matching your criteria.</p>
          </div>
        )}

        {filteredProposals.map(proposal => {
          const totalVotes = calculateTotal(proposal.results);
          const submitStatus = submitStatuses[proposal.proposalId];
          const isSubmitting = isSubmittingMap[proposal.proposalId];

          return (
            <div key={proposal.proposalId} className="glass-panel">
              <div className="flex justify-between items-start mb-4 pb-4" style={{ borderBottom: '1px solid var(--panel-border)' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Proposal #{proposal.proposalId}</h3>
                  <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '8px' }}>
                    {proposal.description}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Proposer: <span style={{ fontFamily: 'monospace', color: 'var(--accent-secondary)' }}>{proposal.proposerAddress}</span>
                  </p>
                </div>
                {proposal.status === 'EXECUTED' ? (
                  <div className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-primary)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>Executed</div>
                ) : (
                  <div className="badge badge-success">Active</div>
                )}
              </div>

              <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
                Total Turnout: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{totalVotes} Votes</span>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                {OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const count = proposal.results ? (proposal.results[opt.id] || 0) : 0;
                  const percentage = calculatePercentage(count, totalVotes);

                  return (
                    <div key={opt.id}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <Icon size={16} style={{ color: opt.color }} />
                          <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{opt.label}</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '1rem', marginRight: '8px' }}>{percentage}%</span>
                          <span className="text-muted" style={{ fontSize: '0.85rem' }}>({count} votes)</span>
                        </div>
                      </div>
                      <div className="progress-bg" style={{ height: '6px' }}>
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${percentage}%`,
                            background: opt.color === 'var(--success)' ? 'var(--success)' : opt.color === 'var(--danger)' ? 'var(--danger)' : 'var(--text-muted)'
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--panel-border)' }}>
                <button 
                  onClick={() => handleSubmitOnChain(proposal)}
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '10px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={isSubmitting || totalVotes === 0 || proposal.status === 'EXECUTED'}
                >
                  <RefreshCw size={16} className={isSubmitting ? 'spin' : ''} />
                  {proposal.status === 'EXECUTED' ? 'Already Executed' : isSubmitting ? 'Processing...' : 'Finalize & Submit On-Chain'}
                </button>

                {submitStatus && (
                  <div 
                    className="mt-3" 
                    style={{ 
                      background: submitStatus.type === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', 
                      borderColor: submitStatus.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ 
                        color: submitStatus.type === 'success' ? 'var(--success)' : 'var(--danger)', 
                        fontWeight: 600,
                        fontSize: '0.9rem'
                      }}>
                        {submitStatus.type === 'success' ? 'Submission Successful' : 'Submission Error'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', marginTop: '4px', color: 'var(--text-muted)' }}>{submitStatus.message}</p>
                    
                    {submitStatus.txHash && (
                      <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        {submitStatus.explorerUrl ? (
                          <a 
                            href={submitStatus.explorerUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-accent flex items-center gap-1"
                            style={{ fontSize: '0.8rem', textDecoration: 'none' }}
                          >
                            View on Explorer <ExternalLink size={12} />
                          </a>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Transaction executed locally — view logs in Hardhat console.
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', opacity: 0.8, color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 4px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                              Tx: {submitStatus.txHash}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Results;
