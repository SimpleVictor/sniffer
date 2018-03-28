const deepClone = require('clone-deep')
import {
  EmptyRecordedRequests,
  ErrorMessageEditModal,
  FilterResponseInput,
  GroupsInView,
  Received_Saved_Request,
  RecordedRequests,
  RequestInView,
  ResponseFilters,
  SetCurrentRequest,
  SetIndividualRequest,
  SocketConnected,
  SocketDisconnected,
  ToggleEditModal,
  ToggleProxy,
  ToggleSpinner,
  UniversalErrorMessageModal,
  Updated_Saved_Request
} from './actions'

/* Tells us the current connection with our sockets */
export const ConnectionReducer = (state = 'OFF', action) => {
  switch (action.type) {
    case SocketConnected:
      return 'ON'
    case SocketDisconnected:
      return 'OFF'
    default:
      return state
  }}

/* All of the group requests */
export const SavedRequestsReducer = (state = [], action) => {
  switch (action.type) {
    case Received_Saved_Request:
      return action.payload
    case Updated_Saved_Request:
      return action.payload
    default:
      return state
  }}

/* When the user clicks on a certain group  */
export const CurrentRequestReducer = (state = false, action) => {
  switch (action.type) {
    case SetCurrentRequest:
      return action.payload
    default:
      return state
  }}

/* When the user clicks an individual request on the home page */
export const CurrentIndividualRequestReducer = (state = false, action) => {
  switch (action.type) {
    case SetIndividualRequest:
      return action.payload
    default:
      return state
  }}

/* toggle spinner */
export const ToggleSpinnerReducer = (state = false, action) => {
  switch (action.type) {
    case ToggleSpinner:
      return !state
    default:
      return state
  }}

export const ToggleProxyReducer = (state = 'off', action) => {
  switch (action.type) {
    case ToggleProxy:
      return state === 'off' ? 'on' : 'off'
    default:
      return state
  }}

export const RequestInViewReducer = (state = null, action) => {
  switch (action.type) {
    case RequestInView:
      return action.payload
    default:
      return state
  }}

export const GroupInViewReducer = (state = 0, action) => {
  switch (action.type) {
    case GroupsInView:
      return action.payload
    default:
      return state
  }}

export const RecordedRequestsReducer = (state = [], action) => {
  switch (action.type) {
    case RecordedRequests:
      const clonedState = deepClone(state)
      clonedState.push(action.payload)
      return clonedState
    case EmptyRecordedRequests:
      return []
    default:
      return state
  }}

export const ToggleEditModalReducer = (state = false, action) => {
  switch (action.type) {
    case ToggleEditModal:
      return action.payload
    default:
      return state
  }}

export const ResponseFilterReducer = (state = 'all', action) => {
  switch (action.type) {
    case ResponseFilters:
      return action.payload
    default:
      return state
  }}

export const ErrorMessageEditModalReducer = (state = false, action) => {
  switch (action.type) {
    case ErrorMessageEditModal:
      return action.payload
    default:
      return state
  }}

export const UniversalErrorMessageModalReducer = (state = false, action) => {
  switch (action.type) {
    case UniversalErrorMessageModal:
      return action.payload
    default:
      return state
  }}

export const FilterResponseInputReducer = (state = '', action) => {
  switch (action.type) {
    case FilterResponseInput:
      return action.payload
    default:
      return state
  }}