import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for cmdk (used by shadcn/ui Command)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill Element.scrollIntoView for cmdk
Element.prototype.scrollIntoView = function () {};
