import "@testing-library/jest-dom";

// Mock URL.createObjectURL for jsdom
window.URL.createObjectURL = jest.fn(() => "mock-url");

// Mock <video> element and its APIs
Object.defineProperty(HTMLVideoElement.prototype, "duration", {
  get() {
    return 120;
  }, // mock 2 minutes
});
HTMLVideoElement.prototype.play = jest.fn();
HTMLVideoElement.prototype.pause = jest.fn();
HTMLVideoElement.prototype.addEventListener = jest.fn();
HTMLVideoElement.prototype.removeEventListener = jest.fn();
HTMLVideoElement.prototype.load = jest.fn();
