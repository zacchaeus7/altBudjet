import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
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

const quickActions = [
  { label: 'Ajouter une depense', route: 'AddExpense' },
  { label: 'Enregistrer une entree', route: 'AddEntry' },
  { label: 'Consulter le rapport', route: 'Report' },
];
const LOW_BALANCE_THRESHOLD = 100;
const NOTIFICATION_DISPLAY_LIMIT = 3;

const getInitials = (value) => {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'A-P';
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
};

const formatCurrency = (value) => {
  const amount = Number(value ?? 0);

  if (Number.isNaN(amount)) {
    return '0 $';
  }

  return `${amount.toLocaleString('fr-FR')} $`;
};

const formatCount = (value) => {
  const count = Number(value ?? 0);

  if (Number.isNaN(count)) {
    return '0';
  }

  return count.toLocaleString('fr-FR');
};

const formatPercent = (value) => {
  const percent = Number(value ?? 0);

  if (Number.isNaN(percent)) {
    return '0 %';
  }

  return `${percent.toLocaleString('fr-FR', {
    maximumFractionDigits: 0,
  })} %`;
};

const formatActivityAmount = (item) => {
  const rawAmount = Number(item?.amount ?? item?.montant ?? 0);
  const type = String(item?.type || '').toLowerCase();
  const sign = type === 'income' ? '+' : '-';

  if (Number.isNaN(rawAmount)) {
    return `${sign} 0 $`;
  }

  return `${sign} ${rawAmount.toLocaleString('fr-FR')} $`;
};

const formatActivityDate = (value) => {
  if (!value) {
    return 'Date indisponible';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
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

const getActivityTitle = (item) => {
  return (
    item?.title ||
    item?.description ||
    item?.label ||
    item?.name ||
    (String(item?.type || '').toLowerCase() === 'income' ? 'Entree de caisse' : 'Depense de caisse')
  );
};

const getActivityReference = (item) => {
  return (
    item?.reference ||
    item?.ref ||
    item?.transaction_reference ||
    item?.reference_number ||
    item?.numero_reference ||
    null
  );
};

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
    pickFirstDefined(
      item?.status,
      item?.state,
      item?.read_status,
      item?.data?.status,
    ),
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
      raw: item,
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

const getAccountLabel = (item) => {
  return (
    item?.name ||
    item?.label ||
    item?.title ||
    item?.account_name ||
    item?.compte_name ||
    `Compte #${item?.id ?? ''}`.trim()
  );
};

const getAccountBalance = (item) => {
  const rawBalance = pickFirstDefined(
    item?.balance,
    item?.current_balance,
    item?.available_balance,
    item?.solde,
    item?.solde_disponible,
    item?.amount,
    0,
  );

  return Number(rawBalance) || 0;
};

const normalizeAccounts = (source) => {
  const payload = source?.data || source || {};
  const items = pickFirstDefined(
    payload?.account_balances,
    payload?.accounts,
    payload?.comptes,
    payload?.items,
    Array.isArray(payload) ? payload : [],
  );

  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    id: String(item?.id ?? getAccountLabel(item)),
    name: getAccountLabel(item),
    balance: getAccountBalance(item),
  }));
};

const normalizeDashboardResponse = (response) => {
  const payload = response?.data || response || {};
  const activities = pickFirstDefined(
    payload?.recent_activities,
    payload?.activities,
    payload?.transactions,
    payload?.latest_transactions,
    payload?.items,
    [],
  );

  const initialBudget = pickFirstDefined(
    payload?.initial_budget,
    payload?.budget_initial,
    payload?.budget,
    payload?.starting_balance,
    0,
  );

  const balance = pickFirstDefined(
    payload?.available_balance,
    payload?.current_balance,
    payload?.solde_disponible,
    payload?.balance,
    payload?.final_balance,
    0,
  );

  const expenses = pickFirstDefined(
    payload?.monthly_expenses,
    payload?.total_expenses,
    payload?.depenses_mois,
    payload?.['depenses du mois'],
    payload?.total_expense,
    0,
  );

  const incomes = pickFirstDefined(
    payload?.monthly_income,
    payload?.total_income,
    payload?.monthly_incomes,
    payload?.entrees_mois,
    payload?.income_total,
    0,
  );

  const operationsCount = pickFirstDefined(
    payload?.operations_count,
    payload?.transactions_count,
    payload?.total_operations,
    payload?.count,
    Array.isArray(activities) ? activities.length : 0,
  );

  const usageRateRaw = pickFirstDefined(
    payload?.usage_rate,
    payload?.usage_percentage,
    payload?.taux_utilisation,
    Number(initialBudget) > 0 ? (Number(expenses) / Number(initialBudget)) * 100 : 0,
  );
  const accounts = normalizeAccounts(payload);

  return {
    initialBudget: Number(initialBudget) || 0,
    balance: Number(balance) || 0,
    expenses: Number(expenses) || 0,
    incomes: Number(incomes) || 0,
    operationsCount: Number(operationsCount) || 0,
    usageRate: Number(usageRateRaw) || 0,
    activities: Array.isArray(activities) ? activities.slice(0, 3) : [],
    accounts,
  };
};

function StatCard({ item, index }) {
  return (
    <View
      style={[
        styles.statCard,
        item.tone === 'primary' ? styles.statCardPrimary : styles.statCardMuted,
        index > 0 && styles.statCardSpacing,
      ]}
    >
      <Text style={[styles.statLabel, item.tone === 'primary' && styles.statLabelPrimary]}>
        {item.label}
      </Text>
      <Text style={[styles.statValue, item.tone === 'primary' && styles.statValuePrimary]}>
        {item.value}
      </Text>
    </View>
  );
}

function SkeletonBlock({ style, highlight = false }) {
  const shimmer = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.45,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [shimmer]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        highlight ? styles.skeletonHighlight : styles.skeletonMuted,
        style,
        { opacity: shimmer },
      ]}
    />
  );
}

function LoadingStatCard({ item, index }) {
  return (
    <View
      style={[
        styles.statCard,
        item.tone === 'primary' ? styles.statCardPrimary : styles.statCardMuted,
        index > 0 && styles.statCardSpacing,
      ]}
    >
      <SkeletonBlock
        highlight={item.tone === 'primary'}
        style={styles.skeletonStatLabel}
      />
      <SkeletonBlock
        highlight={item.tone === 'primary'}
        style={styles.skeletonStatValue}
      />
    </View>
  );
}

function LoadingActivityRow({ index }) {
  return (
    <View style={[styles.activityRow, index < 2 && styles.activityBorder]}>
      <SkeletonBlock style={styles.skeletonDot} />
      <View style={styles.activityContent}>
        <SkeletonBlock style={styles.skeletonActivityTitle} />
        <SkeletonBlock style={styles.skeletonActivityMeta} />
      </View>
      <SkeletonBlock style={styles.skeletonActivityAmount} />
    </View>
  );
}

function LoadingAccountRow({ index }) {
  return (
    <View style={[styles.accountRow, index < 2 && styles.accountBorder]}>
      <View style={styles.accountContent}>
        <SkeletonBlock style={styles.skeletonAccountTitle} />
        <SkeletonBlock style={styles.skeletonAccountMeta} />
      </View>
      <SkeletonBlock style={styles.skeletonAccountAmount} />
    </View>
  );
}

export default function DashbordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const api = useMemo(() => new API(), []);
  const localStorage = useMemo(() => new LocalStorage(), []);
  const lowBalanceAlertShownRef = useRef(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(true);
  const [isMarkingAllNotifications, setIsMarkingAllNotifications] = useState(false);
  const [dashboard, setDashboard] = useState({
    initialBudget: 0,
    balance: 0,
    expenses: 0,
    incomes: 0,
    operationsCount: 0,
    usageRate: 0,
    activities: [],
    accounts: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const selectedAccount = useMemo(() => {
    return accounts.find((item) => String(item?.id) === String(selectedAccountId)) || null;
  }, [accounts, selectedAccountId]);

  const displayedNotifications = useMemo(() => {
    return notifications.slice(0, NOTIFICATION_DISPLAY_LIMIT);
  }, [notifications]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((item) => !item.isRead).length;
  }, [notifications]);

  const userDisplayName = useMemo(() => {
    return (
      currentUser?.name ||
      currentUser?.fullname ||
      currentUser?.full_name ||
      currentUser?.username ||
      currentUser?.email ||
      currentUser?.user?.name ||
      currentUser?.user?.fullname ||
      currentUser?.user?.full_name ||
      currentUser?.user?.username ||
      currentUser?.user?.email ||
      ''
    );
  }, [currentUser]);

  const userInitials = useMemo(() => getInitials(userDisplayName), [userDisplayName]);

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

    return apiMessage || 'Impossible de charger le dashboard du mois.';
  };

  const buildDashboardRoute = () => {
    if (!selectedAccountId) {
      return 'dashboard/monthly';
    }

    return `dashboard/monthly?account_id=${encodeURIComponent(selectedAccountId)}`;
  };

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dashboardResponse, accountsResponse] = await Promise.all([
        api.getData(buildDashboardRoute()),
        api.getData('accounts').catch(() => null),
      ]);
      const normalized = normalizeDashboardResponse(dashboardResponse);
      const fallbackAccounts = normalizeAccounts(accountsResponse);
      const availableAccounts = fallbackAccounts.length > 0 ? fallbackAccounts : normalized.accounts;

      setAccounts(availableAccounts);

      setDashboard({
        ...normalized,
        accounts: normalized.accounts.length > 0 ? normalized.accounts : fallbackAccounts,
      });
    } catch (error) {
      showError(extractApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [api, selectedAccountId]);

  const loadNotifications = useCallback(async () => {
    try {
      setIsNotificationsLoading(true);
      const storedUser = await localStorage.getData('topLumUser');
      const resolvedUser = storedUser?.user || storedUser || null;

      setCurrentUser(resolvedUser);

      const response = await api.getNotifications().catch(() => null);
      const normalized = normalizeNotificationsResponse(response, resolvedUser);

      setNotifications(normalized);
    } finally {
      setIsNotificationsLoading(false);
    }
  }, [api, localStorage]);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              isRead: true,
            }
          : item,
      ),
    );

    try {
      await api.markNotificationAsRead(notificationId);
    } catch (error) {
      // L'etat local reste synchronise meme si l'endpoint n'existe pas encore.
    }
  }, [api]);

  const markAllNotificationsAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((item) => !item.isRead).map((item) => item.id);

    if (unreadIds.length === 0) {
      return;
    }

    setIsMarkingAllNotifications(true);
    setNotifications((previous) => previous.map((item) => ({ ...item, isRead: true })));

    try {
      await api.markAllNotificationsAsRead(unreadIds);
    } finally {
      setIsMarkingAllNotifications(false);
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
      lowBalanceAlertShownRef.current = false;
      loadDashboard();
      loadNotifications();
    }, [loadDashboard, loadNotifications]),
  );

  const stats = useMemo(() => {
    return [
      { label: 'Solde disponible', value: formatCurrency(dashboard.balance), tone: 'primary' },
      { label: 'Depenses du mois', value: formatCurrency(dashboard.expenses), tone: 'light' },
      { label: 'Operations traitees', value: formatCount(dashboard.operationsCount), tone: 'light' },
    ];
  }, [dashboard.balance, dashboard.expenses, dashboard.operationsCount]);

  const heroStatus = dashboard.balance >= 0 ? 'Stable' : 'Alerte';
  const needsReplenishment = !isLoading && dashboard.balance < LOW_BALANCE_THRESHOLD;
  const shouldShowAccountsSection = isLoading || dashboard.accounts.length > 0;
  const shouldShowNotificationsSection = isNotificationsLoading || notifications.length > 0;

  useEffect(() => {
    if (!needsReplenishment || lowBalanceAlertShownRef.current) {
      return;
    }

    lowBalanceAlertShownRef.current = true;

    Alert.alert(
      'Reapprovisionnement requis',
      `Le solde disponible est tombé à ${formatCurrency(dashboard.balance)}. Merci de prevoir un réapprovisionnement rapidement.`,
      [
        { text: 'Plus tard', style: 'cancel' },
        {
          text: 'Réapprovisionner',
          onPress: () => navigation.navigate('AddEntry'),
        },
      ],
    );
  }, [dashboard.balance, navigation, needsReplenishment]);

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.background}>
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
      </View>

      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>Petite caisse</Text>
            <Text style={styles.title}>TABLEAU DE BORD</Text>
            <Text style={styles.subtitle}>
              Une vue rapide sur les mouvements, le solde et les priorités du mois.
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </View>
        </View>

        {accounts.length > 0 ? (
          <View style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterLabel}>Charger un compte</Text>
              {selectedAccount ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isLoading}
                  onPress={() => setSelectedAccountId('')}
                >
                  <Text style={styles.filterReset}>Tous les comptes</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            >
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={isLoading}
                onPress={() => setSelectedAccountId('')}
                style={[
                  styles.filterChip,
                  !selectedAccountId && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    !selectedAccountId && styles.filterChipTextActive,
                  ]}
                >
                  Tous
                </Text>
              </TouchableOpacity>

              {accounts.map((account) => {
                const isActive = String(account.id) === String(selectedAccountId);

                return (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    disabled={isLoading}
                    key={account.id}
                    onPress={() => setSelectedAccountId(String(account.id))}
                    style={[
                      styles.filterChip,
                      isActive && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        isActive && styles.filterChipTextActive,
                      ]}
                    >
                      {account.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>Situation actuelle</Text>
            <Text style={styles.heroBadge}>{isLoading ? 'Chargement' : heroStatus}</Text>
          </View>

          {isLoading ? (
            <>
              <SkeletonBlock highlight style={styles.skeletonHeroAmount} />
              <SkeletonBlock highlight style={styles.skeletonHeroCaptionWide} />
              <SkeletonBlock highlight style={styles.skeletonHeroCaptionShort} />
            </>
          ) : (
            <>
              <Text style={styles.heroAmount}>{formatCurrency(dashboard.balance)}</Text>
              <Text style={styles.heroCaption}>
                Solde disponible apres prise en compte des mouvements mensuels.
              </Text>
            </>
          )}

          <View style={styles.heroFooter}>
            <View>
              <Text style={styles.heroFooterLabel}>Budget initial</Text>
              {isLoading ? (
                <SkeletonBlock highlight style={styles.skeletonHeroFooterValue} />
              ) : (
                <Text style={styles.heroFooterValue}>{formatCurrency(dashboard.initialBudget)}</Text>
              )}
            </View>

            <View style={styles.heroDivider} />

            <View>
              <Text style={styles.heroFooterLabel}>Taux d utilisation</Text>
              {isLoading ? (
                <SkeletonBlock highlight style={styles.skeletonHeroFooterValueSmall} />
              ) : (
                <Text style={styles.heroFooterValue}>{formatPercent(dashboard.usageRate)}</Text>
              )}
            </View>
          </View>
        </View>

        {needsReplenishment ? (
          <View style={styles.section}>
            <View style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertEyebrow}>Notification prioritaire</Text>
                <Text style={styles.alertBadge}>Solde bas</Text>
              </View>
              <Text style={styles.alertTitle}>Reapprovisionnement recommande</Text>
              <Text style={styles.alertText}>
                {`Le solde disponible est inferieur a ${formatCurrency(LOW_BALANCE_THRESHOLD)}. Lancez un reapprovisionnement pour eviter un blocage des depenses.`}
              </Text>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => navigation.navigate('AddEntry')}
                style={styles.alertButton}
              >
                <Text style={styles.alertButtonText}>Demander un reapprovisionnement</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {shouldShowNotificationsSection ? (
          <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={styles.notificationActionsInline}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Text style={styles.linkText}>Voir tout</Text>
              </TouchableOpacity>
              {unreadNotificationsCount > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isMarkingAllNotifications}
                  onPress={markAllNotificationsAsRead}
                >
                  <Text style={styles.linkText}>
                    {isMarkingAllNotifications ? 'Traitement...' : 'Tout marquer'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity activeOpacity={0.85} onPress={loadNotifications}>
                <Text style={styles.linkText}>Actualiser</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.notificationSummaryCard}>
            <View>
              <Text style={styles.notificationSummaryLabel}>Boite de reception</Text>
              <Text style={styles.notificationSummaryValue}>
                {isNotificationsLoading
                  ? 'Chargement...'
                  : `${formatCount(unreadNotificationsCount)} non lues`}
              </Text>
            </View>
            <View style={styles.notificationCounterBadge}>
              <Text style={styles.notificationCounterBadgeText}>
                {isNotificationsLoading ? '...' : formatCount(unreadNotificationsCount)}
              </Text>
            </View>
          </View>

          <View style={styles.listCard}>
            {isNotificationsLoading ? (
              <>
                {[0, 1, 2].map((index) => (
                  <LoadingActivityRow key={`notification-loading-${index}`} index={index} />
                ))}
              </>
            ) : displayedNotifications.length === 0 ? (
              <Text style={styles.emptyText}>Aucune notification pour cet utilisateur.</Text>
            ) : (
              displayedNotifications.map((item, index) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  key={item.id}
                  onPress={() => handleNotificationPress(item)}
                  style={[
                    styles.notificationRow,
                    index < displayedNotifications.length - 1 && styles.activityBorder,
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
                        style={[
                          styles.notificationTitle,
                          !item.isRead && styles.notificationTitleUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {!item.isRead ? <View style={styles.notificationUnreadDot} /> : null}
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {item.message}
                    </Text>
                    <View style={styles.notificationFooter}>
                      <Text style={styles.notificationMeta}>
                        {formatNotificationDate(item.createdAt)}
                      </Text>
                      <Text style={styles.notificationLink}>Ouvrir</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicateurs cles</Text>
          {stats.map((item, index) =>
            isLoading ? (
              <LoadingStatCard item={item} index={index} key={item.label} />
            ) : (
              <StatCard item={item} index={index} key={item.label} />
            ),
          )}
        </View>

        {shouldShowAccountsSection ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Soldes par compte</Text>
              {!isLoading && dashboard.accounts.length > 1 ? (
                <Text style={styles.linkText}>{`${dashboard.accounts.length} comptes`}</Text>
              ) : null}
            </View>

            <View style={styles.listCard}>
              {isLoading ? (
                <>
                  {[0, 1, 2].map((index) => (
                    <LoadingAccountRow key={index} index={index} />
                  ))}
                </>
              ) : (
                dashboard.accounts.map((account, index) => (
                  <View
                    key={account.id}
                    style={[styles.accountRow, index < dashboard.accounts.length - 1 && styles.accountBorder]}
                  >
                    <View style={styles.accountContent}>
                      <Text style={styles.accountTitle}>{account.name}</Text>
                      <Text style={styles.accountMeta}>
                        {account.balance < LOW_BALANCE_THRESHOLD ? 'Surveillance recommandee' : 'Solde disponible'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.accountAmount,
                        account.balance < LOW_BALANCE_THRESHOLD
                          ? styles.accountAmountWarning
                          : styles.accountAmountNormal,
                      ]}
                    >
                      {formatCurrency(account.balance)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activites recentes</Text>
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Activities')}>
              <Text style={styles.linkText}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listCard}>
            {isLoading ? (
              <>
                {[0, 1, 2].map((index) => (
                  <LoadingActivityRow key={index} index={index} />
                ))}
              </>
            ) : dashboard.activities.length === 0 ? (
              <Text style={styles.emptyText}>Aucune activite recente disponible.</Text>
            ) : (
              dashboard.activities.map((item, index) => (
                <View
                  key={String(item?.id ?? `${item?.type}-${index}`)}
                  style={[styles.activityRow, index < dashboard.activities.length - 1 && styles.activityBorder]}
                >
                  <View
                    style={[
                      styles.activityDot,
                      String(item?.type || '').toLowerCase() === 'income'
                        ? styles.activityDotIncome
                        : styles.activityDotExpense,
                    ]}
                  />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{getActivityTitle(item)}</Text>
                    {getActivityReference(item) ? (
                      <Text style={styles.activityReference}>{`Reference: ${getActivityReference(item)}`}</Text>
                    ) : null}
                    <Text style={styles.activityMeta}>
                      {formatActivityDate(item?.transaction_date || item?.created_at || item?.date)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.activityAmount,
                      String(item?.type || '').toLowerCase() === 'income'
                        ? styles.activityAmountIncome
                        : styles.activityAmountExpense,
                    ]}
                  >
                    {formatActivityAmount(item)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                activeOpacity={0.88}
                key={action.label}
                onPress={() => navigation.navigate(action.route)}
                style={styles.actionCard}
              >
                <Text style={styles.actionIcon}>+</Text>
                <Text style={styles.actionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!isLoading ? (
          <View style={styles.section}>
            <View style={styles.summaryStrip}>
              <Text style={styles.summaryStripText}>
                {`${formatCurrency(dashboard.expenses)} de depenses et ${formatCurrency(dashboard.incomes)} d'entrées ce mois.`}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A2230',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A2230',
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(42, 157, 143, 0.25)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 140,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(233, 196, 106, 0.14)',
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 24,
  },
  filterCard: {
    marginTop: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    color: '#DCEDEA',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  filterReset: {
    color: '#E9C46A',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  filterScrollContent: {
    paddingTop: 12,
    paddingBottom: 2,
    paddingRight: 10,
  },
  filterChip: {
    marginRight: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterChipActive: {
    backgroundColor: '#E9C46A',
    borderColor: '#E9C46A',
  },
  filterChipText: {
    color: '#E6F3F1',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  filterChipTextActive: {
    color: '#0A2230',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    color: '#9BC8C3',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: FONT_HEADING,
  },
  title: {
    marginTop: 10,
    color: '#F7FBFB',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    maxWidth: '88%',
    fontFamily: FONT_DISPLAY,
  },
  subtitle: {
    marginTop: 10,
    color: '#B6C8CD',
    fontSize: 14,
    lineHeight: 22,
    maxWidth: '92%',
    fontFamily: FONT_BODY,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarText: {
    color: '#F4FBFA',
    fontSize: 15,
    fontWeight: '800',
  },
  heroCard: {
    marginTop: 26,
    padding: 22,
    borderRadius: 30,
    backgroundColor: '#0F766E',
    shadowColor: '#04151E',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    color: '#DDF4F1',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  heroBadge: {
    color: '#0F766E',
    backgroundColor: '#E9F7F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontFamily: FONT_HEADING,
  },
  heroAmount: {
    marginTop: 22,
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    fontFamily: FONT_DISPLAY,
  },
  heroCaption: {
    marginTop: 8,
    color: '#CDEAE7',
    fontSize: 14,
    lineHeight: 22,
    maxWidth: '92%',
    fontFamily: FONT_BODY,
  },
  heroFooter: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroFooterLabel: {
    color: '#D0ECE9',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT_BODY,
  },
  heroFooterValue: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  heroDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 24,
  },
  alertCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: '#F4C95D',
    shadowColor: '#4B2E00',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertEyebrow: {
    color: '#6E4300',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: FONT_HEADING,
  },
  alertBadge: {
    color: '#FFF9EC',
    backgroundColor: '#A65D00',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontFamily: FONT_HEADING,
  },
  alertTitle: {
    marginTop: 14,
    color: '#3E2500',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  alertText: {
    marginTop: 8,
    color: '#5A3600',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FONT_BODY,
  },
  alertButton: {
    marginTop: 18,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: '#0A2230',
  },
  alertButtonText: {
    color: '#F7FBFB',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#F4FBFA',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  linkText: {
    color: '#8ED2C8',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_BODY,
  },
  notificationActionsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 14,
  },
  notificationSummaryCard: {
    marginTop: 14,
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationSummaryLabel: {
    color: '#BFD4D1',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT_BODY,
  },
  notificationSummaryValue: {
    marginTop: 6,
    color: '#F4FBFA',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  notificationCounterBadge: {
    minWidth: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#E9C46A',
  },
  notificationCounterBadgeText: {
    color: '#0A2230',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: FONT_HEADING,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
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
    fontSize: 14,
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
    marginTop: 5,
    color: '#5D737A',
    fontSize: 13,
    lineHeight: 20,
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
  statCard: {
    borderRadius: 24,
    padding: 18,
  },
  statCardSpacing: {
    marginTop: 12,
  },
  statCardPrimary: {
    backgroundColor: '#F2F8F7',
  },
  statCardMuted: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    color: '#AEC2C8',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT_BODY,
  },
  statLabelPrimary: {
    color: '#47626A',
  },
  statValue: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  statValuePrimary: {
    color: '#12333B',
  },
  listCard: {
    marginTop: 14,
    borderRadius: 26,
    backgroundColor: '#F6F8F7',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E4ECEA',
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  activityDotIncome: {
    backgroundColor: '#0F766E',
  },
  activityDotExpense: {
    backgroundColor: '#D97706',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: '#11323A',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  activityMeta: {
    marginTop: 4,
    color: '#6A8188',
    fontSize: 12,
    fontFamily: FONT_BODY,
  },
  activityReference: {
    marginTop: 4,
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 12,
    fontFamily: FONT_HEADING,
  },
  activityAmountIncome: {
    color: '#0F766E',
  },
  activityAmountExpense: {
    color: '#102A35',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  accountBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E4ECEA',
  },
  accountContent: {
    flex: 1,
    paddingRight: 12,
  },
  accountTitle: {
    color: '#11323A',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  accountMeta: {
    marginTop: 4,
    color: '#6A8188',
    fontSize: 12,
    fontFamily: FONT_BODY,
  },
  accountAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 12,
    fontFamily: FONT_HEADING,
  },
  accountAmountNormal: {
    color: '#0F766E',
  },
  accountAmountWarning: {
    color: '#A65D00',
  },
  actionsGrid: {
    marginTop: 14,
  },
  actionCard: {
    marginBottom: 12,
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#E9C46A',
    color: '#0A2230',
    fontSize: 22,
    fontWeight: '800',
    marginRight: 12,
    includeFontPadding: false,
  },
  actionText: {
    flex: 1,
    color: '#F3FAF9',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  emptyText: {
    paddingVertical: 24,
    color: '#5E747C',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: FONT_BODY,
  },
  summaryStrip: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryStripText: {
    color: '#D9E8E5',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FONT_BODY,
  },
  skeletonBase: {
    borderRadius: 999,
  },
  skeletonMuted: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  skeletonHighlight: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  skeletonHeroAmount: {
    marginTop: 22,
    width: '58%',
    height: 42,
    borderRadius: 16,
  },
  skeletonHeroCaptionWide: {
    marginTop: 12,
    width: '90%',
    height: 12,
  },
  skeletonHeroCaptionShort: {
    marginTop: 8,
    width: '72%',
    height: 12,
  },
  skeletonHeroFooterValue: {
    marginTop: 8,
    width: 92,
    height: 18,
    borderRadius: 8,
  },
  skeletonHeroFooterValueSmall: {
    marginTop: 8,
    width: 68,
    height: 18,
    borderRadius: 8,
  },
  skeletonStatLabel: {
    width: 110,
    height: 12,
    borderRadius: 8,
  },
  skeletonStatValue: {
    marginTop: 10,
    width: '48%',
    height: 24,
    borderRadius: 10,
  },
  skeletonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    backgroundColor: '#D8E4E1',
  },
  skeletonActivityTitle: {
    width: '65%',
    height: 13,
    borderRadius: 8,
    backgroundColor: '#D8E4E1',
  },
  skeletonActivityMeta: {
    marginTop: 8,
    width: '42%',
    height: 11,
    borderRadius: 8,
    backgroundColor: '#E3EBE8',
  },
  skeletonActivityAmount: {
    width: 64,
    height: 14,
    borderRadius: 8,
    marginLeft: 12,
    backgroundColor: '#D8E4E1',
  },
  skeletonAccountTitle: {
    width: '52%',
    height: 13,
    borderRadius: 8,
    backgroundColor: '#D8E4E1',
  },
  skeletonAccountMeta: {
    marginTop: 8,
    width: '38%',
    height: 11,
    borderRadius: 8,
    backgroundColor: '#E3EBE8',
  },
  skeletonAccountAmount: {
    width: 78,
    height: 14,
    borderRadius: 8,
    marginLeft: 12,
    backgroundColor: '#D8E4E1',
  },
});
