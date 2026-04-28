

const favoriteDataReducerState = {
  favoriteBooksItems: []
};

export default function bookFavoriteReducer(state = favoriteDataReducerState, action) {

    let nextState;
    
  switch(action.type){

      case "TOGGLE_FAVORITE":

         const favoriteBookIndex = state.favoriteBooksItems.findIndex(Item=>Item.id === action.value.id);
         if(favoriteBookIndex !== -1){
            //suppression
            nextState = {
                ...state, 
                favoriteBooksItems : state.favoriteBooksItems.filter((Item,index)=>index !== favoriteBookIndex)
            }
         } else{
            nextState = {
                ...state,
                favoriteBooksItems : [...state.favoriteBooksItems, action.value]
            }
         }
         return nextState

        default : return state
      
    }

  }
