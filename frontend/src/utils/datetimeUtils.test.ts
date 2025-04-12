import { formatDistanceToNow } from './datetimeUtils';

describe('datetimeUtils', () => {
  describe('formatDistanceToNow', () => {
    const baseTime = new Date('2024-04-12T10:00:00Z').getTime(); // Reference "now"

    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(baseTime);
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    // Test cases relative to baseTime (2024-04-12 10:00:00Z)

    // --- Basic differences ---
    test('should return "less than a minute" for times within the last minute', () => {
      const justNow = baseTime - 30 * 1000; // 30 seconds ago
      expect(formatDistanceToNow(justNow, { addSuffix: false })).toBe('less than a minute');
    });

    test('should return "1 minute" for times between 1 and 2 minutes ago', () => {
      const oneMinAgo = baseTime - 90 * 1000; // 1.5 minutes ago
      expect(formatDistanceToNow(oneMinAgo, { addSuffix: false })).toBe('1 minute');
    });

    test('should return "X minutes" for times several minutes ago', () => {
      const fiveMinAgo = baseTime - 5 * 60 * 1000; // 5 minutes ago
      expect(formatDistanceToNow(fiveMinAgo, { addSuffix: false })).toBe('5 minutes');
    });

     test('should return "1 hour" for times between 1 and 2 hours ago', () => {
      const oneHourAgo = baseTime - 90 * 60 * 1000; // 1.5 hours ago
      expect(formatDistanceToNow(oneHourAgo, { addSuffix: false })).toBe('1 hour');
    });

    test('should return "X hours" for times several hours ago', () => {
      const threeHoursAgo = baseTime - 3 * 60 * 60 * 1000; // 3 hours ago
      expect(formatDistanceToNow(threeHoursAgo, { addSuffix: false })).toBe('3 hours');
    });

    test('should return "1 day" for times between 24 and 48 hours ago', () => {
      const oneDayAgo = baseTime - 36 * 60 * 60 * 1000; // 1.5 days ago
      expect(formatDistanceToNow(oneDayAgo, { addSuffix: false })).toBe('1 day');
    });

    test('should return "X days" for times several days ago', () => {
      const fiveDaysAgo = baseTime - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      expect(formatDistanceToNow(fiveDaysAgo, { addSuffix: false })).toBe('5 days');
    });

    // --- Suffix option ---
     test('should add " ago" suffix when options.addSuffix is true', () => {
      const twoHoursAgo = baseTime - 2 * 60 * 60 * 1000;
      expect(formatDistanceToNow(twoHoursAgo, { addSuffix: true })).toBe('2 hours ago');
      const tenMinAgo = baseTime - 10 * 60 * 1000;
       expect(formatDistanceToNow(tenMinAgo, { addSuffix: true })).toBe('10 minutes ago');
     });

     test('should not add " ago" suffix when options.addSuffix is false', () => {
        const threeDaysAgo = baseTime - 3 * 24 * 60 * 60 * 1000;
       expect(formatDistanceToNow(threeDaysAgo, { addSuffix: false })).toBe('3 days');
        expect(formatDistanceToNow(threeDaysAgo, { addSuffix: true })).toBe('3 days ago'); // Confirm it adds when true
     });

    // --- Edge cases ---
     test('should return specific string for null input', () => {
      expect(formatDistanceToNow(null, { addSuffix: false })).toBe('No refresh history found.');
     });

     test('should return "Invalid date" for NaN input (invalid epoch)', () => {
        // Create a date that results in NaN
        const invalidDate = new Date('invalid-string').getTime(); // Results in NaN
        expect(formatDistanceToNow(invalidDate, { addSuffix: false })).toBe('Invalid date');
     });

     test('should return "just now" for future dates', () => {
       const futureTime = baseTime + 60 * 1000; // 1 minute in the future
       expect(formatDistanceToNow(futureTime, { addSuffix: false })).toBe('just now');
        expect(formatDistanceToNow(futureTime, { addSuffix: true })).toBe('just now'); // Suffix shouldn't apply
     });

      test('should handle timestamp 0 correctly', () => {
        // This will be many days ago relative to 2024
        const daysAgo = Math.floor(baseTime / (1000 * 60 * 60 * 24));
        expect(formatDistanceToNow(0, { addSuffix: false })).toBe(`${daysAgo} days`);
      });
  });
}); 