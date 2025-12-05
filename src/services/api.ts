// frontend/src/services/api.ts
import axios from 'axios';

// Use Vite env var (set in Netlify). Fallback to localhost for dev.
const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

const normalizeBase = (b: string) => (b ? (b.endsWith('/') ? b.slice(0, -1) : b) : '');
const BASE = normalizeBase(RAW_BASE) || 'http://localhost:5000';

if (!RAW_BASE) {
  console.warn('VITE_API_BASE_URL / VITE_API_URL not set; falling back to http://localhost:5000');
}

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Helper ensures `/api` prefix
const apiPath = (path: string) => {
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  return `/api${cleaned}`; // -> /api/chat etc.
};

export interface ChatResponse {
  response: string;
  session_id: string;
  is_recipe: boolean;
  recipe_data?: any;
}

export const chatAPI = {
  async sendMessage(message: string, sessionId?: string): Promise<ChatResponse> {
    const url = apiPath('/chat'); // becomes /api/chat
    try {
      const res = await api.post(url, { message, session_id: sessionId });
      return res.data as ChatResponse;
    } catch (err: any) {
      if (err.response) {
        const serverMsg =
          err.response.data?.error || JSON.stringify(err.response.data) || err.message;
        throw new Error(`Server ${err.response.status}: ${serverMsg}`);
      } else if (err.request) {
        throw new Error('No response from server (possible CORS or network issue).');
      } else {
        throw new Error(err.message || 'Failed to send message.');
      }
    }
  },

  async saveRecipe(sessionId: string, recipeData: any) {
    const url = apiPath('/save_recipe');
    const res = await api.post(url, { session_id: sessionId, recipe_data: recipeData });
    return res.data;
  },

  async getMyRecipes(sessionId: string) {
    const url = apiPath('/my_recipes');
    const res = await api.get(url, { params: { session_id: sessionId } });
    return res.data;
  },

  async sendContactMessage(formData: { name: string; email: string; message: string }) {
    const url = apiPath('/contact');
    const res = await api.post(url, formData);
    return res.data;
  },

  async healthCheck() {
    const url = apiPath('/health');
    const res = await api.get(url);
    return res.data;
  }
};
