import * as React from 'react'
import { openModal } from '../utils/common'
import AddGroupModal from './modals/AddGroupModal'
import { CSSConstant } from '../constant/cssNames'
import { Content } from '../constant/text';

const GroupSelectorAddSection = props => {
  const openAddGroupModal = () =>
    props.proxy === 'off'
      ? openModal(`#${CSSConstant.addGroupModalDiv}`)
      : openModal(`#${CSSConstant.proxyIsOnModalID}`);

  return (
    <div className={CSSConstant.groupSelectorAddSectionDiv}>
      <a
        className={CSSConstant.groupSelectorAddSectionAnchor}
        onClick={openAddGroupModal}>
        {Content.groupSelectorAddSectionAnchorTitle}
      </a>

      {/*TODO create a way to manually add a request*/}
      {/*<a className='group-selector-add-request__a'></a>*/}

      {/* MODAL */}
      {AddGroupModal(props)}
    </div>
  )
}

export default GroupSelectorAddSection
