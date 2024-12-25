async function getUserPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 48000
            }
        });
        
        console.log("Microphone access granted");
        
        // Stop the tracks immediately
        stream.getTracks().forEach(track => track.stop());
        
        // Notify parent
        window.parent.postMessage({ type: 'MIC_PERMISSION_GRANTED' }, '*');
    } catch (error) {
        console.error("Error requesting microphone permission:", error);
        window.parent.postMessage({ 
            type: 'MIC_PERMISSION_DENIED', 
            error: error.message 
        }, '*');
    }
}

// Request permission when loaded
getUserPermission();