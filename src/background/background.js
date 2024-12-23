const state = { isRecording: false };

self.onmessage = (event) => {
  switch (event.data.type) {
    case 'START_RECORDING':
      handleStartRecording();
      break;
    case 'STOP_RECORDING':
      handleStopRecording();
      break;
  }
};

async function handleStartRecording() {
  state.isRecording = true;
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (tab) {
      await chrome.tabs.sendMessage(tab.id, {type: 'RECORDING_STARTED'});
    }
  } catch (error) {
    console.error('Recording start error:', error);
  }
}

async function handleStopRecording() {
  state.isRecording = false;
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true}); 
    if (tab) {
      await chrome.tabs.sendMessage(tab.id, {type: 'RECORDING_STOPPED'});
    }
  } catch (error) {
    console.error('Recording stop error:', error);
  }
}