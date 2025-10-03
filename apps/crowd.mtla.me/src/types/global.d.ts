// View Transitions API types
interface ViewTransition {
  readonly finished: Promise<void>;
  readonly ready: Promise<void>;
  readonly updateCallbackDone: Promise<void>;
  skipTransition(): void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Document {
  startViewTransition?: (updateCallback: () => void | Promise<void>) => ViewTransition;
}

declare global {
  interface Navigator {
    clipboard?: {
      writeText(text: string): Promise<void>;
      readText(): Promise<string>;
    };
  }

  interface Window {
    location: {
      href: string;
    };
    open(url: string, target?: string, features?: string): Window | null;
  }

  var window: Window | undefined;
}

export {};
