declare module '@sentry/react-native' {
  export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

  export interface Event {
    request?: { url?: string };
    breadcrumbs?: Breadcrumb[];
    exception?: { values?: Array<{ value?: string }> };
    fingerprint?: string[];
    [key: string]: unknown;
  }

  export interface Breadcrumb {
    data?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface Scope {
    setTag(key: string, value: string): void;
    setContext(key: string, context: Record<string, unknown>): void;
    setLevel(level: SeverityLevel): void;
    setUser(user: { id?: string; email?: string; username?: string } | null): void;
    setExtra(key: string, value: unknown): void;
    [key: string]: unknown;
  }

  export interface Transaction {
    setStatus(status: string): void;
    finish(): void;
    [key: string]: unknown;
  }

  export class ReactNativeTracing {
    constructor(options?: Record<string, unknown>);
  }

  export class ReactNavigationInstrumentation {
    constructor();
  }

  export function init(options: Record<string, unknown>): void;
  export function captureException(error: Error, context?: Record<string, unknown>): void;
  export function captureMessage(message: string, level?: SeverityLevel): void;
  export function setUser(user: { id?: string; email?: string; username?: string } | null): void;
  export function setTag(key: string, value: string): void;
  export function setContext(key: string, context: Record<string, unknown>): void;
  export function addBreadcrumb(breadcrumb: Breadcrumb): void;
  export function configureScope(callback: (scope: Scope) => void): void;
  export function withScope(callback: (scope: Scope) => void): void;
  export function startTransaction(context: Record<string, unknown>): Transaction;
}
