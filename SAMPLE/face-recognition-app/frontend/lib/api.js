const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = {
  // Upload a new person to the system
  async registerPerson(name, imageFile) {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('image', imageFile);

    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to register person');
    }

    return await response.json();
  },

  // Detect face from webcam image with timeout
  async detectFace(imageBlob, { timeoutMs = 8000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const formData = new FormData();
      formData.append('image', imageBlob);

      const response = await fetch(`${API_BASE_URL}/detect`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to detect face');
      }

      const raw = await response.json();
      // Normalize backend response to a stable shape
      return {
        match: !!raw.found,
        name: raw.name,
        confidence: typeof raw.confidence === 'number' ? Math.round(raw.confidence) : undefined,
        raw,
      };
    } finally {
      clearTimeout(timer);
    }
  },

  // Get video stream for real-time detection
  getVideoStream() {
    return `${API_BASE_URL}/video_feed`;
  },

  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  }
};

