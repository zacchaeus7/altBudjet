import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configuration du comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.permissionStatus = null;
  }

  /**
   * Demander la permission pour les notifications
   */
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        this.permissionStatus = 'granted';
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      this.permissionStatus = status;
      
      return status === 'granted';
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      return false;
    }
  }

  /**
   * Obtenir le token push Expo
   */
  async getPushToken() {
    try {
      if (!this.expoPushToken) {
        // Demander les permissions si pas encore fait
        const hasPermission = await this.requestPermissions();
        
        if (!hasPermission) {
          console.warn('Permissions de notification non accordées');
          return null;
        }

        // Obtenir le token push
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.eas?.projectId;
        
        if (projectId) {
          this.expoPushToken = await Notifications.getPushTokenAsync({
            projectId,
          });
        } else {
          // Fallback pour le développement local
          this.expoPushToken = await Notifications.getPushTokenAsync();
        }
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Erreur lors de la récupération du token push:', error);
      return null;
    }
  }

  /**
   * Envoyer une notification locale
   * @param {string} title - Titre de la notification
   * @param {string} body - Corps du message
   * @param {object} data - Données supplémentaires
   */
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            ...data,
            type: 'transaction_notification',
            timestamp: new Date().toISOString(),
          },
          sound: 'default',
        },
        trigger: null, // Envoyer immédiatement
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
    }
  }

  /**
   * Envoyer une notification de nouvelle transaction
   * @param {object} transaction - La transaction créée
   * @param {string} createdBy - Nom de l'utilisateur qui a créé la transaction
   */
  async notifyNewTransaction(transaction, createdBy) {
    const title = '📝 Nouvelle Transaction';
    const typeLabel = transaction?.type === 'income' ? 'Entrée' : 'Dépense';
    const amount = transaction?.amount || '0';
    const description = transaction?.description || 'Nouvelle transaction';
    
    const body = `${createdBy} a ajouté une ${typeLabel} de ${amount} - ${description.substring(0, 50)}...`;

    await this.sendLocalNotification(title, body, {
      transactionId: transaction?.id,
      transactionType: transaction?.type,
      createdBy,
    });
  }

  /**
   * Ajouter un écouteur pour les notifications reçues
   * @param {function} callback - Fonction à exécuter lors de la réception
   */
  addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Ajouter un écouteur pour les réponses aux notifications
   * @param {function} callback - Fonction à exécuter lors d'une réponse
   */
  addNotificationResponseReceivedListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Annuler toutes les notifications en attente
   */
  async cancelAllScheduledNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Erreur lors de l\'annulation des notifications:', error);
    }
  }

  /**
   * Obtenir les notifications non lues
   */
  async getDeliveredNotifications() {
    try {
      return await Notifications.getPresentedNotificationsAsync();
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      return [];
    }
  }
}

// Instance singleton
const notificationService = new NotificationService();

export default notificationService;