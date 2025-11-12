import { Window } from "happy-dom";
import "@testing-library/jest-dom";

// Setup Happy DOM for all tests
const window = new Window();
const document = window.document;

// Make window and document available globally
global.window = window as unknown as Window & typeof globalThis;
global.document = document;
