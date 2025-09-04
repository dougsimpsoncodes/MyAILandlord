/* eslint-disable no-restricted-globals */

/**
 * A simple logger that wraps the console.
 * This is the only place where console.* is allowed.
 */

export const log = {
  info: (...args: unknown[]) => {
    // In a real app, you would send this to a logging service
    console.log(...args);
  },
  warn: (...args: unknown[]) => {
    // In a real app, you would send this to a logging service
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // In a real app, you would send this to a logging service
    console.error(...args);
  },
};