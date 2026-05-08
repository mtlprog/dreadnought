import { Window } from "happy-dom";
import "@testing-library/jest-dom";

const window = new Window();
const document = window.document;

global.window = window as unknown as Window & typeof globalThis;
global.document = document;

// Recharts ResponsiveContainer relies on ResizeObserver, which Happy DOM does
// not implement. A no-op polyfill lets chart components mount in tests.
class ResizeObserverPolyfill {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
global.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
