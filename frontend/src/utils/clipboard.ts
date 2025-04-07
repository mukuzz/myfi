/**
 * Copies the given text to the clipboard.
 * Uses the modern Clipboard API if available, otherwise falls back to execCommand.
 * 
 * @param text The string to copy to the clipboard.
 * @returns A promise that resolves if the copy was successful, and rejects otherwise.
 */
export const copyToClipboard = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(resolve)
        .catch(err => {
          console.error('Failed to copy using Clipboard API: ', err);
          reject(new Error('Failed to copy using Clipboard API'));
        });
    } else {
      // Fallback for older browsers/environments
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        // Make the textarea invisible
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          resolve();
        } else {
          throw new Error('execCommand returned false');
        }
      } catch (err) {
        console.error('Fallback copy failed: ', err);
        reject(new Error('Fallback copy method failed'));
      }
    }
  });
}; 