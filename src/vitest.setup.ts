import "@testing-library/jest-dom/vitest";

// Polyfill for Radix UI components that use pointer capture
// happy-dom doesn't implement these methods
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => {
	// no-op for happy-dom
};
Element.prototype.releasePointerCapture = () => {
	// no-op for happy-dom
};
