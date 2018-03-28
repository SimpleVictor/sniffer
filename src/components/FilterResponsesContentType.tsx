import * as React from 'react';
import {
  DispatchFilterAction,
  FilterText
} from '../utils/common';


const FilterResponsesContentType = props => (
  <div className='ui small horizontal divided list'>
    {
      FilterText.map((item, idx) => (
        <div className='item filter-link__div' key={item+idx}>
          <div className='content'>
            <a className={`filter-link-content__anchor ${props.currentFilter === item ? 'filter-link-content__anchor--active' : ''}`} onClick={() => DispatchFilterAction(props.ResponseFiltersAction, item)}>{item.toUpperCase()}</a>
          </div>
        </div>
      ))
    }

    {/*CLEAR BUTTON*/}
    <div className='item filter-link__div'>
      <div className='content'>
        <a className='filter-link-content__anchor' onClick={props.EmptyRecordedRequestsAction}>CLEAR</a>
      </div>
    </div>


  </div>
);

export default FilterResponsesContentType;

