import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../apis/API';
import LocalStorage from '../storage/LocalStorage';
import { FONT_BODY, FONT_DISPLAY, FONT_HEADING } from '../theme/typography';

const pickFirstDefined = (...values) => {
  return values.find((value) => value !== undefined && value !== null);
};

const toArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
};

const normalizeString = (value) => {
  return String(value || '').trim().toLowerCase();
};

const toComparableId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return String(value).trim().toLowerCase();
};

const formatCount = (value) => {
  const count = Number(value ?? 0);

  if (Number.isNaN(count)) {
    return '0';
  }

  return count.toLocaleString('fr-FR');
};

const formatNotificationDate = (value) => {
  if (!value) {
    return 'A l instant';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return 'A l instant';
  }

  if (diffMs < hour) {
    return `Il y a ${Math.max(1, Math.floor(diffMs / minute))} min`;
  }

  if (diffMs < day) {
    return `Il y a ${Math.max(1, Math.floor(diffMs / hour))} h`;
  }

  if (diffMs < day * 7) {
    return `Il y a ${Math.max(1, Math.floor(diffMs / day))} j`;
  }

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildSearchableText = (item) => {
  return [
    item?.title,
    item?.message,
    item?.body,
    item?.description,
    item?.type,
    item?.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const getNotificationRoute = (item) => {
  const routeName = pickFirstDefined(
    item?.route,
    item?.screen,
    item?.target_screen,
    item?.data?.route,
    item?.data?.screen,
    item?.payload?.route,
    item?.payload?.screen,
  );

  if (routeName) {
    return String(routeName);
  }

  const searchableText = buildSearchableText(item);

  if (searchableText.includes('approvisionnement') || searchableText.includes('entree')) {
    return 'AddEntry';
  }

  if (searchableText.includes('depense') || searchableText.includes('expense')) {
    return 'AddExpense';
  }

  if (searchableText.includes('rapport') || searchableText.includes('report')) {
    return 'Report';
  }

  return 'Activities';
};

const getNotificationTone = (item) => {
  const searchableText = buildSearchableText(item);

  if (
    searchableText.includes('urgent') ||
    searchableText.includes('alerte') ||
    searchableText.includes('low') ||
    searchableText.includes('solde bas')
  ) {
    return 'warning';
  }

  if (
    searchableText.includes('succes') ||
    searchableText.includes('valide') ||
    searchableText.includes('approved')
  ) {
    return 'success';
  }

  return 'info';
};

const getNotificationTitle = (item) => {
  return (
    item?.title ||
    item?.subject ||
    item?.label ||
    item?.name ||
    item?.data?.title ||
    'Notification'
  );
};

const getNotificationMessage = (item) => {
  return (
    item?.message ||
    item?.body ||
    item?.content ||
    item?.description ||
    item?.data?.message ||
    item?.data?.body ||
    'Une nouvelle information vous concerne.'
  );
};

const isNotificationRead = (item) => {
  const status = normalizeString(
    pickFirstDefined(item?.status, item?.state, item?.read_status, item?.data?.status),
  );

  return Boolean(
    item?.read_at ||
      item?.seen_at ||
      item?.viewed_at ||
      item?.is_read === true ||
      item?.read === true ||
      item?.seen === true ||
      status === 'read' ||
      status === 'seen' ||
      status === 'opened',
  );
};

const notificationBelongsToUser = (item, currentUser) => {
  if (!currentUser) {
    return true;
  }

  const candidateIds = [
    currentUser?.id,
    currentUser?.user_id,
    currentUser?.user?.id,
    currentUser?.employee_id,
    currentUser?.agent_id,
  ]
    .map(toComparableId)
    .filter(Boolean);

  const candidateEmails = [
    currentUser?.email,
    currentUser?.user?.email,
    currentUser?.username,
    currentUser?.user?.username,
    currentUser?.name,
    currentUser?.user?.name,
  ]
    .map((value) => normalizeString(value))
    .filter(Boolean);

  const relatedIds = [
    item?.user_id,
    item?.receiver_id,
    item?.recipient_id,
    item?.target_user_id,
    item?.notifiable_id,
    item?.author_id,
    item?.data?.user_id,
    item?.data?.receiver_id,
    item?.data?.recipient_id,
    item?.data?.target_user_id,
  ]
    .map(toComparableId)
    .filter(Boolean);

  const relatedStrings = [
    item?.email,
    item?.recipient_email,
    item?.username,
    item?.recipient_name,
    item?.notifiable_type,
    item?.data?.email,
    item?.data?.recipient_email,
    item?.data?.username,
    item?.data?.recipient_name,
  ]
    .map((value) => normalizeString(value))
    .filter(Boolean);

  if (candidateIds.length > 0 && relatedIds.some((value) => candidateIds.includes(value))) {
    return true;
  }

  if (candidateEmails.length > 0 && relatedStrings.some((value) => candidateEmails.includes(value))) {
    return true;
  }

  if (relatedIds.length > 0 || relatedStrings.length > 0) {
    return false;
  }

  return true;
};

const normalizeNotificationsResponse = (response, currentUser) => {
  const payload = response?.data || response || {};
  const items = toArray(
    payload?.notifications,
    payload?.items,
    payload?.rows,
    payload?.data,
    Array.isArray(payload) ? payload : null,
  );

  return items
    .filter(Boolean)
    .filter((item) => notificationBelongsToUser(item, currentUser))
    .map((item, index) => ({
      id: String(item?.id ?? item?.uuid ?? item?.notification_id ?? `notification-${index}`),
      title: getNotificationTitle(item),
      message: getNotificationMessage(item),
      createdAt: pickFirstDefined(
        item?.created_at,
        item?.date,
        item?.sent_at,
        item?.updated_at,
        item?.data?.created_at,
      ),
      isRead: isNotificationRead(item),
      tone: getNotificationTone(item),
      route: getNotificationRoute(item),
    }))
    .sort((first, second) => {
      const firstDate = new Date(first.createdAt || 0).getTime();
      const secondDate = new Date(second.createdAt || 0).getTime();

      return secondDate - firstDate;
    });
};

function NotificationSkeleton({ index }) {
  return (
    <View style={[styles.notificationRow, index < 2 && styles.notificationBorder]}>
      <View style={[styles.notificationMarker, styles.notificationMarkerMuted]} />
      <View style={styles.notificationContent}>
        <View style={styles.skeletonLineWide} />
        <View style={styles.skeletonLineMedium} />
        <View style={styles.skeletonLineShort} />
      </View>
    </View>
  );
}

export default function NotificationScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const api = useMemo(() => new API(), []);
  const localStorage = useMemo(() => new LocalStorage(), []);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((item) => !item.isRead).length;
  }, [notifications]);

  const showError = (message) => {
    Alert.alert('Erreur', message);
  };

  const extractApiErrorMessage = (error) => {
    const apiMessage = error?.details?.message || error?.details?.error || error?.message;

    if (error?.status === 408) {
      return 'Le serveur met trop de temps a repondre. Reessayez.';
    }

    if (error?.status === 0) {
      return 'Impossible de joindre le serveur. Verifiez votre connexion et l URL de l API.';
    }

    return apiMessage || 'Impossible de charger les notifications.';
  };

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedUser = await localStorage.getData('topLumUser');
      const resolvedUser = storedUser?.user || storedUser || null;
      const response = await api.getNotifications();
      const normalized = normalizeNotificationsResponse(response, resolvedUser);

      setNotifications(normalized);
    } catch (error) {
      showError(extractApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [api, localStorage]);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    setNotifications((previous) =>
      previous.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item)),
    );

    try {
      await api.markNotificationAsRead(notificationId);
    } catch (error) {
      // L'etat local reste coherent pendant que le backend se stabilise.
    }
  }, [api]);

  const markAllNotificationsAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((item) => !item.isRead).map((item) => item.id);

    if (unreadIds.length === 0) {
      return;
    }

    setIsMarkingAll(true);
    setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true })));

    try {
      await api.markAllNotificationsAsRead(unreadIds);
    } finally {
      setIsMarkingAll(false);
    }
  }, [api, notifications]);

  const handleNotificationPress = useCallback(async (item) => {
    if (!item?.isRead) {
      await markNotificationAsRead(item.id);
    }

    if (item?.route && navigation?.getState?.()?.routeNames?.includes(item.route)) {
      navigation.navigate(item.route);
      return;
    }

    navigation.navigate('Activities');
  }, [markNotificationAsRead, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              Retrouvez ici toutes les notifications liees a l utilisateur en cours.
            </Text>
          </View>
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>
              {isLoading ? '...' : formatCount(unreadNotificationsCount)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Notifications non lues</Text>
            <Text style={styles.summaryValue}>
              {isLoading ? 'Chargement...' : `${formatCount(unreadNotificationsCount)} à traiter`}
            </Text>
          </View>
          <View style={styles.summaryActions}>
            <TouchableOpacity activeOpacity={0.85} onPress={loadNotifications}>
              <Text style={styles.linkText}>Actualiser</Text>
            </TouchableOpacity>
            {unreadNotificationsCount > 0 ? (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isMarkingAll}
                onPress={markAllNotificationsAsRead}
              >
                <Text style={styles.linkText}>
                  {isMarkingAll ? 'Traitement...' : 'Tout lire'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.listCard}>
          {isLoading ? (
            <>
              {[0, 1, 2].map((index) => (
                <NotificationSkeleton key={index} index={index} />
              ))}
            </>
          ) : notifications.length === 0 ? (
            <Text style={styles.emptyText}>Aucune notification disponible pour cet utilisateur.</Text>
          ) : (
            notifications.map((item, index) => (
              <TouchableOpacity
                activeOpacity={0.9}
                key={item.id}
                onPress={() => handleNotificationPress(item)}
                style={[
                  styles.notificationRow,
                  index < notifications.length - 1 && styles.notificationBorder,
                  !item.isRead && styles.notificationRowUnread,
                ]}
              >
                <View
                  style={[
                    styles.notificationMarker,
                    item.tone === 'warning'
                      ? styles.notificationMarkerWarning
                      : item.tone === 'success'
                        ? styles.notificationMarkerSuccess
                        : styles.notificationMarkerInfo,
                  ]}
                />

                <View style={styles.notificationContent}>
                  <View style={styles.notificationTitleRow}>
                    <Text
                      style={[styles.notificationTitle, !item.isRead && styles.notificationTitleUnread]}
                    >
                      {item.title}
                    </Text>
                    {!item.isRead ? <View style={styles.notificationUnreadDot} /> : null}
                  </View>

                  <Text style={styles.notificationMessage}>{item.message}</Text>

                  <View style={styles.notificationFooter}>
                    <Text style={styles.notificationMeta}>{formatNotificationDate(item.createdAt)}</Text>
                    <Text style={styles.notificationLink}>Ouvrir</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A2230',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backButtonText: {
    color: '#E8F6F4',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  headerRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 14,
  },
  title: {
    color: '#F7FBFB',
    fontSize: 30,
    fontWeight: '800',
    fontFamily: FONT_DISPLAY,
  },
  subtitle: {
    marginTop: 10,
    color: '#B6C8CD',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FONT_BODY,
  },
  counterBadge: {
    minWidth: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#E9C46A',
  },
  counterBadgeText: {
    color: '#0A2230',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: FONT_HEADING,
  },
  summaryCard: {
    marginTop: 22,
    borderRadius: 28,
    padding: 20,
    backgroundColor: '#0F766E',
  },
  summaryLabel: {
    color: '#DDF4F1',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  summaryValue: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  summaryActions: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkText: {
    color: '#E9F7F3',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  listCard: {
    marginTop: 20,
    borderRadius: 26,
    backgroundColor: '#F6F8F7',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  notificationBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E4ECEA',
  },
  notificationRowUnread: {
    backgroundColor: 'rgba(15,118,110,0.04)',
  },
  notificationMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 8,
    marginRight: 12,
  },
  notificationMarkerInfo: {
    backgroundColor: '#0F766E',
  },
  notificationMarkerWarning: {
    backgroundColor: '#D97706',
  },
  notificationMarkerSuccess: {
    backgroundColor: '#2A9D8F',
  },
  notificationMarkerMuted: {
    backgroundColor: '#C9D8D4',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTitle: {
    flex: 1,
    color: '#11323A',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  notificationTitleUnread: {
    color: '#0A2230',
  },
  notificationUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    backgroundColor: '#E9C46A',
  },
  notificationMessage: {
    marginTop: 6,
    color: '#5D737A',
    fontSize: 13,
    lineHeight: 21,
    fontFamily: FONT_BODY,
  },
  notificationFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationMeta: {
    color: '#789098',
    fontSize: 12,
    fontFamily: FONT_BODY,
  },
  notificationLink: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
    textTransform: 'uppercase',
  },
  emptyText: {
    paddingVertical: 24,
    color: '#5E747C',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: FONT_BODY,
  },
  skeletonLineWide: {
    width: '72%',
    height: 14,
    borderRadius: 8,
    backgroundColor: '#D8E4E1',
  },
  skeletonLineMedium: {
    marginTop: 10,
    width: '92%',
    height: 12,
    borderRadius: 8,
    backgroundColor: '#E1EAE7',
  },
  skeletonLineShort: {
    marginTop: 10,
    width: '36%',
    height: 12,
    borderRadius: 8,
    backgroundColor: '#D8E4E1',
  },
});
