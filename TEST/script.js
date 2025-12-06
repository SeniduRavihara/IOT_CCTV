let espIp = '192.168.43.187';
let updateInterval;

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const ipInput = document.getElementById('esp-ip');
const connectBtn = document.getElementById('connect-btn');
const ledToggle = document.getElementById('led-toggle');
const tempValue = document.getElementById('temp-value');
const uptimeValue = document.getElementById('uptime-value');

// Load saved IP
if (localStorage.getItem('espIp')) {
    espIp = localStorage.getItem('espIp');
    ipInput.value = espIp;
}

connectBtn.addEventListener('click', () => {
    espIp = ipInput.value;
    localStorage.setItem('espIp', espIp);
    checkConnection();
});

ledToggle.addEventListener('change', () => {
    toggleLed(ledToggle.checked);
});

async function checkConnection() {
    try {
        statusText.textContent = "Connecting...";
        const response = await fetch(`http://${espIp}/status`, { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
            const data = await response.json();
            updateUI(data);
            setConnected(true);
            startPolling();
        } else {
            throw new Error('Failed to connect');
        }
    } catch (error) {
        console.error(error);
        setConnected(false);
    }
}

function setConnected(isConnected) {
    if (isConnected) {
        statusDot.classList.remove('disconnected');
        statusDot.classList.add('connected');
        statusText.textContent = "Connected";
    } else {
        statusDot.classList.remove('connected');
        statusDot.classList.add('disconnected');
        statusText.textContent = "Disconnected";
        stopPolling();
    }
}

function startPolling() {
    stopPolling();
    updateInterval = setInterval(async () => {
        try {
            const response = await fetch(`http://${espIp}/status`);
            const data = await response.json();
            updateUI(data);
        } catch (error) {
            setConnected(false);
        }
    }, 2000);
}

function stopPolling() {
    if (updateInterval) clearInterval(updateInterval);
}

function updateUI(data) {
    if (data.temperature !== undefined) {
        tempValue.textContent = `${data.temperature.toFixed(1)} °C`;
    }
    if (data.uptime !== undefined) {
        uptimeValue.textContent = `${data.uptime} s`;
    }
    if (data.led !== undefined) {
        // Only update toggle if it doesn't match to avoid fighting with user input
        // But here we just sync it
        // ledToggle.checked = data.led; 
    }
}

async function toggleLed(state) {
    try {
        // Send 1 for ON, 0 for OFF
        const response = await fetch(`http://${espIp}/toggle?state=${state ? 1 : 0}`);
        if (!response.ok) throw new Error('Failed to toggle LED');
    } catch (error) {
        console.error(error);
        // Revert switch if failed
        ledToggle.checked = !state;
        alert('Failed to communicate with ESP32');
    }
}
