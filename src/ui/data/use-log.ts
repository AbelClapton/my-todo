import { useContext } from 'react';

import { LogContext, type LogContextValue } from './log-context';

export function useLog(): LogContextValue {
  const value = useContext(LogContext);
  if (value === undefined) {
    throw new Error('useLog() must be called inside <LogProvider>.');
  }
  return value;
}
