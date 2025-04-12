import { copyToClipboard } from './clipboard';

describe('clipboard', () => {
  describe('copyToClipboard', () => {
    // Store original navigator and document properties
    const originalClipboard = navigator.clipboard;
    const originalExecCommand = document.execCommand;

    beforeEach(() => {
      // Reset mocks/spies for each test
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
        configurable: true,
      });
       Object.defineProperty(document, 'execCommand', {
        value: originalExecCommand,
        writable: true,
        configurable: true,
      });
      jest.clearAllMocks(); // Clear any spies if used
    });

    test('should resolve successfully using Clipboard API when available', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
         configurable: true,
      });

      const textToCopy = 'Hello Clipboard API';
      await expect(copyToClipboard(textToCopy)).resolves.toBeUndefined();
      expect(mockWriteText).toHaveBeenCalledTimes(1);
      expect(mockWriteText).toHaveBeenCalledWith(textToCopy);
    });

    test('should reject if Clipboard API fails', async () => {
        const mockWriteText = jest.fn().mockRejectedValue(new Error('API Error'));
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: mockWriteText },
            writable: true,
            configurable: true,
        });
        console.error = jest.fn(); // Suppress console error in test output

        await expect(copyToClipboard('test')).rejects.toThrow('Failed to copy using Clipboard API');
        expect(console.error).toHaveBeenCalled();
        (console.error as jest.Mock).mockRestore(); // Restore console.error
    });


    test('should resolve successfully using fallback execCommand method', async () => {
       // Simulate no Clipboard API
       Object.defineProperty(navigator, 'clipboard', {
            value: undefined, // Or an object without writeText
            writable: true,
            configurable: true,
       });

       const mockExecCommand = jest.fn().mockReturnValue(true); // Simulate success
       Object.defineProperty(document, 'execCommand', {
           value: mockExecCommand,
            writable: true,
            configurable: true,
       });
        // Spy on DOM manipulations (optional, but verifies mechanism)
        const appendChildSpy = jest.spyOn(document.body, 'appendChild');
        const removeChildSpy = jest.spyOn(document.body, 'removeChild');


       await expect(copyToClipboard('Fallback Test')).resolves.toBeUndefined();
       expect(mockExecCommand).toHaveBeenCalledWith('copy');
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();

       appendChildSpy.mockRestore();
       removeChildSpy.mockRestore();
    });

     test('should reject if fallback execCommand method returns false', async () => {
        Object.defineProperty(navigator, 'clipboard', { value: undefined, writable: true, configurable: true });
        const mockExecCommand = jest.fn().mockReturnValue(false); // Simulate failure
        Object.defineProperty(document, 'execCommand', { value: mockExecCommand, writable: true, configurable: true });
        console.error = jest.fn(); // Suppress console error

        await expect(copyToClipboard('test')).rejects.toThrow('Fallback copy method failed');
         expect(mockExecCommand).toHaveBeenCalledWith('copy');
        expect(console.error).toHaveBeenCalled();
        (console.error as jest.Mock).mockRestore();
    });

    test('should reject if fallback execCommand method throws an error', async () => {
        Object.defineProperty(navigator, 'clipboard', { value: undefined, writable: true, configurable: true });
        const mockExecCommand = jest.fn().mockImplementation(() => { // Simulate throw
            throw new Error('Exec error');
        });
        Object.defineProperty(document, 'execCommand', { value: mockExecCommand, writable: true, configurable: true });
        console.error = jest.fn(); // Suppress console error

        await expect(copyToClipboard('test')).rejects.toThrow('Fallback copy method failed');
        expect(mockExecCommand).toHaveBeenCalledWith('copy');
        expect(console.error).toHaveBeenCalled();
        (console.error as jest.Mock).mockRestore();
    });

  });
}); 