import { SessionStorage } from '@etherspot/prime-sdk';

import { getItem, setItem } from './storage';

class LocalSessionStorage extends SessionStorage {
  constructor() {
    super();
  }

  setSession = async (walletAddress: string, session: Object) => {
    if (walletAddress) {
      setItem(`session-${walletAddress}`, JSON.stringify(session));
    }
  };

  getSession = (walletAddress: string) => {
    let result = null;

    try {
      const raw = getItem(`session-${walletAddress}`);
      result = raw ? JSON.parse(raw) : null;
    } catch (err) {
      //
    }

    return result;
  };

  resetSession = (walletAddress: string) => {
    setItem(`session-${walletAddress}`, '');
  };
}

export const sessionStorageInstance = new LocalSessionStorage();
