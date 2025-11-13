import { useState, useEffect } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { authenticateWithPopup } from '@/services/google/auth';
import { Button } from '@/components/ui/button';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';

export function GoogleSyncButton() {
  const { isConnected, checkConnection, disconnect, setConnected } = useSyncStore();
  const [isChecking, setIsChecking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check connection status on mount
    const check = async () => {
      setIsChecking(true);
      await checkConnection();
      setIsChecking(false);
    };
    check();
  }, [checkConnection]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Open popup, user authenticates, tokens returned
      await authenticateWithPopup();
      setConnected(true);
      // No page refresh needed! ✅
    } catch (error) {
      console.error('Authentication failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to connect Google account');
    } finally {
      setIsConnecting(false);
    }
  };


  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your Google account?')) {
      await disconnect();
    }
  };

  if (isChecking) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Checking...
      </Button>
    );
  }

  if (isConnecting) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    );
  }

  if (isConnected) {
    return (
      <Button variant="outline" onClick={handleDisconnect}>
        <CloudOff className="mr-2 h-4 w-4" />
        Disconnect Google
      </Button>
    );
  }

  return (
    <Button onClick={handleConnect}>
      <Cloud className="mr-2 h-4 w-4" />
      Connect Google Account
    </Button>
  );
}

