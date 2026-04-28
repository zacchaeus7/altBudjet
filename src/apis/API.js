import LocalStorage from "../storage/LocalStorage";
import { triggerUnauthenticated } from "../utils/authSession";
import notificationService from "../utils/NotificationService";

// Configuration centralisee
const CONFIG = {
  API_TIMEOUT: 30000,
  FLEXPAY_CONFIG: {
    url: process.env.REACT_APP_FLEXPAY_URL || 'https://backend.flexpay.cd/api/rest/v1/paymentService',
    merchant: process.env.REACT_APP_FLEXPAY_MERCHANT || 'SCOLARIX',
  }
};

class APIError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }
}

class API {
  constructor(baseUrl = null) {
    this.baseUrl = baseUrl || (process.env.REACT_APP_API_URL || 'http://192.168.1.119:8000');
    this.apiUrl = `${this.baseUrl}/api`;
    this.localStorage = new LocalStorage();
    this.hasTriggeredUnauthenticated = false;
  }

  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      data = null,
      isFormData = false,
      timeout = CONFIG.API_TIMEOUT
    } = options;

    const url = `${this.apiUrl}/${endpoint}`;
    const headers = await this.getAuthHeaders();

    let body = null;
    if (data) {
      body = isFormData ? data : JSON.stringify(data);
    }

    if (!isFormData && data) {
      headers['Content-Type'] = 'application/json';
    }
    headers['Accept'] = 'application/json';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = String(errorData?.message || errorData?.error || '');

        if (response.status === 401 || errorMessage.toLowerCase().includes('unauthenticated')) {
          await this.handleUnauthenticated();
        }

        throw new APIError(
          errorData.message || `Erreur HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        this.logError('API Error', error);
        throw error;
      }

      if (error.name === 'AbortError') {
        const timeoutError = new APIError("Delai d'expiration de la requete", 408);
        this.logError('Timeout Error', timeoutError);
        throw timeoutError;
      }

      const wrappedError = new APIError('Erreur de requete', 0, error);
      this.logError('Request Error', wrappedError);
      throw wrappedError;
    }
  }

  async send(data, route = '', method = 'POST') {
    try {
      const response = await this.request(route, { method, data });
      
      // Après une création de transaction, vérifier si elle vient d'un autre utilisateur
      if (method === 'POST' && route === 'transactions') {
        await this.handleTransactionNotification(response, data);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Gérer la notification après création d'une transaction
   */
  async handleTransactionNotification(response, requestData) {
    try {
      // Obtenir l'ID de l'utilisateur actuel
      const currentUserId = await this.localStorage.getCurrentUserId();
      
      // La réponse contient l'utilisateur qui a créé la transaction
      const createdByUserId = response?.data?.user_id || response?.user_id;
      
      // Si la transaction a été créée par un autre utilisateur, envoyer une notification
      if (createdByUserId && String(createdByUserId) !== String(currentUserId)) {
        const createdByName = response?.data?.user_name || response?.user_name || 'Un utilisateur';
        const transactionData = {
          id: response?.data?.id || response?.id,
          type: requestData?.type,
          amount: requestData?.amount,
          description: requestData?.description,
        };
        
        await notificationService.notifyNewTransaction(transactionData, createdByName);
      }
    } catch (error) {
      // Ne pas bloquer la transaction si la notification échoue
      console.error('Erreur notification transaction:', error);
    }
  }

  /**
   * Stocker l'ID de l'utilisateur connecté
   */
  async setCurrentUserId(userId) {
    await this.localStorage.storeCurrentUserId(userId);
  }

  /**
   * Obtenir l'ID de l'utilisateur connecté
   */
  async getCurrentUserId() {
    return this.localStorage.getCurrentUserId();
  }

  async getData(route = '') {
    try {
      return await this.request(route, { method: 'GET' });
    } catch (error) {
      throw error;
    }
  }

  async getNotifications() {
    return this.getData('notifications');
  }

  async markNotificationAsRead(notificationId) {
    return this.send({}, `notifications/${notificationId}/mark-as-read`);
  }

  async markAllNotificationsAsRead(notificationIds = []) {
    return this.send({ ids: notificationIds }, 'notifications/mark-all-as-read');
  }

  async payByFlex(phone, amount, currency) {
    try {
      const flexpayToken = await this.getFlexPayToken();

      if (!flexpayToken) {
        throw new APIError('Token FlexPay indisponible', 401);
      }

      const response = await fetch(CONFIG.FLEXPAY_CONFIG.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${flexpayToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchant: CONFIG.FLEXPAY_CONFIG.merchant,
          type: 1,
          phone,
          reference: this.generateReference(),
          amount,
          currency,
          callbackUrl: `${this.baseUrl}/api/payments/confirm`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError('Erreur FlexPay', response.status, errorData);
      }

      return await response.json();
    } catch (error) {
      this.logError('FlexPay Error', error);
      throw error;
    }
  }

  createFormData(data) {
    const formData = new FormData();

    if (data?.file?.name && data?.file?.data) {
      formData.append(data.file.name, data.file.data);
    }

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'file' && value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    return formData;
  }

  async getAuthHeaders() {
    const user = await this.getUser();

    if (user?.token_type && user?.access_token) {
      return {
        'Authorization': `${user.token_type} ${user.access_token}`
      };
    }

    return {};
  }

  async getUser() {
    try {
      const user = await this.localStorage.getData('topLumUser');

      if (!user) {
        return { access_token: null, token_type: null };
      }

      return {
        access_token: user?.access_token || null,
        token_type: user?.token_type || null
      };
    } catch (error) {
      this.logError('getUser Error', error);
      return { access_token: null, token_type: null };
    }
  }

  async handleUnauthenticated() {
    if (this.hasTriggeredUnauthenticated) {
      return;
    }

    this.hasTriggeredUnauthenticated = true;

    try {
      await triggerUnauthenticated();
    } finally {
      this.hasTriggeredUnauthenticated = false;
    }
  }

  async getFlexPayToken() {
    try {
      const response = await this.request('payments/flexpay-token');
      return response?.token || null;
    } catch (error) {
      this.logError('getFlexPayToken Error', error);
      return null;
    }
  }

  generateReference() {
    return `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getServerUrl() {
    return this.baseUrl;
  }

  logError(context, error) {
    console.error(`[${context}]`, {
      message: error.message,
      status: error.status,
      details: error.details,
      timestamp: new Date().toISOString()
    });
  }
}

export default API;
