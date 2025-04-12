import { renderHook, act, waitFor } from '@testing-library/react';
import { useIsMobile } from './useIsMobile'; // Adjust path if needed

// Helper function to set window.innerWidth and trigger resize
const setWindowWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
    });
    window.dispatchEvent(new Event('resize'));
};

describe('useIsMobile Hook', () => {
    const originalInnerWidth = window.innerWidth; // Store original width

    afterEach(() => {
        // Restore original window width after each test
        setWindowWidth(originalInnerWidth);
    });

    test('should return true if window width is less than breakpoint (768px)', () => {
        setWindowWidth(500);
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(true);
    });

    test('should return false if window width is equal to breakpoint (768px)', () => {
        setWindowWidth(768);
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);
    });

    test('should return false if window width is greater than breakpoint (768px)', () => {
        setWindowWidth(1024);
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);
    });

    test('should update state when window is resized below breakpoint', async () => {
        // Start with desktop width
        setWindowWidth(1024);
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);

        // Simulate resize to mobile width asynchronously within act
        await act(async () => {
            setWindowWidth(600);
        });

        // Wrap assertion in waitFor
        await waitFor(() => {
            expect(result.current).toBe(true);
        });
    });

    test('should update state when window is resized above breakpoint', async () => {
        // Start with mobile width
        setWindowWidth(600);
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(true);

        // Simulate resize to desktop width asynchronously within act
        await act(async () => {
            setWindowWidth(900);
        });

        // Wrap assertion in waitFor
        await waitFor(() => {
            expect(result.current).toBe(false);
        });
    });

    test('should remove resize listener on unmount', () => {
        const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
        const { unmount } = renderHook(() => useIsMobile());

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
        removeEventListenerSpy.mockRestore(); // Clean up spy
    });
}); 