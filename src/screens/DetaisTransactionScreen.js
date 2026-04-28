import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_BODY, FONT_DISPLAY, FONT_HEADING } from '../theme/typography';

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
    'Non renseignee'
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
    'Non renseigne'
  );
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
    'Non renseigne'
  );
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

function DetailRow({ label, value, accent = false }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, accent && styles.detailValueAccent]}>{value}</Text>
    </View>
  );
}

export default function DetaisTransactionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const transaction = route?.params?.transaction || null;
//   console.log('Transaction details screen received transaction:', transaction);

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>

        <ScrollView
          bounces={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Details de la transaction</Text>
          <Text style={styles.subtitle}>
            Consultez toutes les informations de l operation selectionnee.
          </Text>

          {transaction ? (
            <View style={styles.card}>
              <View style={styles.hero}>
                <Text style={styles.heroLabel}>Operation</Text>
                <Text style={styles.heroTitle}>{getActivityCategory(transaction)}</Text>
                {/* <Text style={styles.heroTitle}>{getActivityTitle(transaction)}</Text> */}
                <Text
                  style={[
                    styles.heroAmount,
                    String(transaction?.type || '').toLowerCase() === 'income'
                      ? styles.heroAmountIncome
                      : styles.heroAmountExpense,
                  ]}
                >
                  {formatActivityAmount(transaction)}
                </Text>
              </View>
                <DetailRow
                    label="Reference"
                    value={String(getActivityReference(transaction) || transaction?.id || 'Non renseignee')}
                />
              <DetailRow
                label="Type"
                value={String(transaction?.type || '').toLowerCase() === 'income' ? 'Entree' : 'Depense'}
              />
              
              <DetailRow label="Statut" value={getActivityStatus(transaction)} />
              <DetailRow label="Compte" value={getActivityAccount(transaction)} />
              <DetailRow label="Categorie" value={getActivityCategory(transaction)} />
              <DetailRow label="Cree par" value={getActivityActor(transaction)} />
              <DetailRow
                label="Date"
                value={formatActivityDate(
                  transaction?.transaction_date || transaction?.created_at || transaction?.date,
                )}
              />
             
              <DetailRow
                label="Description"
                value={String(
                  transaction?.description ||
                    transaction?.note ||
                    transaction?.comment ||
                    transaction?.details ||
                    'Aucune description',
                )}
              />
              <DetailRow
                label="Montant"
                value={formatActivityAmount(transaction)}
                accent
              />
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucune transaction n a ete transmise a cet ecran.</Text>
            </View>
          )}
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
    paddingHorizontal: 0,
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
  scrollContent: {
    flexGrow: 1,
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
  card: {
    marginTop: 22,
    borderRadius: 28,
    backgroundColor: '#F6F8F7',
    padding: 18,
  },
  hero: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#E7F3F0',
    marginBottom: 12,
  },
  heroLabel: {
    color: '#47626A',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: FONT_HEADING,
  },
  heroTitle: {
    marginTop: 10,
    color: '#15343D',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  heroAmount: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  heroAmountIncome: {
    color: '#0F766E',
  },
  heroAmountExpense: {
    color: '#102A35',
  },
  detailRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5ECEA',
  },
  detailLabel: {
    color: '#688087',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: FONT_HEADING,
  },
  detailValue: {
    marginTop: 7,
    color: '#15343D',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONT_BODY,
  },
  detailValueAccent: {
    color: '#0F766E',
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  emptyCard: {
    marginTop: 22,
    borderRadius: 28,
    backgroundColor: '#F6F8F7',
    padding: 22,
  },
  emptyText: {
    color: '#5E747C',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: FONT_BODY,
  },
});
