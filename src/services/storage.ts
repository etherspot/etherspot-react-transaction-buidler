export const setItem = (key: string, value: string)=> localStorage.setItem(`@etherspotTransactionBuilder:${key}`, value);

export const getItem = (key: string): string | null => localStorage.getItem(`@etherspotTransactionBuilder:${key}`);
