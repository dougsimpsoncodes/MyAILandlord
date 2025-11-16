declare module '@sentry/react-native' {
  export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

  export interface Event {
    [key: string]: any;
  }

  export interface Breadcrumb {
    [key: string]: any;
  }

  export interface Scope {
    setTag(key: string, value: string): void;
    setContext(key: string, context: any): void;
    setLevel(level: SeverityLevel): void;
    setUser(user: any): void;
    [key: string]: any;
  }

  export interface Transaction {
    finish(): void;
    [key: string]: any;
  }

  export class ReactNativeTracing {
    constructor(options?: any);
  }

  export class ReactNavigationInstrumentation {
    constructor();
  }

  export function init(options: any): void;
  export function captureException(error: Error, context?: any): void;
  export function captureMessage(message: string, level?: SeverityLevel): void;
  export function setUser(user: any): void;
  export function setTag(key: string, value: string): void;
  export function setContext(key: string, context: any): void;
  export function addBreadcrumb(breadcrumb: Breadcrumb): void;
  export function configureScope(callback: (scope: Scope) => void): void;
  export function withScope(callback: (scope: Scope) => void): void;
  export function startTransaction(context: any): Transaction;
}
