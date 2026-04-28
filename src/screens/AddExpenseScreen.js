import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../apis/API';
import { FONT_BODY, FONT_DISPLAY, FONT_HEADING } from '../theme/typography';

const getTodayDate = () => {
  return new Date().toISOString().slice(0, 10);
};

const transactionTypes = [
  { id: 'expense', label: 'expense' },
  { id: 'income', label: 'income' },
];

const extractOptions = (response, collectionKey) => {
  const payload = response?.data || response || {};
  const directCollection = payload?.[collectionKey];

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(directCollection)) {
    return directCollection;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(response?.[collectionKey])) {
    return response[collectionKey];
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  return [];
};

export default function AddExpenseScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const api = useMemo(() => new API(), []);
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate] = useState(getTodayDate());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectorType, setSelectorType] = useState(null);

  const isDisabled = useMemo(() => {
    return (
      isSaving ||
      isLoadingOptions ||
      !accountId.trim() ||
      !categoryId.trim() ||
      !type.trim() ||
      !amount.trim() ||
      !description.trim() ||
      !transactionDate.trim()
    );
  }, [accountId, amount, categoryId, description, isLoadingOptions, isSaving, transactionDate, type]);

  const selectedAccount = useMemo(() => {
    return accounts.find((item) => String(item?.id) === String(accountId));
  }, [accountId, accounts]);

  const selectedCategory = useMemo(() => {
    return categories.find((item) => String(item?.id) === String(categoryId));
  }, [categories, categoryId]);

  const selectedType = useMemo(() => {
    return transactionTypes.find((item) => item.id === type);
  }, [type]);

  const showError = (message) => {
    Alert.alert('Erreur', message);
  };

  const extractApiErrorMessage = (error) => {
    const apiMessage =
      error?.details?.message ||
      error?.details?.error ||
      error?.details?.errors?.account_id?.[0] ||
      error?.details?.errors?.category_id?.[0] ||
      error?.details?.errors?.type?.[0] ||
      error?.details?.errors?.amount?.[0] ||
      error?.details?.errors?.description?.[0] ||
      error?.details?.errors?.transaction_date?.[0] ||
      error?.message;

    if (error?.status === 408) {
      return 'Le serveur met trop de temps a repondre. Reessayez.';
    }

    if (error?.status === 422) {
      return apiMessage || 'Certaines donnees sont invalides.';
    }

    if (error?.status === 0) {
      return 'Impossible de joindre le serveur. Verifiez votre connexion et l URL de l API.';
    }

    return apiMessage || 'Une erreur est survenue pendant l enregistrement.';
  };

  const getOptionLabel = (item, fallback) => {
    return (
      item?.name ||
      item?.label ||
      item?.title ||
      item?.description ||
      `${fallback} #${item?.id ?? ''}`.trim()
    );
  };

  const fetchAccounts = async () => {
    const response = await api.getData('accounts');
    const items = extractOptions(response, 'accounts');
    setAccounts(items);
    return items;
  };

  const fetchCategories = async () => {
    const response = await api.getData('categories');
    const items = extractOptions(response, 'categories');
    setCategories(items);
    return items;
  };

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      setIsLoadingOptions(true);

      try {
        const [loadedAccounts, loadedCategories] = await Promise.all([
          fetchAccounts(),
          fetchCategories(),
        ]);

        if (!isMounted) {
          return;
        }

        if (loadedAccounts?.length === 1) {
          setAccountId(String(loadedAccounts[0]?.id));
        }

        if (loadedCategories?.length === 1) {
          setCategoryId(String(loadedCategories[0]?.id));
        }
      } catch (error) {
        if (isMounted) {
          showError(extractApiErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false);
        }
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    const normalizedAmount = amount.replace(',', '.').trim();

    if (
      !accountId.trim() ||
      !categoryId.trim() ||
      !type.trim() ||
      !normalizedAmount ||
      !description.trim() ||
      !transactionDate.trim()
    ) {
      showError('Tous les champs sont obligatoires.');
      return;
    }

    if (Number.isNaN(Number(normalizedAmount)) || Number(normalizedAmount) <= 0) {
      showError('Le montant doit etre un nombre superieur a zero.');
      return;
    }

    const payload = {
      account_id: accountId.trim(),
      category_id: categoryId.trim(),
      type: type.trim(),
      amount: normalizedAmount,
      description: description.trim(),
      transaction_date: transactionDate.trim(),
    };

    
    setIsSaving(true);

    try {
     const response = await api.send(payload, 'transactions');
    console.log(response)

      Alert.alert('Depense enregistree', 'La depense a ete ajoutee a la petite caisse.', [
        { text: 'Rester ici' },
        { text: 'Retour au dashboard', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      showError(extractApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const selectorItems =
    selectorType === 'account'
      ? accounts
      : selectorType === 'category'
        ? categories
        : transactionTypes;
  const selectorTitle =
    selectorType === 'account'
      ? 'Choisir un compte'
      : selectorType === 'category'
        ? 'Choisir une categorie'
        : 'Choisir un type';

  const handleSelectItem = (item) => {
    if (selectorType === 'account') {
      setAccountId(String(item?.id));
    } else if (selectorType === 'category') {
      setCategoryId(String(item?.id));
    } else {
      setType(String(item?.id));
    }

    setSelectorType(null);
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <Modal
        animationType="slide"
        transparent
        visible={selectorType !== null}
        onRequestClose={() => setSelectorType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectorTitle}</Text>
              <TouchableOpacity activeOpacity={0.85} onPress={() => setSelectorType(null)}>
                <Text style={styles.modalClose}>Fermer</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectorItems.length === 0 ? (
                <Text style={styles.emptyOptionsText}>Aucune option disponible pour le moment.</Text>
              ) : (
                selectorItems.map((item) => (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    key={String(item?.id)}
                    onPress={() => handleSelectItem(item)}
                    style={styles.optionRow}
                  >
                    <View>
                      <Text style={styles.optionTitle}>
                        {selectorType === 'type'
                          ? item?.label
                          : getOptionLabel(item, selectorType === 'account' ? 'Compte' : 'Categorie')}
                      </Text>
                      <Text style={styles.optionMeta}>
                        {selectorType === 'type' ? `Valeur: ${item?.id}` : `ID: ${item?.id}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Ajouter une depense</Text>
        <Text style={styles.subtitle}>
          Renseignez les informations necessaires pour creer la transaction de depense.
        </Text>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Compte</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSaving || isLoadingOptions}
            onPress={() => setSelectorType('account')}
            style={[styles.selectField, (isSaving || isLoadingOptions) && styles.buttonDisabled]}
          >
            <View>
              <Text style={styles.selectValue}>
                {selectedAccount
                  ? getOptionLabel(selectedAccount, 'Compte')
                  : isLoadingOptions
                    ? 'Chargement des comptes...'
                    : 'Selectionner un compte'}
              </Text>
              {selectedAccount ? <Text style={styles.selectMeta}>ID: {selectedAccount?.id}</Text> : null}
            </View>
            <Text style={styles.selectAction}>Choisir</Text>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Categorie</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSaving || isLoadingOptions}
            onPress={() => setSelectorType('category')}
            style={[styles.selectField, (isSaving || isLoadingOptions) && styles.buttonDisabled]}
          >
            <View>
              <Text style={styles.selectValue}>
                {selectedCategory
                  ? getOptionLabel(selectedCategory, 'Categorie')
                  : isLoadingOptions
                    ? 'Chargement des categories...'
                    : 'Selectionner une categorie'}
              </Text>
              {selectedCategory ? <Text style={styles.selectMeta}>ID: {selectedCategory?.id}</Text> : null}
            </View>
            <Text style={styles.selectAction}>Choisir</Text>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Type</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSaving}
            onPress={() => setSelectorType('type')}
            style={[styles.selectField, isSaving && styles.buttonDisabled]}
          >
            <View>
              <Text style={styles.selectValue}>
                {selectedType ? selectedType.label : 'Selectionner un type'}
              </Text>
              <Text style={styles.selectMeta}>Options: expense, income</Text>
            </View>
            <Text style={styles.selectAction}>Choisir</Text>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Montant</Text>
          <TextInput
            editable={!isSaving}
            keyboardType="numeric"
            onChangeText={setAmount}
            placeholder="Ex. 150"
            placeholderTextColor="#7A8A90"
            style={styles.input}
            value={amount}
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            editable={!isSaving}
            multiline
            numberOfLines={4}
            onChangeText={setDescription}
            placeholder="Ex. Achat fournitures bureau"
            placeholderTextColor="#7A8A90"
            style={[styles.input, styles.textArea]}
            textAlignVertical="top"
            value={description}
          />

          <Text style={styles.inputLabel}>Date de transaction</Text>
          <TextInput
            autoCapitalize="none"
            editable={false}
            placeholderTextColor="#7A8A90"
            style={[styles.input, styles.inputDisabled]}
            value={transactionDate}
          />

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={isDisabled}
            onPress={handleSave}
            style={[styles.button, isDisabled && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer la depense'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7F6',
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
    backgroundColor: '#DDEAE7',
  },
  backButtonText: {
    color: '#11323A',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  title: {
    marginTop: 18,
    color: '#10313A',
    fontSize: 30,
    fontWeight: '800',
    fontFamily: FONT_DISPLAY,
  },
  subtitle: {
    marginTop: 10,
    color: '#61767D',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FONT_BODY,
  },
  formCard: {
    marginTop: 22,
    borderRadius: 28,
    padding: 22,
    backgroundColor: '#FFFFFF',
  },
  inputLabel: {
    marginBottom: 10,
    marginTop: 14,
    color: '#23404A',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  input: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: '#F6F8F7',
    borderWidth: 1,
    borderColor: '#D7E2DF',
    color: '#112F38',
    fontSize: 15,
  },
  inputDisabled: {
    color: '#6D8288',
    backgroundColor: '#EDF3F1',
  },
  textArea: {
    minHeight: 110,
    paddingTop: 16,
  },
  selectField: {
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F6F8F7',
    borderWidth: 1,
    borderColor: '#D7E2DF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: {
    color: '#112F38',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  selectMeta: {
    marginTop: 4,
    color: '#6D8288',
    fontSize: 12,
    fontFamily: FONT_BODY,
  },
  selectAction: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  button: {
    marginTop: 24,
    minHeight: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 34, 48, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '70%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    color: '#10313A',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  modalClose: {
    color: '#0F766E',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  optionRow: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F6F8F7',
    marginBottom: 10,
  },
  optionTitle: {
    color: '#10313A',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  optionMeta: {
    marginTop: 4,
    color: '#6A8087',
    fontSize: 12,
    fontFamily: FONT_BODY,
  },
  emptyOptionsText: {
    paddingVertical: 20,
    color: '#61767D',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: FONT_BODY,
  },
});
