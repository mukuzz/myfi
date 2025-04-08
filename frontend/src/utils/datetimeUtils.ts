function formatDistanceToNow(date: Date, options: { addSuffix: boolean; }): React.ReactNode {
    const now = new Date();
    const diffInMilliseconds = now.getTime() - date.getTime();
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