import * as React from 'react';
import { Content } from '../../constant/text';

const GroupsBoxComponent = props => (
  <div className='ui raised segments'>
    <div className='ui segment box-title__div'><p>{Content.groupsBoxComponentTitle}</p></div>
    <div className='ui secondary segment box-content__div'>
      <p className='box-content__p'>{props.savedRequests.length}</p>
    </div>
  </div>
);

export default GroupsBoxComponent;

