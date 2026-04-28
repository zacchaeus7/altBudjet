
import { Appearance } from 'react-native';

const colorScheme = Appearance.getColorScheme();

export const initialState = { 
  user: [] 
}

export function userReducer(state = initialState, action) {

  let nextState;
  
  switch (action.type) {
    case 'REGISTER_USER':
      state = initialState;
      nextState = {
        ...state,
        user: {...state.user, ...action.value}
      };

      return nextState

  default:
    return state;
  }
}

