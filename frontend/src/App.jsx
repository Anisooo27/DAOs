import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, UserPlus, Vote, Send, Activity } from 'lucide-react';

import WalletConnect from './components/WalletConnect';
import Delegate from './pages/Delegate';
import CreateProposal from './pages/CreateProposal';
import CastVote from './pages/CastVote';
import Results from './pages/Results';

const Navigation = ({ address, provider }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        <Shield className="text-accent" size={28} />
        DAO Governance
      </Link>
      
      <div className="nav-links">
        <Link to="/" className={`nav-link ${currentPath === '/' ? 'active' : ''}`}>
          <span className="flex items-center gap-2"><LayoutDashboard size={18} /> Dashboard</span>
        </Link>
        <Link to="/delegate" className={`nav-link ${currentPath === '/delegate' ? 'active' : ''}`}>
          <span className="flex items-center gap-2"><UserPlus size={18} /> Delegate</span>
        </Link>
        <Link to="/create-proposal" className={`nav-link ${currentPath === '/create-proposal' ? 'active' : ''}`}>
          <span className="flex items-center gap-2"><Send size={18} /> Propose</span>
        </Link>
        <Link to="/cast-vote" className={`nav-link ${currentPath.startsWith('/cast-vote') ? 'active' : ''}`}>
          <span className="flex items-center gap-2"><Vote size={18} /> Vote Off-Chain</span>
        </Link>
        <Link to="/results" className={`nav-link ${currentPath.startsWith('/results') ? 'active' : ''}`}>
          <span className="flex items-center gap-2"><Activity size={18} /> Results</span>
        </Link>
      </div>

      <WalletConnect onConnect={(addr, prov) => {}} />
    </nav>
  );
};

const Dashboard = () => (
  <div className="form-container" style={{ maxWidth: '800px', textAlign: 'center' }}>
    <div className="page-header" style={{ marginBottom: '60px' }}>
      <Shield size={64} className="text-accent mx-auto mb-4" style={{ margin: '0 auto 24px' }} />
      <h1 className="page-title" style={{ fontSize: '3.5rem', marginBottom: '24px' }}>True Off-Chain DAO</h1>
      <p className="page-subtitle" style={{ fontSize: '1.2rem', lineHeight: 1.6 }}>
        Gasless. Secure. Decentralized. Participate in protocol governance without paying exorbitant network fees by signing typed data directly from your wallet.
      </p>
    </div>

    <div className="content-grid">
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--text-main)' }}>Step 1: Delegate</h3>
        <p className="text-muted" style={{ marginBottom: '24px', fontSize: '0.95rem' }}>
          Assign your voting power to yourself or another address to participate in proposals.
        </p>
        <Link to="/delegate" className="btn" style={{ width: '100%' }}>Go to Delegate</Link>
      </div>
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--text-main)' }}>Step 2: Propose</h3>
        <p className="text-muted" style={{ marginBottom: '24px', fontSize: '0.95rem' }}>
          Draft new protocol upgrades and submit target payloads for the community to review.
        </p>
        <Link to="/create-proposal" className="btn" style={{ width: '100%' }}>Create Proposal</Link>
      </div>
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--text-main)' }}>Step 3: Vote</h3>
        <p className="text-muted" style={{ marginBottom: '24px', fontSize: '0.95rem' }}>
          Cast your vote off-chain with a simple MetaMask signature. No gas required.
        </p>
        <Link to="/cast-vote" className="btn btn-primary" style={{ width: '100%' }}>Cast Vote</Link>
      </div>
    </div>
  </div>
);

function App() {
  const [address, setAddress] = useState('');
  const [provider, setProvider] = useState(null);

  // Re-check connection at root level to share across routes if needed
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const prov = new ethers.BrowserProvider(window.ethereum);
          const accounts = await prov.listAccounts();
          if (accounts.length > 0) {
            setAddress(accounts[0].address);
            setProvider(prov);
          }
        } catch (error) {
          console.error("Failed root connection check:", error);
        }
      }
    };
    checkConnection();
  }, []);

  return (
    <Router>
      <div className="app-container">
        {/* We pass a no-op to the navbar WalletConnect for visual state, 
            while managing the actual provider at the App level to pass to pages */}
        <Navigation />
        
        <main style={{ paddingBottom: '80px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/delegate" element={<Delegate provider={provider} address={address} />} />
            <Route path="/create-proposal" element={<CreateProposal provider={provider} address={address} />} />
            <Route path="/cast-vote" element={<CastVote provider={provider} address={address} />} />
            <Route path="/results" element={<Results />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
