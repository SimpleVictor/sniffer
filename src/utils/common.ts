import { getSocket } from './sockets'
import $ from 'jquery'
import 'semantic-ui-css/semantic.css'
import { getCM, setCM } from '../CodeMirror'
import { CSSConstant } from '../constant/cssNames';
import { toast } from 'react-toastify';
const CodeMirror = require('codemirror')
const deepClone = require('clone-deep')
$.fn.dropdown = require('semantic-ui-dropdown')
$.fn.accordion = require('semantic-ui-accordion')
$.fn.modal = require('semantic-ui-modal')
$.fn.dimmer = require('semantic-ui-dimmer')
$.fn.transition = require('semantic-ui-transition')

declare const Odometer: any

//TODO Maybe move this to the store
export const counterObj = {
  requestCounter: 0,
  interceptedCounter: 0,
  amountBulbWasClicked: 0  /* TODO find a way to remove this horrible hack around */
}

export const ModalConstantID = {
  imageModal: "image-modal"
}

export const ColorArray = ['red', 'purple', 'blue', 'orange', 'yellow', 'pink', 'green']

export const FilterText = ['all', 'xhr', 'js', 'html', 'css', 'img']

export const ModalConstant = { edit: '.ui.modal.edit-modal', delete: '.ui.modal.small.delete-modal'}

// export const removeNewLineAndSpaces = str => str.replace(/\s/g, '')
export const removeNewLineAndSpaces = str => str.trim()

export const removeExtraJSONCharacters = str => removeNewLineAndSpaces(str).replace(`)]}',`, '') /* Did this is something specific to how angular "protects" their JSON response by prepending a static string... */

export const currentRequestSelector = (savedRequests, groupInView, requestInView) => savedRequests[groupInView].data[requestInView]

export const DeepClone = obj => deepClone(obj)

export const GetRandomColor = () => ColorArray[Math.floor(Math.random() * 7)]

export const onPrint = data => console.log(data)

export const onHideEditModal = props => props.ToggleEditModalAction(false)

export const OpenEditModal = props => $(ModalConstant['edit']).modal({duration: 100, onHide: () => onHideEditModal(props)}).modal('show')

export const OpenDeleteModal = () => $('#delete-modal').modal({duration: 200 }).modal('show')

export const hideEditModal = () => $('.ui.modal.edit-modal').modal('hide')

export const GetSavedRequests = () => getSocket().emit('GetSavedRequests')

export const GetGlobalHeaders = () => getSocket().emit('GetGlobalHeaders')

export const ChangeCodeMirrorClass = () => $('.CodeMirror')[0].className = 'CodeMirror cm-s-midnight'

export const hideDeleteModal = () => $('.ui.modal.small.delete-modal').modal('hide')

export const hideDeleteGroupModal = () => $('#delete-group-modal').modal('hide')

export const isThereAnyGlobalErrorMessages = errorMessage => errorMessage

export const onErrorModalExit = action => action(false)

export const openModal = selector => $(selector).modal({duration: 100 }).modal('show')

export const closeModal = selector => $(selector).modal({duration: 200 }).modal('hide')

export const isValidJSON = str => isValidJSONTest1(str) && isValidJSONTest2(str)

export const showErrorModal = action => $('#error-modal').modal({onHide: () => onErrorModalExit(action)}).modal('show')

export const EmitDropDownLisntener = () => $(`${CSSConstant.UIFloatingDropDown}`).dropdown({on: 'hover', duration: 50})

export const EmitGlobalErrorMessage = (message, action) => action(message)

export const DispatchFilterAction = (action, val) => action(val)

export const GetDOMElement = id => (document.getElementById(id) as any) /* TODO By more specific (ID, CLASSES) */

export const ElementSelector = selector => document.querySelector(selector)

export const wasRequestIntercepted = (sniffedRequest) => sniffedRequest.isIntercepted

export const isRequestInViewNotNull = requestInView => requestInView !== null

export const determineContentType = (groupInView, savedRequests, idx) => savedRequests[groupInView].data[idx]['content-type']

export const openToast = (message) => {
  toast.success(message, {
    position: toast.POSITION.BOTTOM_CENTER
  });
}

export const openErrorToast = (message) => {
  toast.error(message, {
    position: toast.POSITION.BOTTOM_CENTER
  });
}

export const getDropDownCurrentGroupText = props => {
  const yeah = props.savedRequests.length ? props.savedRequests[props.groupInView].group : 'searching...'
  if(props.savedRequests.length) {
    console.log(props.savedRequests[props.groupInView].group)
  }
  return yeah;
}

export const removeEndingSlashInUrl = urlStr => urlStr.endsWith('/') ? urlStr.slice(0, -1) : urlStr

export const bulbClicked = () => $('body').toggleClass('active')

export const getPrimaryData = props => props.savedRequests.filter(e => e.isPrimary)

export const PushNewMockRequest = (totalRequest, groupInView, mockRequest) =>
  totalRequest[groupInView].data.push(mockRequest) && totalRequest

export const isImage = (contentType) => /image/g.test(contentType);

export const CreateNewTotalRequestObject = (requestObjToBeAdded, savedRequests, groupInView) =>
  PushNewMockRequest(DeepClone(savedRequests), groupInView, requestObjToBeAdded)

export const groupListClicked = (props, idx) => {
  props.RequestInViewAction(0)
  props.GroupsInViewAction(idx)
  document.getElementById('groupDropDownButton').querySelector('span').innerHTML = 'Change Group'
}

export const CreateMockJSONRequestObject = recordedRequest => ({
  urlToMatch: removeEndingSlashInUrl(recordedRequest.url),
  'content-type': recordedRequest.contentType,
  response: JSON.parse(removeExtraJSONCharacters(recordedRequest.body)),
  headers: [],
  status: recordedRequest.response['status_code']})

export const CreateMockIMAGERequestObject = recordedRequest => ({
  urlToMatch: removeEndingSlashInUrl(recordedRequest.url),
  'content-type': recordedRequest.contentType,
  response: '', /* Currently, we will set this when the user inputs in a picture and the ID is reference here*/
  headers: [],
  status: recordedRequest.response['status_code']})

export const setUpOdometer = arr => arr.forEach(id =>
  new Odometer({
    el: GetDOMElement(id),
    value: 0,
    format: '',
    duration: 500,
    theme: 'minimal'
  }))

export const toggleProxy = props => {
  const currentRequest = props.savedRequests[props.groupInView]
  props.ToggleSpinnerAction()
  props.proxy === 'on' ? getSocket().emit('TurnOffProxy') : getSocket().emit('TurnOnProxy', currentRequest)
  /* Move this to the callback of the proxy emitter */
  props.ToggleProxyAction()}

export const getFilterList = () => ({
  all: true,
  xhr: 'text/plain application/json application/x-javascript',
  js:  'text/javascript application/x-javascript',
  css: 'text/css',
  img: 'image/png image/svg+xml image/jpeg image/gif image/jpeg',
  html: 'text/html'})

export const AddEmptyGroupToMockJSON = (props, inputValue = 'Something went wrong with the input value') => {
  /* Add Group into the mocks.json */
  const deepClonedSavedRequests = DeepClone(props.savedRequests)
  const groupObj = {
    group: inputValue,
    isPrimary: false,
    data: []
  }
  deepClonedSavedRequests.push(groupObj)
  getSocket().emit('AddEmptyGroupToRequest', deepClonedSavedRequests)}

export const isValidJSONTest1 = str =>
  /^[\],:{}\s]*$/.test(str
    .replace(/\\["\\\/bfnrtu]/g, '@')
    .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
    .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))

export const isValidJSONTest2 = str => {
  try {
    JSON.parse(str)
    return true
  } catch(err) {
    return false
  }}

export const setUpEditModalForCM = props => {
  props.ErrorMessageEditModalAction(false)
  const { groupInView, requestInView, savedRequests, ToggleEditModalAction} = props
  ToggleEditModalAction(true)
  const location: any = GetDOMElement('my-edit-textarea')
  let cm = getCM()
  if (location) {
    if (cm) {
      cm.toTextArea()
    }
    setCM(CodeMirror.fromTextArea(location))
    cm = getCM()
    cm.setSize('100%', '800px')
    ChangeCodeMirrorClass()
    const data = JSON.stringify(isRequestInViewNotNull(requestInView) ? savedRequests[groupInView].data[requestInView].response : {}, undefined, 2)
    cm.setValue(data)
  }}

export const getComponentsStatusAndUrlInputElement = componentName => {
  let urlInputElement: any = ''
  let statusInputElement: any = ''
  switch (componentName) {
    case 'JsonEditorModal':
      urlInputElement = GetDOMElement('jsonEditorModalUrlInput')
      statusInputElement = GetDOMElement('jsonEditorModalStatusInput')
      break
    case 'EditModalComponent':
      urlInputElement= GetDOMElement('editModalUrlInput')
      statusInputElement = GetDOMElement('editModalStatusInput')
      break
    case 'ImageModal':
      urlInputElement= GetDOMElement('imageModalUrlInput')
      statusInputElement = GetDOMElement('imageModalStatusInput')
      break
    default:
      break
  }
  return { urlInputElement, statusInputElement }}

export const updateMockResponse = (props, componentName, updatedResponse, headers?) => {
  const { groupInView, requestInView, savedRequests} = props
  const { urlInputElement, statusInputElement } = getComponentsStatusAndUrlInputElement(componentName)
  const clonedSavedRequests = DeepClone(savedRequests)
  const retrievedResponse = currentRequestSelector(clonedSavedRequests, groupInView, requestInView)
  retrievedResponse.response = updatedResponse
  retrievedResponse.urlToMatch = urlInputElement.value
  retrievedResponse.headers = headers || retrievedResponse.headers
  retrievedResponse.status = Number(statusInputElement.value)
  getSocket().emit('SetSavedRequests', JSON.stringify(clonedSavedRequests)) /* Send Our Updated savedRequests object to be stored inside of mocks.json */
  return true}

/* Ask some react expert about best approaches about this */
/* Maybe we can query if the dom element actually exist or not */
export const updateInputFields = (url, status, componentName) => {
  const { urlInputElement, statusInputElement } = getComponentsStatusAndUrlInputElement(componentName)
  urlInputElement.value = url || ''
  statusInputElement.value = status || ''}

export const updateUrlAndStatus = (props, componentsName) => {
  const { groupInView, requestInView, savedRequests } = props
  if (isRequestInViewNotNull(requestInView)) {
    const currentRequest = currentRequestSelector(savedRequests, groupInView, requestInView)
    if (currentRequest) {
      const url = currentRequest.urlToMatch || ''
      const status = currentRequest.status || ''
      updateInputFields(url, status, componentsName)
    }
  }}