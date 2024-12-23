export class ErrorHandler {
    static async handleApiError(error, context) {
        console.error(`${context} error:`, error);
        
        let message = 'An error occurred';
        
        if (error.response) {
            switch (error.response.status) {
                case 401:
                    message = 'Invalid API key. Please check your settings.';
                    break;
                case 429:
                    message = 'Rate limit exceeded. Please try again later.';
                    break;
                case 503:
                    message = 'Service temporarily unavailable. Please try again later.';
                    break;
                default:
                    message = `Error: ${error.response.status} - ${error.response.statusText}`;
            }
        } else if (error.request) {
            message = 'Network error. Please check your connection.';
        }
        
        // Log to error reporting service if needed
        // await this.logToService(error, context);
        
        return message;
    }

    static createCustomError(message, code = 'UNKNOWN_ERROR') {
        const error = new Error(message);
        error.code = code;
        return error;
    }

    static wrapAsyncFunction(fn, errorContext) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                const message = await this.handleApiError(error, errorContext);
                throw this.createCustomError(message, error.code);
            }
        };
    }
}