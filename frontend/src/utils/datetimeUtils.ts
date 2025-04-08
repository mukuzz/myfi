export const formatDistanceToNow = (date: number | null, options: { addSuffix: boolean; }): string => {
  if (date === null) {
    return 'No refresh history found.';
  }

  const lastRefreshTime = new Date(date);

  if (isNaN(lastRefreshTime.getTime())) {
    console.error("Invalid epoch timestamp provided:", date);
    return 'Invalid date';
  }

  const now = new Date();
  const diffInMilliseconds = now.getTime() - lastRefreshTime.getTime();

  if (diffInMilliseconds < 0) {
    console.warn("Timestamp is in the future:", lastRefreshTime);
    return 'just now';
  }

  const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  let timeString = '';
  
  if (diffInDays > 0) {
    timeString = diffInDays === 1 ? '1 day' : `${diffInDays} days`;
  } else if (diffInHours > 0) {
    timeString = diffInHours === 1 ? '1 hour' : `${diffInHours} hours`;
  } else if (diffInMinutes > 0) {
    timeString = diffInMinutes === 1 ? '1 minute' : `${diffInMinutes} minutes`;
  } else {
    timeString = 'less than a minute';
  }
  
  return options.addSuffix ? `${timeString} ago` : timeString;
}