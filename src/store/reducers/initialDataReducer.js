
const initialDataReducerState = {
    initialData: {
        Institution: {name: 'choisissez une institution',lastYear : '',institution_id : ''},
        Profile: {name: 'Etudiant',profile_id : ''},
        Region: {name: 'Lubumbashi',id : ''},
        full_name: null,
        email: null,
        password: null
    },
    initialDatas: []
};

export default function initialDataReducer(state = initialDataReducerState, action) {

    switch(action.type){

        case "ADD_TO_IDENTITY":{

            return{
                ...state,
                initialData: {...state.initialData, ...action.value}
            }

        }

        case "APPEND_TO_IDENTITIES":{

            return{
                ...state,
                initialDatas: [...state.initialDatas, ...action.value]
            }

        }

        case 'CLEAR_IDENTITY':
        
            return{
                ...state,
                initialData: initialDataReducerState.initialDatas
            } 

        default:
            
        return state

    }

}