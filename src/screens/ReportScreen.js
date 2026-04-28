import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../apis/API';
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

const formatCurrency = (value) => {
  const amount = Number(value ?? 0);

  if (Number.isNaN(amount)) {
    return '0 $';
  }

  return `${amount.toLocaleString('fr-FR')} $`;
};

const formatMonthLabel = (value) => {
  if (!value) {
    return 'Mois en cours';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
};

const getCategoryLabel = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return (
      value?.name ||
      value?.label ||
      value?.title ||
      value?.category_name ||
      value?.nom ||
      value?.designation ||
      null
    );
  }

  return String(value);
};

const normalizeReportResponse = (response) => {
  const payload = response?.data || response || {};
  const transactions = toArray(
    payload?.transactions,
    payload?.activities,
    payload?.latest_transactions,
    payload?.operations,
    payload?.items,
    payload?.data,
  );
  const initialBudget = pickFirstDefined(
    payload?.initial_budget,
    payload?.budget_initial,
    payload?.budget,
    payload?.starting_balance,
    0,
  );
  const expenses = pickFirstDefined(
    payload?.monthly_expenses,
    payload?.total_expenses,
    payload?.depenses_mois,
    payload?.expenses,
    payload?.total_depenses,
    0,
  );
  const incomes = pickFirstDefined(
    payload?.monthly_income,
    payload?.total_entrees,
    payload?.entrees_mois,
    payload?.incomes,
    payload?.income_total,
    0,
  );
  const finalBalance = pickFirstDefined(
    payload?.final_balance,
    payload?.available_balance,
    payload?.current_balance,
    payload?.solde_final,
    payload?.balance,
    Number(initialBudget) - Number(expenses) + Number(incomes),
  );
  const rawOperationsCount = pickFirstDefined(
    // payload?.operations_count,
    // payload?.transactions_count,
    payload?.total_operations,
    // payload?.count,
    // transactions.length,
  );
  const operationsCount = Number(rawOperationsCount);
  const resolvedOperationsCount =
    Number.isNaN(operationsCount) || (operationsCount <= 0 && transactions.length > 0)
      ? transactions.length
      : operationsCount;
  const topExpenseCategory = pickFirstDefined(
    payload?.top_expense_category,
    payload?.largest_expense_category,
    payload?.main_expense_category,
    payload?.categorie_principale_depense,
    payload?.top_category,
    null,
  );
  const reportMonth = pickFirstDefined(
    payload?.report_month,
    payload?.month,
    payload?.period,
    payload?.generated_at,
    null,
  );
  const quickRead =
    payload?.quick_read ||
    payload?.summary ||
    payload?.insight ||
    payload?.commentary ||
    null;

  const balanceTrend = Number(finalBalance) >= 0 ? 'Stable' : 'Alerte';
  const netFlow = Number(incomes) - Number(expenses);
  const monthlyBudgetOverrun = Math.max(Number(expenses) - Number(initialBudget), 0);
  const budgetUsageRate =
    Number(initialBudget) > 0 ? (Number(expenses) / Number(initialBudget)) * 100 : 0;

  return {
    reportMonth,
    initialBudget: Number(initialBudget) || 0,
    expenses: Number(expenses) || 0,
    incomes: Number(incomes) || 0,
    finalBalance: Number(finalBalance) || 0,
    operationsCount: resolvedOperationsCount,
    topExpenseCategory: getCategoryLabel(topExpenseCategory),
    quickRead: quickRead ? String(quickRead) : null,
    balanceTrend,
    netFlow: Number(netFlow) || 0,
    monthlyBudgetOverrun,
    budgetUsageRate: Number(budgetUsageRate) || 0,
  };
};

function SkeletonBlock({ style, light = false }) {
  return <View style={[styles.skeletonBase, light ? styles.skeletonLight : styles.skeletonDark, style]} />;
}

export default function ReportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const api = useMemo(() => new API(), []);
  const [report, setReport] = useState({
    reportMonth: null,
    initialBudget: 0,
    expenses: 0,
    incomes: 0,
    finalBalance: 0,
    operationsCount: 0,
    topExpenseCategory: null,
    quickRead: null,
    balanceTrend: 'Stable',
    netFlow: 0,
    monthlyBudgetOverrun: 0,
    budgetUsageRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const showError = (message) => {
    Alert.alert('Erreur', message);
  };

  const extractApiErrorMessage = (error) => {
    const apiMessage = error?.details?.message || error?.details?.error || error?.message;

    if (error?.status === 408) {
      return 'Le serveur met trop de temps à repondre. Reessayez.';
    }

    if (error?.status === 0) {
      return 'Impossible de joindre le serveur. Verifiez votre connexion et l URL de l API.';
    }

    return apiMessage || 'Impossible de charger le rapport mensuel.';
  };

  useEffect(() => {
    let isMounted = true;

    const loadReport = async () => {
      setIsLoading(true);

      try {
        const response = await api.getData('reports/summary');
       console.log(response)
        const normalized = normalizeReportResponse(response);

        if (!isMounted) {
          return;
        }

        setReport(normalized);
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

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [api]);

  const reportCards = [
    { label: 'Budget initial', value: formatCurrency(report.initialBudget), tone: 'default' },
    { label: 'Total depenses', value: formatCurrency(report.expenses), tone: 'default' },
    { label: 'Total entrees', value: formatCurrency(report.incomes), tone: 'default' },
    {
      label: 'Depassement budgetaire',
      value: formatCurrency(report.monthlyBudgetOverrun),
      tone: report.monthlyBudgetOverrun > 0 ? 'warning' : 'success',
      helper: report.monthlyBudgetOverrun > 0 ? 'Budget depasse ce mois' : 'Aucun depassement',
    },
    { label: 'Operations', value: `${report.operationsCount.toLocaleString('fr-FR')}`, tone: 'default' },
  ];

  const quickReadItems = [
    `Solde final ${report.balanceTrend.toLowerCase()} a ${formatCurrency(report.finalBalance)}.`,
    `Flux net du mois: ${formatCurrency(report.netFlow)}.`,
    report.monthlyBudgetOverrun > 0
      ? `Depassement budgetaire mensuel de ${formatCurrency(report.monthlyBudgetOverrun)}.`
      : `Budget mensuel respecte a ${Math.min(report.budgetUsageRate, 100).toLocaleString('fr-FR', {
          maximumFractionDigits: 0,
        })} %.`,
    report.topExpenseCategory
      ? `Poste principal: ${report.topExpenseCategory}.`
      : 'Poste principal non renseigne pour cette periode.',
  ];

  // console.log(report.topExpenseCategory.top_expense_category)
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

        <Text style={styles.title}>Rapport mensuel</Text>
        <Text style={styles.subtitle}>
          Une lecture rapide et fiable du resumé global de la petite caisse.
        </Text>

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroMonth}>{isLoading ? 'Chargement...' : formatMonthLabel(report.reportMonth)}</Text>
            <Text style={styles.heroBadge}>{isLoading ? 'Sync' : report.balanceTrend}</Text>
          </View>

          {isLoading ? (
            <>
              <SkeletonBlock light style={styles.skeletonHeroAmount} />
              <SkeletonBlock light style={styles.skeletonHeroTextWide} />
              <SkeletonBlock light style={styles.skeletonHeroTextShort} />
            </>
          ) : (
            <>
              <Text style={styles.heroAmount}>{formatCurrency(report.finalBalance)}</Text>
              <Text style={styles.heroText}>Solde final estimé à la cloture de la periode.</Text>
            </>
          )}
        </View>

        <View style={styles.grid}>
          {reportCards.map((item) => (
            <View
              key={item.label}
              style={[
                styles.gridCard,
                item.tone === 'warning' && styles.gridCardWarning,
                item.tone === 'success' && styles.gridCardSuccess,
              ]}
            >
              {isLoading ? (
                <>
                  <SkeletonBlock style={styles.skeletonCardLabel} />
                  <SkeletonBlock style={styles.skeletonCardValue} />
                </>
              ) : (
                <>
                  <Text
                    style={[
                      styles.gridLabel,
                      item.tone === 'warning' && styles.gridLabelWarning,
                      item.tone === 'success' && styles.gridLabelSuccess,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.gridValue,
                      item.tone === 'warning' && styles.gridValueWarning,
                      item.tone === 'success' && styles.gridValueSuccess,
                    ]}
                  >
                    {item.value}
                  </Text>
                  {item.helper ? (
                    <Text
                      style={[
                        styles.gridHelper,
                        item.tone === 'warning' && styles.gridHelperWarning,
                        item.tone === 'success' && styles.gridHelperSuccess,
                      ]}
                    >
                      {item.helper}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          ))}
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>Lecture rapide</Text>

          {isLoading ? (
            <>
              <SkeletonBlock light style={styles.skeletonDetailLine} />
              <SkeletonBlock light style={styles.skeletonDetailLine} />
              <SkeletonBlock light style={styles.skeletonDetailLineShort} />
            </>
          ) : (
            <>
              {quickReadItems.map((item) => (
                <View key={item} style={styles.quickReadRow}>
                  <View style={styles.quickReadDot} />
                  <Text style={styles.detailText}>{item}</Text>
                </View>
              ))}
              {report.quickRead ? <Text style={styles.detailNote}>{report.quickRead}</Text> : null}
            </>
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
  heroCard: {
    marginTop: 22,
    borderRadius: 30,
    padding: 22,
    backgroundColor: '#0F766E',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroMonth: {
    color: '#D8F0EC',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
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
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    fontFamily: FONT_DISPLAY,
  },
  heroText: {
    marginTop: 8,
    color: '#D3ECE8',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FONT_BODY,
  },
  grid: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    marginBottom: 14,
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#F6F8F7',
    minHeight: 110,
    justifyContent: 'center',
  },
  gridCardWarning: {
    backgroundColor: '#FCE9C8',
  },
  gridCardSuccess: {
    backgroundColor: '#E5F5F1',
  },
  gridLabel: {
    color: '#60767D',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT_BODY,
  },
  gridLabelWarning: {
    color: '#8A4B00',
  },
  gridLabelSuccess: {
    color: '#1E6B61',
  },
  gridValue: {
    marginTop: 10,
    color: '#102A35',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  gridValueWarning: {
    color: '#8A3E00',
  },
  gridValueSuccess: {
    color: '#0F766E',
  },
  gridHelper: {
    marginTop: 8,
    color: '#71868D',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FONT_BODY,
  },
  gridHelperWarning: {
    color: '#9A5A11',
  },
  gridHelperSuccess: {
    color: '#2D7C71',
  },
  detailCard: {
    marginTop: 8,
    borderRadius: 28,
    padding: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  detailTitle: {
    color: '#F0FAF9',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  quickReadRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  quickReadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    marginRight: 10,
    backgroundColor: '#8ED2C8',
  },
  detailText: {
    flex: 1,
    color: '#E5F3F1',
    fontSize: 14,
    lineHeight: 24,
    fontFamily: FONT_BODY,
  },
  detailNote: {
    marginTop: 16,
    color: '#B8CBD0',
    fontSize: 14,
    lineHeight: 24,
    fontFamily: FONT_BODY,
  },
  skeletonBase: {
    borderRadius: 999,
  },
  skeletonDark: {
    backgroundColor: '#D7E3E0',
  },
  skeletonLight: {
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  skeletonHeroAmount: {
    marginTop: 16,
    width: '56%',
    height: 38,
    borderRadius: 16,
  },
  skeletonHeroTextWide: {
    marginTop: 12,
    width: '88%',
    height: 12,
  },
  skeletonHeroTextShort: {
    marginTop: 8,
    width: '70%',
    height: 12,
  },
  skeletonCardLabel: {
    width: '58%',
    height: 12,
  },
  skeletonCardValue: {
    marginTop: 12,
    width: '68%',
    height: 24,
    borderRadius: 10,
  },
  skeletonDetailLine: {
    marginTop: 14,
    width: '94%',
    height: 12,
  },
  skeletonDetailLineShort: {
    marginTop: 10,
    width: '72%',
    height: 12,
  },
});
