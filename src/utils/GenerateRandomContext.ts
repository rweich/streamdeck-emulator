import { customAlphabet } from 'nanoid';

export const generateRandomContext = (): string => {
  return customAlphabet('1234567890ABCDEF', 32)();
};
