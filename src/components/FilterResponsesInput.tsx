import * as React from 'react';

const FilterResponsesInput = props => {
  const onChangeInput = val => props.FilterResponseInputAction(val);
  return (
    <div className='ui fluid input filter-responses-input__div'>
      <input className='filter-responses-input__input' onChange={e => onChangeInput(e.target.value)} type='text' placeholder='Filter By Characters...'/>
    </div>
  )
}

export default FilterResponsesInput;

