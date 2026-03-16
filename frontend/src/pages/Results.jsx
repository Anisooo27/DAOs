import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, MinusCircle, Search, Activity, RefreshCw, ShieldCheck, ExternalLink } from 'lucide-react';
import config from '../config';

const Results = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProposalId = searchParams.get('proposalId') || '';
  
  const [proposalIdInput, setProposalIdInput] = useState(initialProposalId);
  const [activeProposalId, setActiveProposalId] = useState(initialProposalId);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const OPTIONS = [
    { id: '1', label: 'For', icon: CheckCircle, color: 'var(--success)' },
    { id: '0', label: 'Against', icon: XCircle, color: 'var(--danger)' },
    { id: '2', label: 'Abstain', icon: MinusCircle, color: 'var(--text-muted)' }
  ];

  const fetchResults = async (pid) => {
    if (!pid.trim()) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(config.RESULTS_ENDPOINT(pid));
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results || {});
      } else {
        setError(data.error || 'Failed to fetch results');
        setResults(null);
      }
    } catch (err) {
      console.error("Error fetching results:", err);
      setError('Could not connect to the off-chain voting server.');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeProposalId) {
      fetchResults(activeProposalId);
    }
  }, [activeProposalId]);

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveProposalId(proposalIdInput);
    setSubmitStatus(null);
    setSearchParams(proposalIdInput ? { proposalId: proposalIdInput } : {});
  };

  const handleSubmitOnChain = async () => {
    if (!activeProposalId) return;
    
    try {
      setIsSubmitting(true);
      setSubmitStatus(null);
      
      const response = await fetch(config.SUBMIT_ENDPOINT(activeProposalId), {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubmitStatus({ 
          type: 'success', 
          message: 'Results finalized on-chain!', 
          txHash: data.transactionHash 
        });
      } else {
        setSubmitStatus({ 
          type: 'error', 
          message: data.error || 'Submission failed' 
        });
      }
    } catch (err) {
      console.error("Error submitting on-chain:", err);
      setSubmitStatus({ type: 'error', message: 'Could not connect to the backend server.' });
    } finally {
      setIsSubmitting(false);
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

  const totalVotes = calculateTotal(results);

  return (
    <div className="form-container" style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <h1 className="page-title">Voting Results</h1>
        <p className="page-subtitle">Real-time off-chain aggregation of active DAO proposals.</p>
      </div>

      <div className="glass-panel mb-4">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <div className="form-group mb-0" style={{ flexGrow: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Enter Proposal ID..."
              value={proposalIdInput}
              onChange={(e) => setProposalIdInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }}>
            <Search size={18} /> Search
          </button>
        </form>
      </div>

      {isLoading && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <Activity className="text-accent" size={32} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 16px' }} />
          <p className="text-muted">Loading aggregated results...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--danger)' }}>
          <h4 style={{ color: 'var(--danger)', marginBottom: '4px' }}>Error</h4>
          <p className="text-muted">{error}</p>
        </div>
      )}

      {!isLoading && !error && results && (
        <div className="glass-panel">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontSize: '1.25rem' }}>Proposal #{activeProposalId}</h3>
            <div className="flex gap-2">
              <span className="badge badge-success">Active</span>
              <button 
                className="btn" 
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                onClick={() => fetchResults(activeProposalId)}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          <p className="text-muted mb-4 pb-4" style={{ borderBottom: '1px solid var(--panel-border)', fontSize: '0.9rem' }}>
            Total Turnout: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{totalVotes} Votes</span>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {OPTIONS.map(opt => {
              const Icon = opt.icon;
              const count = results[opt.id] || 0;
              const percentage = calculatePercentage(count, totalVotes);

              return (
                <div key={opt.id}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Icon size={18} style={{ color: opt.color }} />
                      <span style={{ fontWeight: 500 }}>{opt.label}</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '1.1rem', marginRight: '8px' }}>{percentage}%</span>
                      <span className="text-muted" style={{ fontSize: '0.9rem' }}>({count} votes)</span>
                    </div>
                  </div>
                  <div className="progress-bg">
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

          <div className="glass-panel mt-4" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '24px', borderTop: '1px solid var(--panel-border)' }}>
            <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--accent-primary)' }}>
              <ShieldCheck size={20} /> 
              <span style={{ fontWeight: 600 }}>Finalize Results</span>
            </div>
            
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Once off-chain voting is complete, any authorized user can finalize the aggregated results onto the blockchain. This will execute a <code>castVote</code> transaction using the DAO's relayer services.
            </p>

            <button 
              onClick={handleSubmitOnChain}
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={isSubmitting || totalVotes === 0}
            >
              <RefreshCw size={18} className={isSubmitting ? 'spin' : ''} />
              {isSubmitting ? 'Processing Submission...' : 'Finalize & Submit On-Chain'}
            </button>

            {submitStatus && (
              <div 
                className="glass-panel mt-4" 
                style={{ 
                  background: submitStatus.type === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', 
                  borderColor: submitStatus.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    color: submitStatus.type === 'success' ? 'var(--success)' : 'var(--danger)', 
                    fontWeight: 600,
                    fontSize: '0.95rem'
                  }}>
                    {submitStatus.type === 'success' ? 'Submission Successful' : 'Submission Error'}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>{submitStatus.message}</p>
                
                {submitStatus.txHash && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${submitStatus.txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-accent flex items-center gap-1"
                      style={{ fontSize: '0.8rem', textDecoration: 'none' }}
                    >
                      View on Explorer <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!isLoading && !error && !results && activeProposalId && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <Info className="text-muted" size={32} style={{ margin: '0 auto 16px' }} />
          <p className="text-muted">No votes found for Proposal #{activeProposalId}</p>
        </div>
      )}
    </div>
  );
};

export default Results;
