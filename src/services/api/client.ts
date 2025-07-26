const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://us-central1-my-ai-landlord.cloudfunctions.net/api';

class ApiClient {
  private async getAuthToken(): Promise<string | null> {
    try {
      // TODO: Integrate Clerk session token retrieval
      // For now, we'll make API calls without authentication
      // This will need to be updated to use Clerk's getToken method
      return null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        error: error.error || error
      });
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // User endpoints
  async getUserProfile() {
    return this.request<any>('/users/profile');
  }

  async updateUserProfile(updates: any) {
    return this.request('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async setUserRole(role: 'tenant' | 'landlord') {
    return this.request('/users/set-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  async linkToLandlord(landlordCode: string) {
    return this.request('/users/link-landlord', {
      method: 'POST',
      body: JSON.stringify({ landlordCode }),
    });
  }

  // Case endpoints
  async getCases() {
    // Use test endpoint for development
    return this.request<{ cases: any[] }>('/cases/test');
  }

  async getCase(caseId: string) {
    return this.request<any>(`/cases/${caseId}`);
  }

  async createCase(caseData: any) {
    // Use test endpoint for development
    return this.request<{ id: string; message: string }>('/cases/test', {
      method: 'POST',
      body: JSON.stringify(caseData),
    });
  }

  async updateCase(caseId: string, updates: any) {
    return this.request(`/cases/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async assignVendor(caseId: string, vendorEmail: string, vendorNotes?: string) {
    return this.request(`/cases/${caseId}/assign-vendor`, {
      method: 'POST',
      body: JSON.stringify({ vendorEmail, vendorNotes }),
    });
  }

  // AI endpoints
  async analyzeCase(description: string, images?: string[]) {
    return this.request<{ analysis: any }>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ description, images }),
    });
  }

  // Storage endpoints
  async getUploadUrl(fileName: string, fileType: string, category: string) {
    return this.request<{
      uploadUrl: string;
      fields: any;
      filePath: string;
    }>('/storage/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType, category }),
    });
  }

  async getDownloadUrl(filePath: string) {
    return this.request<{ url: string }>(
      `/storage/download-url?filePath=${encodeURIComponent(filePath)}`
    );
  }
}

export const apiClient = new ApiClient();