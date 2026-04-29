import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../apis/API';
import LocalStorage from '../storage/LocalStorage';
import { FONT_BODY, FONT_DISPLAY, FONT_HEADING } from '../theme/typography';

const escapeHtml = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    year: 'numeric',
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

const getActivityCategory = (item) => {
  return (
    item?.category?.name ||
    item?.categorie?.name ||
    item?.category_name ||
    item?.categorie_name ||
    item?.categoryLabel ||
    item?.category ||
    item?.categorie ||
    null
  );
};

const getActivityAccount = (item) => {
  return (
    item?.account?.name ||
    item?.compte?.name ||
    item?.account_name ||
    item?.compte_name ||
    item?.accountName ||
    item?.compteName ||
    item?.nom_compte ||
    item?.account_label ||
    item?.compte_label ||
    null
  );
};

const getActivityAccountId = (item) => {
  return (
    item?.account?.id ||
    item?.compte?.id ||
    item?.account_id ||
    item?.compte_id ||
    item?.accountId ||
    item?.compteId ||
    item?.nom_compte_id ||
    null
  );
};

const pickFirstDefined = (...values) => {
  return values.find((value) => value !== undefined && value !== null);
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
  }));
};

const getActivityActor = (item) => {
  return (
    item?.user?.name ||
    item?.user?.fullname ||
    item?.user?.full_name ||
    item?.user?.username ||
    item?.utilisateur?.name ||
    item?.utilisateur?.fullname ||
    item?.utilisateur?.full_name ||
    item?.utilisateur?.username ||
    item?.author?.name ||
    item?.author?.fullname ||
    item?.author?.full_name ||
    item?.author?.username ||
    item?.created_by_user?.name ||
    item?.created_by_user?.fullname ||
    item?.created_by_user?.full_name ||
    item?.created_by_user?.username ||
    item?.createdByUser?.name ||
    item?.createdByUser?.fullname ||
    item?.createdByUser?.full_name ||
    item?.createdByUser?.username ||
    item?.cashier?.name ||
    item?.cashier?.fullname ||
    item?.cashier?.full_name ||
    item?.cashier?.username ||
    item?.caissier?.name ||
    item?.caissier?.fullname ||
    item?.caissier?.full_name ||
    item?.caissier?.username ||
    item?.created_by_name ||
    item?.created_by_username ||
    item?.createdByName ||
    item?.createdByUsername ||
    item?.user_name ||
    item?.username ||
    item?.author_name ||
    item?.actor_name ||
    item?.performed_by ||
    item?.done_by ||
    null
  );
};

const getActivityActorId = (item) => {
  return (
    item?.user?.id ||
    item?.utilisateur?.id ||
    item?.author?.id ||
    item?.created_by_user?.id ||
    item?.createdByUser?.id ||
    item?.cashier?.id ||
    item?.caissier?.id ||
    item?.user_id ||
    item?.utilisateur_id ||
    item?.author_id ||
    item?.created_by ||
    item?.created_by_id ||
    item?.createdBy ||
    item?.createdById ||
    item?.cashier_id ||
    item?.caissier_id ||
    null
  );
};

const getUserDisplayName = (user) => {
  return (
    user?.name ||
    user?.fullname ||
    user?.full_name ||
    user?.username ||
    user?.email ||
    user?.user?.name ||
    user?.user?.fullname ||
    user?.user?.full_name ||
    user?.user?.username ||
    user?.user?.email ||
    ''
  );
};

const getUserId = (user) => {
  return user?.id || user?.user_id || user?.user?.id || null;
};

const getActivityStatus = (item) => {
  if (item?.status) {
    return item.status;
  }

  return String(item?.type || '').toLowerCase() === 'income' ? 'Recue' : 'Validee';
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

const normalizeActivitiesResponse = (response) => {
  const root = response || {};
  const hasTopLevelPagination =
    root?.current_page !== undefined ||
    root?.last_page !== undefined ||
    root?.per_page !== undefined ||
    root?.total !== undefined ||
    root?.from !== undefined ||
    root?.to !== undefined;
  const payload = hasTopLevelPagination ? root : (response?.data || response);
  const paginatedCollection =
    (payload?.activities && !Array.isArray(payload.activities) ? payload.activities : null) ||
    (payload?.transactions && !Array.isArray(payload.transactions) ? payload.transactions : null) ||
    (payload?.items && !Array.isArray(payload.items) ? payload.items : null) ||
    (payload?.data && Array.isArray(payload.data) ? payload : null) ||
    payload;

  const activities =
    (Array.isArray(payload?.activities) ? payload.activities : null) ||
    (Array.isArray(payload?.transactions) ? payload.transactions : null) ||
    (Array.isArray(payload?.items) ? payload.items : null) ||
    (Array.isArray(paginatedCollection?.data) ? paginatedCollection.data : null) ||
    (Array.isArray(payload) ? payload : []);

  const totalCount =
    payload?.total ||
    paginatedCollection?.total ||
    payload?.count ||
    payload?.total_count ||
    activities.length;

  const expenseCount =
    payload?.expense_count ||
    payload?.expenses_count ||
    payload?.depenses_count ||
    activities.filter((item) => String(item?.type || '').toLowerCase() === 'expense').length;

  const incomeCount =
    payload?.income_count ||
    payload?.incomes_count ||
    payload?.entrees_count ||
    activities.filter((item) => String(item?.type || '').toLowerCase() === 'income').length;

  const currentPage = Number(
    payload?.current_page ||
    paginatedCollection?.current_page ||
    payload?.page ||
    1,
  ) || 1;

  const lastPage = Number(
    payload?.last_page ||
    paginatedCollection?.last_page ||
    payload?.total_pages ||
    currentPage,
  ) || currentPage;

  const perPage = Number(
    payload?.per_page ||
    paginatedCollection?.per_page ||
    activities.length ||
    0,
  ) || activities.length || 0;

  const from = Number(
    payload?.from ||
    paginatedCollection?.from ||
    (activities.length > 0 ? 1 : 0),
  ) || 0;

  const to = Number(
    payload?.to ||
    paginatedCollection?.to ||
    activities.length,
  ) || 0;

  const nextPage =
    payload?.next_page ||
    paginatedCollection?.next_page ||
    payload?.next_page_url ||
    paginatedCollection?.next_page_url ||
    null;

  return {
    activities,
    totalCount,
    expenseCount,
    incomeCount,
    pagination: {
      currentPage,
      lastPage,
      perPage,
      from,
      to,
      nextPage,
      hasMore:
        currentPage < lastPage ||
        to < Number(totalCount || 0) ||
        Boolean(nextPage),
    },
  };
};

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

function LoadingActivityRow({ index }) {
  return (
    <View style={[styles.itemRow, index < 3 && styles.itemBorder]}>
      <View style={styles.itemContent}>
        <SkeletonBlock style={styles.skeletonItemTitle} />
        <SkeletonBlock style={styles.skeletonItemCategory} />
        <SkeletonBlock style={styles.skeletonItemDate} />
        <SkeletonBlock style={styles.skeletonItemStatus} />
      </View>
      <SkeletonBlock style={styles.skeletonItemAmount} />
    </View>
  );
}

const buildSummaryFromActivities = (items) => {
  const safeItems = Array.isArray(items) ? items : [];

  return {
    totalCount: safeItems.length,
    expenseCount: safeItems.filter((item) => String(item?.type || '').toLowerCase() === 'expense').length,
    incomeCount: safeItems.filter((item) => String(item?.type || '').toLowerCase() === 'income').length,
  };
};

export default function ActivitiesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const api = useMemo(() => new API(), []);
  const localStorage = useMemo(() => new LocalStorage(), []);
  const [activities, setActivities] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showCurrentUserOnly, setShowCurrentUserOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const selectedAccount = useMemo(() => {
    return accounts.find((item) => String(item?.id) === String(selectedAccountId)) || null;
  }, [accounts, selectedAccountId]);
  const currentUserId = useMemo(() => getUserId(currentUser), [currentUser]);
  const currentUserName = useMemo(() => getUserDisplayName(currentUser), [currentUser]);
  const visibleActivities = useMemo(() => {
    return activities.filter((item) => {
      const matchesAccount =
        !selectedAccountId ||
        String(getActivityAccountId(item) ?? '') === String(selectedAccountId);

      const matchesCurrentUser =
        !showCurrentUserOnly ||
        (currentUserId && String(getActivityActorId(item) ?? '') === String(currentUserId)) ||
        (!currentUserId &&
          currentUserName &&
          String(getActivityActor(item) || '').toLowerCase() === String(currentUserName).toLowerCase());

      return matchesAccount && matchesCurrentUser;
    });
  }, [activities, currentUserId, currentUserName, selectedAccountId, showCurrentUserOnly]);
  const visibleSummary = useMemo(() => buildSummaryFromActivities(visibleActivities), [visibleActivities]);

  const printableText = useMemo(() => {
    const lines = [
      'Rapport des activites mensuelles',
      selectedAccount ? `Compte filtre: ${selectedAccount.name}` : 'Tous les comptes',
      showCurrentUserOnly ? `Utilisateur filtre: ${currentUserName || 'Utilisateur connecte'}` : 'Tous les utilisateurs',
      `${visibleSummary.totalCount} mouvements ce mois`,
      `${visibleSummary.expenseCount} depenses, ${visibleSummary.incomeCount} entrees`,
      '',
    ];

    visibleActivities.forEach((item, index) => {
      const title = getActivityTitle(item);
      const category = getActivityCategory(item);
      const account = getActivityAccount(item);
      const actor = getActivityActor(item);
      const reference = getActivityReference(item);
      const date = formatActivityDate(item?.transaction_date || item?.created_at || item?.date);
      const status = getActivityStatus(item);
      const amount = formatActivityAmount(item);

      lines.push(`${index + 1}. ${title}`);
      if (reference) {
        lines.push(`Reference: ${reference}`);
      }
      if (account) {
        lines.push(`Compte: ${account}`);
      }
      if (category) {
        lines.push(`Categorie: ${category}`);
      }
      if (actor) {
        lines.push(`Par: ${actor}`);
      }
      lines.push(`Date: ${date}`);
      lines.push(`Statut: ${status}`);
      lines.push(`Montant: ${amount}`);
      lines.push('');
    });

    return lines.join('\n');
  }, [currentUserName, selectedAccount, showCurrentUserOnly, visibleActivities, visibleSummary]);

  const printableHtml = useMemo(() => {
    const rows = visibleActivities
      .map((item) => {
        const title = escapeHtml(getActivityTitle(item));
        const category = getActivityCategory(item);
        const account = getActivityAccount(item);
        const actor = getActivityActor(item);
        const reference = getActivityReference(item);
        const date = escapeHtml(
          formatActivityDate(item?.transaction_date || item?.created_at || item?.date),
        );
        const status = escapeHtml(getActivityStatus(item));
        const amount = escapeHtml(formatActivityAmount(item));

        return `
          <tr>
            <td>
              <strong>${title}</strong>
              ${reference ? `<div class="meta">Reference: ${escapeHtml(reference)}</div>` : ''}
              ${account ? `<div class="meta">Compte: ${escapeHtml(account)}</div>` : ''}
              ${category ? `<div class="meta">${escapeHtml(category)}</div>` : ''}
              ${actor ? `<div class="meta">Par: ${escapeHtml(actor)}</div>` : ''}
            </td>
            <td>${date}</td>
            <td>${status}</td>
            <td>${amount}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <title>Activites mensuelles</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #102A35;
              margin: 32px;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 28px;
            }
            .summary {
              margin: 0 0 24px;
              color: #47626A;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 12px;
              border-bottom: 1px solid #DDE7E4;
              text-align: left;
              vertical-align: top;
            }
            th {
              color: #47626A;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            .meta {
              margin-top: 4px;
              color: #0F766E;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <h1>Rapport des activites mensuelles</h1>
          <p class="summary">${escapeHtml(selectedAccount ? `Compte filtre: ${selectedAccount.name}` : 'Tous les comptes')}</p>
          <p class="summary">${escapeHtml(showCurrentUserOnly ? `Utilisateur filtre: ${currentUserName || 'Utilisateur connecte'}` : 'Tous les utilisateurs')}</p>
          <p class="summary">${escapeHtml(`${visibleSummary.totalCount} mouvements ce mois`)}</p>
          <p class="summary">${escapeHtml(`${visibleSummary.expenseCount} depenses, ${visibleSummary.incomeCount} entrees`)}</p>
          <table>
            <thead>
              <tr>
                <th>Operation</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;
  }, [currentUserName, selectedAccount, showCurrentUserOnly, visibleActivities, visibleSummary]);

  const showError = (message) => {
    Alert.alert('Erreur', message);
  };

  const handleOpenTransaction = (item) => {
    navigation.navigate('DetailTransaction', {
      transaction: item,
    });
  };

  const handlePrint = async () => {
    if (isLoading) {
      Alert.alert('Impression indisponible', 'Attendez la fin du chargement avant d imprimer.');
      return;
    }

    if (visibleActivities.length === 0) {
      Alert.alert('Impression indisponible', 'Aucune activite disponible a imprimer.');
      return;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank', 'width=960,height=720');

      if (!printWindow) {
        Alert.alert('Impression indisponible', 'Autorisez l ouverture de la fenetre d impression.');
        return;
      }

      printWindow.document.open();
      printWindow.document.write(printableHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      return;
    }

    try {
      await Share.share({
        title: 'Rapport des activites mensuelles',
        message: printableText,
      });
    } catch (error) {
      showError(error?.message || 'Impossible de preparer le document a imprimer.');
    }
  };

  const extractApiErrorMessage = (error) => {
    const apiMessage =
      error?.details?.message ||
      error?.details?.error ||
      error?.message;

    if (error?.status === 408) {
      return 'Le serveur met trop de temps a repondre. Reessayez.';
    }

    if (error?.status === 0) {
      return 'Impossible de joindre le serveur. Verifiez votre connexion et l URL de l API.';
    }

    return apiMessage || 'Impossible de charger les activites du mois.';
  };

  const buildActivitiesRoute = (page) => {
    const params = [];

    if (page && page > 1) {
      params.push(`page=${page}`);
    }

    if (selectedAccountId) {
      params.push(`account_id=${encodeURIComponent(selectedAccountId)}`);
    }

    if (params.length === 0) {
      return 'transactions/monthly-activities';
    }

    return `transactions/monthly-activities?${params.join('&')}`;
  };

  const mergeActivities = (previous, incoming, page) => {
    const merged = [...previous];

    incoming.forEach((item, index) => {
      const itemKey = String(item?.id ?? `${item?.type}-${page}-${index}`);
      if (!merged.some((existing, existingIndex) => String(existing?.id ?? `${existing?.type}-${existingIndex}`) === itemKey)) {
        merged.push(item);
      }
    });

    return merged;
  };

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        const storedUser = await localStorage.getData('topLumUser');

        if (!isMounted) {
          return;
        }

        setCurrentUser(storedUser?.user || storedUser || null);
      } catch (error) {
        if (isMounted) {
          setCurrentUser(null);
        }
      }
    };

    const loadAccounts = async () => {
      try {
        const response = await api.getData('accounts');

        if (!isMounted) {
          return;
        }

        setAccounts(normalizeAccounts(response));
      } catch (error) {
        if (isMounted) {
          setAccounts([]);
        }
      }
    };

    loadCurrentUser();
    loadAccounts();

    return () => {
      isMounted = false;
    };
  }, [api, localStorage]);

  useEffect(() => {
    let isMounted = true;

    const loadActivities = async () => {
      setIsLoading(true);

      try {
        let currentPage = 1;
        let mergedActivities = [];
        let shouldContinue = true;

        while (shouldContinue) {
          const response = await api.getData(buildActivitiesRoute(currentPage));
          const normalized = normalizeActivitiesResponse(response);
          const incoming = Array.isArray(normalized.activities) ? normalized.activities : [];

          mergedActivities =
            currentPage === 1
              ? incoming
              : mergeActivities(mergedActivities, incoming, currentPage);

          const resolvedNextPage =
            typeof normalized.pagination.nextPage === 'number'
              ? normalized.pagination.nextPage
              : typeof normalized.pagination.nextPage === 'string' && /^\d+$/.test(normalized.pagination.nextPage)
                ? Number(normalized.pagination.nextPage)
                : normalized.pagination.currentPage + 1;

          const hasMorePages =
            normalized.pagination.hasMore &&
            incoming.length > 0 &&
            resolvedNextPage > currentPage;

          shouldContinue = hasMorePages;
          currentPage = resolvedNextPage;
        }

        if (!isMounted) {
          return;
        }

        setActivities(mergedActivities);
      } catch (error) {
        if (isMounted) {
          showError(extractApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadActivities();

    return () => {
      isMounted = false;
    };
  }, [api, selectedAccountId]);

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerActions}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={handlePrint} style={styles.printButton}>
              <Text style={styles.printButtonText}>Imprimer</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Toutes les activites</Text>
          <Text style={styles.subtitle}>
            Suivez l historique recent des depenses et des entrees de caisse.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Operations recensees</Text>
          {isLoading ? (
            <>
              <SkeletonBlock highlight style={styles.skeletonSummaryValue} />
              <SkeletonBlock highlight style={styles.skeletonSummaryMeta} />
            </>
          ) : (
            <>
              <Text style={styles.summaryValue}>{`${visibleSummary.totalCount} mouvements ce mois`}</Text>
              <Text style={styles.summaryMeta}>
                {`${visibleSummary.expenseCount} depenses, ${visibleSummary.incomeCount} entrees`}
              </Text>
            </>
          )}
        </View>

        <View style={styles.filterCard}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterLabel}>Filtrer par utilisateur</Text>
            {showCurrentUserOnly ? (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isLoading}
                onPress={() => setShowCurrentUserOnly(false)}
              >
                <Text style={styles.filterReset}>Reinitialiser</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.userFilterRow}>
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={isLoading}
              onPress={() => setShowCurrentUserOnly(false)}
              style={[
                styles.filterChip,
                !showCurrentUserOnly && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !showCurrentUserOnly && styles.filterChipTextActive,
                ]}
              >
                Tous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={isLoading}
              onPress={() => setShowCurrentUserOnly(true)}
              style={[
                styles.filterChip,
                showCurrentUserOnly && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  showCurrentUserOnly && styles.filterChipTextActive,
                ]}
              >
                {currentUserName ? `Moi (${currentUserName})` : 'Moi'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {accounts.length > 0 ? (
          <View style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterLabel}>Filtrer par compte</Text>
              {selectedAccount ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isLoading}
                  onPress={() => setSelectedAccountId('')}
                >
                  <Text style={styles.filterReset}>Reinitialiser</Text>
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

        <ScrollView
          bounces={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listCard}>
            {isLoading ? (
              <>
                {[0, 1, 2, 3].map((index) => (
                  <LoadingActivityRow key={index} index={index} />
                ))}
              </>
            ) : visibleActivities.length === 0 ? (
              <Text style={styles.emptyText}>
                {showCurrentUserOnly
                  ? 'Aucune activite disponible pour l utilisateur connecte ce mois.'
                  : selectedAccount
                  ? 'Aucune activite disponible pour ce compte ce mois.'
                  : 'Aucune activite disponible pour ce mois.'}
              </Text>
            ) : (
              visibleActivities.map((item, index) => (
                <TouchableOpacity
                  activeOpacity={0.88}
                  key={String(item?.id ?? `${item?.type}-${index}`)}
                  onPress={() => handleOpenTransaction(item)}
                  style={[styles.itemRow, index < visibleActivities.length - 1 && styles.itemBorder]}
                >
                  <View style={styles.itemContent}>
                    {/* <Text style={styles.itemTitle}>{getActivityTitle(item)}</Text> */}
                    {getActivityReference(item) ? (
                      <Text style={styles.itemReference}>{`Reference: ${getActivityReference(item)}`}</Text>
                    ) : null}
                    {getActivityAccount(item) ? (
                      <Text style={styles.itemAccount}>{getActivityAccount(item)}</Text>
                    ) : null}
                    {getActivityActor(item) ? (
                      <Text style={styles.itemActor}>{`Par ${getActivityActor(item)}`}</Text>
                    ) : null}
                    {getActivityCategory(item) ? (
                      <Text style={styles.itemCategory}>{getActivityCategory(item)}</Text>
                    ) : null}
                    <Text style={styles.itemDate}>
                      {formatActivityDate(item?.transaction_date || item?.created_at || item?.date)}
                    </Text>
                    <Text style={styles.itemStatus}>{getActivityStatus(item)}</Text>
                  </View>
                  <Text
                    style={[
                      styles.itemAmount,
                      String(item?.type || '').toLowerCase() === 'income'
                        ? styles.itemAmountIncome
                        : styles.itemAmountExpense,
                    ]}
                      >
                    {formatActivityAmount(item)}
                  </Text>
                </TouchableOpacity>
              ))
            )}

          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A2230',
  },
  content: {
    flex: 1,
    paddingHorizontal: 2,
    paddingTop: 20,
  },
  header: {
    marginBottom: 22,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  printButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E9C46A',
  },
  printButtonText: {
    color: '#0A2230',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  title: {
    marginTop: 18,
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
  summaryCard: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: '#0F766E',
  },
  summaryLabel: {
    color: '#D9F0EC',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  summaryValue: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  summaryMeta: {
    marginTop: 8,
    color: '#D4ECE9',
    fontSize: 14,
    fontFamily: FONT_BODY,
  },
  filterCard: {
    marginTop: 18,
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
  userFilterRow: {
    paddingTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  listCard: {
    marginTop: 22,
    borderRadius: 28,
    backgroundColor: '#F6F8F7',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  listContent: {
    flexGrow: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5ECEA',
  },
  itemContent: {
    flex: 1,
    paddingRight: 12,
  },
  itemTitle: {
    color: '#15343D',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  itemDate: {
    marginTop: 6,
    color: '#688087',
    fontSize: 12,
    fontFamily: FONT_BODY,
  },
  itemReference: {
    marginTop: 6,
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  itemAccount: {
    marginTop: 6,
    color: '#47626A',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT_BODY,
  },
  itemActor: {
    marginTop: 6,
    color: '#32545D',
    fontSize: 13,
    fontFamily: FONT_BODY,
  },
  itemCategory: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#E7F3F0',
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontFamily: FONT_HEADING,
  },
  itemStatus: {
    marginTop: 8,
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  itemAmountIncome: {
    color: '#0F766E',
  },
  itemAmountExpense: {
    color: '#102A35',
  },
  emptyText: {
    paddingVertical: 24,
    color: '#5E747C',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: FONT_BODY,
  },
  skeletonBase: {
    borderRadius: 999,
  },
  skeletonMuted: {
    backgroundColor: '#D8E4E1',
  },
  skeletonHighlight: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  skeletonSummaryValue: {
    marginTop: 14,
    width: '58%',
    height: 28,
    borderRadius: 12,
  },
  skeletonSummaryMeta: {
    marginTop: 10,
    width: '48%',
    height: 12,
  },
  skeletonItemTitle: {
    width: '66%',
    height: 14,
    borderRadius: 8,
  },
  skeletonItemCategory: {
    marginTop: 10,
    width: '34%',
    height: 22,
    borderRadius: 999,
  },
  skeletonItemDate: {
    marginTop: 10,
    width: '44%',
    height: 11,
    borderRadius: 8,
  },
  skeletonItemStatus: {
    marginTop: 10,
    width: '22%',
    height: 11,
    borderRadius: 8,
  },
  skeletonItemAmount: {
    width: 72,
    height: 14,
    borderRadius: 8,
    marginLeft: 12,
    backgroundColor: '#D8E4E1',
  },
});
