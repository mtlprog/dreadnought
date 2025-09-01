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
