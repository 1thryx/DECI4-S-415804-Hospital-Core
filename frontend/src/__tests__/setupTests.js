import '@testing-library/jest-dom';

// jsdom ships no fetch; every test stubs it explicitly so no test can silently
// depend on a real network call.
global.fetch = jest.fn();

beforeEach(() => {
  global.fetch.mockReset();
});

// React Query logs expected error-path noise; keep the test output readable.
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) return;
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
