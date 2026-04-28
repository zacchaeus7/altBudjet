

const favoriteDataReducerState = {
  favoriteMemoriesItems: []
};

export default function memoryFavoriteReducer(state = favoriteDataReducerState, action) {

    let nextState;
    
  switch(action.type){

      case "TOGGLE_MEMORY_FAVORITE":

         const favoriteBookIndex = state.favoriteMemoriesItems.findIndex(Item=>Item.id === action.value.id);
         if(favoriteBookIndex !== -1){
            //suppression
            // console.log("sa")
            nextState = {
                ...state, 
                favoriteMemoriesItems : state.favoriteMemoriesItems.filter((Item,index)=>index !== favoriteBookIndex)
            }
         } else{
            nextState = {
                ...state,
                favoriteMemoriesItems : [...state.favoriteMemoriesItems, action.value]
            }
         }
         return nextState

        default : return state
      
    }

  }
