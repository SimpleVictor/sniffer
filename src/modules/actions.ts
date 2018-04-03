export const SocketConnected = 'SocketConnected'
export const SocketDisconnected = 'SocketDisconnected'

export const SocketConnectAction = payload => ({type: SocketConnected, payload})
export const SocketDisconnectAction = payload => ({type: SocketDisconnected, payload})

export const Updated_Saved_Request = 'Updated_Saved_Request'
export const UpdatedSavedRequestAction = payload => ({type: Updated_Saved_Request, payload})
export const Received_Saved_Request = 'Received_Saved_Request'
export const ReceivedSavedRequestAction = payload => ({type: Received_Saved_Request, payload})

export const SetCurrentRequest = 'SetCurrentRequest'
export const SetCurrentRequestAction = payload => ({type: SetCurrentRequest, payload})

export const SetIndividualRequest = 'SetIndividualRequest'
export const SetIndividualRequestAction = payload => ({type: SetIndividualRequest, payload})

export const SaveEverything = 'SaveEverything'
export const SaveEverythingAction = payload => ({type: SaveEverything, payload})

export const GroupsInView = 'GroupsInView'
export const GroupsInViewAction = payload => ({type: GroupsInView, payload})

export const FilterResponseInput = 'FilterResponseInput'
export const FilterResponseInputAction = payload => ({type: FilterResponseInput, payload})

export const AddGroup = 'AddGroup'
export const AddGroupAction = payload => ({type: AddGroup, payload})

export const RequestInView = 'RequestInView'
export const RequestInViewAction = payload => ({type: RequestInView, payload})

export const ToggleSpinner = 'ToggleSpinner'
export const ToggleSpinnerAction = () => ({type: ToggleSpinner})

export const ToggleProxy = 'ToggleProxy'
export const ToggleProxyAction = () => ({type: ToggleProxy})

/* Store each sniffed request's metadata, comes from our socket tunnel */
export const RecordedRequests = 'RecordedRequests'
export const RecordedRequestsAction = payload => ({type: RecordedRequests, payload})

/* Clear out all the Recorded Requests */
export const EmptyRecordedRequests = 'EmptyRecordedRequests'
export const EmptyRecordedRequestsAction = () => ({type: EmptyRecordedRequests})

export const SetGlobalHeaders = 'SetGlobalHeaders'
export const SetGlobalHeadersAction = payload => ({type: SetGlobalHeaders, payload})

export const ResponseFilters = 'ResponseFilters'
export const ResponseFiltersAction = payload => ({type: ResponseFilters, payload})

export const ErrorMessageEditModal = 'ErrorMessageEditModal'
export const ErrorMessageEditModalAction = payload => ({type: ErrorMessageEditModal, payload})

export const UniversalErrorMessageModal = 'UniversalErrorMessageModal'
export const UniversalErrorMessageModalAction = payload => ({type: UniversalErrorMessageModal, payload})

/* Modals Opening */
export const ToggleEditModal = 'ToggleEditModal'
export const ToggleEditModalAction = payload => ({type: ToggleEditModal, payload})

