import * as React from 'react';
import { Content } from '../../constant/text';

const CollectionBoxComponent = props => {
  const getTotalCollections = () => props.savedRequests.reduce((acc, cur) => acc + cur.data.length, 0);
  return (
    <div className='ui raised segments'>
      <div className='ui segment box-title__div'><p>{Content.collectionBoxComponentTitle}</p></div>
      <div className='ui secondary segment box-content__div'><p className='box-content__p'>{getTotalCollections()}</p></div>
    </div>
  )
}

export default CollectionBoxComponent;

