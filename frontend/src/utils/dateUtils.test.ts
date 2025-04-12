// Set timezone for consistent testing
process.env.TZ = 'UTC';

import { formatDate, formatMonthYear } from './dateUtils';

describe('dateUtils', () => {

  describe('formatDate', () => {
    // Use fake timers to control 'now'
    beforeAll(() => {
      jest.useFakeTimers();
      // Set a fixed 'now' for consistent testing (e.g., April 12, 2024)
      jest.setSystemTime(new Date('2024-04-12T10:00:00Z'));
    });

    afterAll(() => {
      // Restore real timers
      jest.useRealTimers();
    });

    test('should return "Today" for the current date', () => {
      expect(formatDate('2024-04-12T15:30:00Z')).toBe('Today');
      expect(formatDate('2024-04-12T00:00:01Z')).toBe('Today');
    });

    test('should return "Yesterday" for the previous date', () => {
      expect(formatDate('2024-04-11T18:00:00Z')).toBe('Yesterday');
      expect(formatDate('2024-04-11T23:59:59Z')).toBe('Yesterday');
    });

    test('should return "Month Day" for other dates in the same year', () => {
      expect(formatDate('2024-04-10T10:00:00Z')).toBe('Apr 10'); // Two days ago
      expect(formatDate('2024-03-15T10:00:00Z')).toBe('Mar 15'); // Different month
      expect(formatDate('2024-01-01T10:00:00Z')).toBe('Jan 1');
    });

    test('should return "Month Day" for dates in different years', () => {
       // Note: The current implementation doesn't include the year for past dates.
       // If this is desired, the test or function should be updated.
      expect(formatDate('2023-12-25T10:00:00Z')).toBe('Dec 25');
      expect(formatDate('2025-01-01T10:00:00Z')).toBe('Jan 1'); // Future date
    });

    test('should handle different timezones correctly (relative to system time)', () => {
      // These test cases assume the system time is set to UTC ('Z')
      // Example: Start of the day UTC vs. end of the day UTC should both be 'Today'
      expect(formatDate('2024-04-12T00:00:00Z')).toBe('Today');
      expect(formatDate('2024-04-12T23:59:59Z')).toBe('Today');
      // Example: Day before UTC
      expect(formatDate('2024-04-11T00:00:00Z')).toBe('Yesterday');
      expect(formatDate('2024-04-11T23:59:59Z')).toBe('Yesterday');
    });

     test('should handle invalid date string gracefully', () => {
      // Depending on implementation, it might throw or return 'Invalid Date'
      // new Date('invalid') results in 'Invalid Date'
      expect(formatDate('invalid-date-string')).toBe('Invalid Date');
    });
  });

  describe('formatMonthYear', () => {
    test('should format date string into "Month Year"', () => {
      expect(formatMonthYear('2024-01-15T10:00:00Z')).toBe('January 2024');
      expect(formatMonthYear('2024-12-31T23:59:59Z')).toBe('December 2024');
      expect(formatMonthYear('2023-07-04T00:00:00Z')).toBe('July 2023');
    });

     test('should handle invalid date string gracefully', () => {
      expect(formatMonthYear('invalid-date-string')).toBe('Invalid Date');
    });

    test('should handle different date formats parsable by new Date()', () => {
      // ISO string (already tested)
      // Other common formats
      expect(formatMonthYear('2024/03/15')).toBe('March 2024');
      expect(formatMonthYear('2022-02-01')).toBe('February 2022');
    });
  });
}); 