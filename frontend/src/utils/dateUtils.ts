// Basic date formatter (you might want a more robust library like date-fns or moment)
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  // Check if the date is today
  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  }
  // Check if the date is yesterday
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  // Format for other dates: Month Day (e.g., Apr 3)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

export const formatMonthYear = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); // e.g., April 2025
}; 