// Basic currency formatter (e.g., INR)
export const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) {
        return '₹--.--'; // Or some placeholder
    }
    // Use Intl.NumberFormat for proper localization and formatting
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0, // Adjust as needed, image shows no decimals
        maximumFractionDigits: 2,
    }).format(amount);
};

// Basic date formatter
export const formatDate = (dateString: string | undefined | null, includeTime: boolean = false): string => {
    if (!dateString) {
        return 'Invalid Date';
    }
    try {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            month: 'short', // e.g., Apr
            day: 'numeric', // e.g., 2
        };
        if (includeTime) {
            options.hour = 'numeric';   // e.g., 7
            options.minute = '2-digit'; // e.g., 38
            options.hour12 = true;     // e.g., AM/PM
        }
        // Example: Apr 2, 7:38 AM
        return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (error) {
        console.error("Error formatting date:", dateString, error);
        return 'Invalid Date';
    }
};

// You can add more specific formatters as needed 