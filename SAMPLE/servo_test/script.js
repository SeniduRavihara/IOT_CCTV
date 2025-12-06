const panSlider = document.getElementById('pan-slider');
const tiltSlider = document.getElementById('tilt-slider');
const panValue = document.getElementById('pan-value');
const tiltValue = document.getElementById('tilt-value');
const espIpInput = document.getElementById('esp-ip');
const statusSpan = document.getElementById('status');
const connectBtn = document.getElementById('connect-btn');

let debounceTimer;
let isConnected = false;

function updateStatus(msg, color) {
    statusSpan.textContent = msg;
    statusSpan.style.color = color;
}

async function checkConnection() {
    const ip = espIpInput.value;
    if (!ip) return;

    updateStatus('Connecting...', '#fbbf24'); // Yellow
    connectBtn.disabled = true;
    connectBtn.textContent = '...';

    try {
        // Fetch root / to check connection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`http://${ip}/`, { 
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
            updateStatus('Connected', '#34d399'); // Green
            isConnected = true;
            connectBtn.textContent = 'Connected';
            connectBtn.style.backgroundColor = '#059669';
            
            // Start Stream
            const streamImg = document.getElementById('stream-img');
            streamImg.src = `http://${ip}/stream`;
        } else {
            throw new Error('Response not OK');
        }
    } catch (error) {
        console.error(error);
        updateStatus('Disconnected', '#f87171'); // Red
        isConnected = false;
        connectBtn.textContent = 'Connect';
        connectBtn.disabled = false;
        connectBtn.style.backgroundColor = '#3b82f6';
    }
}

async function sendCommand(param, value) {
    if (!isConnected) return; // Don't send if not connected

    const ip = espIpInput.value;
    const url = `http://${ip}/control?${param}=${value}`;
    
    try {
        // Fire and forget (mostly) to be snappy, but log errors
        fetch(url, { method: 'GET' }).catch(e => {
            console.error("Send failed:", e);
            updateStatus('Error Sending', '#f87171');
        });
    } catch (error) {
        console.error(error);
    }
}

function handleInput(slider, valueDisplay, param) {
    const val = slider.value;
    valueDisplay.textContent = `${val}°`;
    
    // Debounce to prevent flooding ESP32
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        sendCommand(param, val);
    }, 20); // Fast debounce
}

connectBtn.addEventListener('click', checkConnection);

panSlider.addEventListener('input', () => handleInput(panSlider, panValue, 'pan'));
tiltSlider.addEventListener('input', () => handleInput(tiltSlider, tiltValue, 'tilt'));

// Auto-connect if IP is there
if (espIpInput.value) {
    // checkConnection(); // Optional: Auto connect on load
}
