/**
 * Lex Corporativo Desktop - Security Sanitizer
 * Implements strict data scrubbers for logs, cloud persistence, local caches, and crash reports.
 */

export function sanitizeForCloud(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  
  // Clean deep clones to prevent mutating original object
  const copy = JSON.parse(JSON.stringify(data));
  
  const recursiveSanitize = (obj: any) => {
    for (const key in obj) {
      if (
        ['base64', 'fileBase64', 'data'].includes(key) && 
        typeof obj[key] === 'string' && 
        obj[key].length > 200
      ) {
        obj[key] = '[REDACTED_BINARY_CLOUD]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        recursiveSanitize(obj[key]);
      }
    }
  };
  
  recursiveSanitize(copy);
  return copy;
}

export function sanitizeForLogs(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  
  const copy = JSON.parse(JSON.stringify(data));
  
  const recursiveSanitize = (obj: any) => {
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      if (
        ['base64', 'filebase64', 'data', 'apikey', 'value', 'token', 'secret', 'password', 'servicekey'].some(k => lowerKey.includes(k)) &&
        typeof obj[key] === 'string' &&
        obj[key].length > 30
      ) {
        obj[key] = '[REDACTED_SENSITIVE_LOGS]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        recursiveSanitize(obj[key]);
      }
    }
  };
  
  recursiveSanitize(copy);
  return copy;
}

export function sanitizeForCrashReport(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  
  const copy = JSON.parse(JSON.stringify(data));
  
  const recursiveSanitize = (obj: any) => {
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      // Remove all prompts, history, binary content, and keys
      if (
        ['base64', 'filebase64', 'data', 'prompt', 'requirements', 'newmessage', 'text', 'content', 'history', 'apikey', 'token', 'secret'].some(k => lowerKey.includes(k))
      ) {
        obj[key] = '[REDACTED_CRASH_REPORT]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        recursiveSanitize(obj[key]);
      }
    }
  };
  
  recursiveSanitize(copy);
  return copy;
}

export function sanitizeForLocalCache(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  
  const copy = JSON.parse(JSON.stringify(data));
  
  const recursiveSanitize = (obj: any) => {
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      // Keep prompts and content in cache, but absolutely remove keys, raw credentials, or tokens
      if (
        ['apikey', 'token', 'secret', 'password', 'servicekey'].some(k => lowerKey.includes(k)) &&
        typeof obj[key] === 'string'
      ) {
        obj[key] = '[REDACTED_LOCAL_CACHE]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        recursiveSanitize(obj[key]);
      }
    }
  };
  
  recursiveSanitize(copy);
  return copy;
}
