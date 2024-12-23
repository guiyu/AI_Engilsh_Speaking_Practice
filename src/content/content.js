// Content script for handling page interactions if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_RECORDING') {
        // Handle any page-specific setup for recording
        console.log('Recording started in content script');
    }
    return true;
});