import { createStore, combineReducers } from 'redux';
// import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userReducer } from './reducers/userReducer';
import initialDataReducer from './reducers/initialDataReducer';


const persistConfig = {
    key: 'root',
    storage: AsyncStorage
}

const rootReducer = combineReducers({
    userReducer,
    initialDataReducer,

});

export const Store = createStore(rootReducer);
// export const Persistor = persistStore(Store);