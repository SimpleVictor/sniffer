import * as React from 'react';
import {
  EmitDropDownLisntener,
  GetRandomColor,
  groupListClicked
} from '../utils/common';
import { Component } from 'react';

class RequestsDropDown extends Component {
  constructor(public props) {
    super(props)
  }

  private DropDownCurrentGroupText = props => (<span className='text'>Change Group </span>)

  componentDidMount() {
    EmitDropDownLisntener()}

  render() {
    return (
      <div id='groupDropDownButton' className={`ui floating ${this.props.proxy === 'on' ? 'disabled ' : ''}dropdown icon button`}>
        { this.DropDownCurrentGroupText(this.props) }
        <i className='fa fa-sort-down fa-2x'/>
        { Menu(this.props) }
      </div>
    )}
}

export default RequestsDropDown;

function Menu(props) {
  return(
    <div className='menu'>
      <SearchInput/>
      <div className='scrolling menu'>
        {GenerateMenu(props)}
      </div>
    </div>
  )
}

function SearchInput() {
  return(
    <div className='ui icon search input'>
      <input type='text' placeholder='Search group...'/>
    </div>
  )
}

function GenerateMenu(props) {
  return props.savedRequests
    ? props.savedRequests.map((e, i) => GenerateList(props, e, i))
    : DefaultNoList();
}

function DefaultNoList() {
  return (<div className='item'><div className='ui red empty circular label'></div>You have no groups yet</div>)
}

function GenerateList(props, element, idx) {
 return(
   <div onClick={() => groupListClicked(props, idx)} className='item' key={element.group.replace(' ', '') + (idx + 1)}>
     <div className={`ui ${GetRandomColor()} empty circular label`}></div>
     {element.group}
   </div>
 )
}

