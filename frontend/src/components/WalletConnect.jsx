import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet } from 'lucide-react';

const WalletConnect = ({ onConnect }) => {
  const [address, setAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if wallet is already connected on load
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const currentAddress = accounts[0].address;
            setAddress(currentAddress);
            if (onConnect) onConnect(currentAddress, provider);
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }
    };
    checkConnection();
  }, [onConnect]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this feature.");
      return;
    }

    try {
      setIsConnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const currentAddress = await signer.getAddress();
      
      setAddress(currentAddress);
      if (onConnect) onConnect(currentAddress, provider);
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const formatAddress = (addr) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <button 
      className={`btn ${address ? 'btn-primary' : ''}`}
      onClick={connectWallet}
      disabled={isConnecting}
    >
      <Wallet size={18} />
      {isConnecting ? 'Connecting...' : address ? formatAddress(address) : 'Connect Wallet'}
    </button>
  );
};

export default WalletConnect;
