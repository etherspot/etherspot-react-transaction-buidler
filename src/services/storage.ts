const storageVersion = 1;

export const setItem = (key: string, value: string)=> localStorage.setItem(`@etherspotTransactionBuilder-storage-v${storageVersion}:${key}`, value);

export const getItem = (key: string): string | null => localStorage.getItem(`@etherspotTransactionBuilder-storage-v${storageVersion}:${key}`);
