

const favoriteDataReducerState = {
  infoReadItems: []
};

export default function infoReadReducer(state = favoriteDataReducerState, action) {

    let nextState;
    
  switch(action.type){

      case "TOGGLE_READ":
        const favoriteBookIndex = state.infoReadItems.findIndex(Item=>Item.id === action.value.id);
        if(favoriteBookIndex === -1){
        nextState = {
          ...state,
          infoReadItems : [...state.infoReadItems, action.value]
      }
    }
           
        return nextState

        default : return state
      
    }

  }
