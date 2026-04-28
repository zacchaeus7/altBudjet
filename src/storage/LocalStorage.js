import AsyncStorage from '@react-native-async-storage/async-storage';

class LocalStorage {

  storeData = async (dataKey, data) => {
    try {
      await AsyncStorage.setItem(dataKey, JSON.stringify(data));
      return true;
    } catch (error) {
      throw error;
    }
  }

  getData = async (dataKey) => {
    try {
      let data = await AsyncStorage.getItem(dataKey);
      data = (data !== null) ? JSON.parse(data) : null;
      
      return data;

    } catch (error) {
      throw error;
    }
  }

  deleteData = async (dataKey) => {
    try {
      await AsyncStorage.removeItem(dataKey);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Méthodes pour les notifications push
  storePushToken = async (token) => {
    return this.storeData('expo_push_token', token);
  }

  getPushToken = async () => {
    return this.getData('expo_push_token');
  }

  // Méthodes pour l'utilisateur actuel
  storeCurrentUser = async (user) => {
    return this.storeData('current_user', user);
  }

  getCurrentUser = async () => {
    return this.getData('current_user');
  }

  // Stocker l'ID de l'utilisateur actuel pour comparaison
  storeCurrentUserId = async (userId) => {
    return this.storeData('current_user_id', userId);
  }

  getCurrentUserId = async () => {
    return this.getData('current_user_id');
  }

}

export default LocalStorage;
