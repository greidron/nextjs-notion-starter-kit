import { ExtendedRecordMap } from 'notion-types'
import {
  getCanonicalPageId as getCanonicalPageIdImpl,
  parsePageId,
  idToUuid,
  uuidToId,
} from 'notion-utils'

import {
  inversePageUrlOverrides as defaultInversePageUrlOverrides,
  navigationPageIds as defaultNavigationPageIds,
} from './config'
import { getBlockParent } from './get-block-parent'
import { PageUrlOverridesInverseMap } from './types'

function getParentPath(
  pageId: string,
  recordMap: ExtendedRecordMap,
  navigationPageIds: string[] | null,
  inversePageUrlOverrides: PageUrlOverridesInverseMap
): string | null {
  const currentBlock = recordMap.block[idToUuid(pageId)]?.value
  const navigationPageUuids = navigationPageIds?.map(idToUuid)
  const parentBlock = getBlockParent(
    currentBlock,
    recordMap,
    (b) => navigationPageUuids?.includes(b?.id)
  )
  const parentId = parentBlock?.id
  return parentId && inversePageUrlOverrides[uuidToId(parentId)]
}

export function getCanonicalPageId(
  pageId: string,
  recordMap: ExtendedRecordMap,
  {
    uuid = true,
    navigationPageIds = defaultNavigationPageIds,
    inversePageUrlOverrides = defaultInversePageUrlOverrides,
  }: {
    uuid?: boolean,
    navigationPageIds?: string[],
    inversePageUrlOverrides?: PageUrlOverridesInverseMap
  } = {}
): string | null {
  const cleanPageId = parsePageId(pageId, { uuid: false })
  if (!cleanPageId) {
    return null
  }

  const override = inversePageUrlOverrides[cleanPageId]
  if (override) {
    return override
  } else {
    const parentPath = getParentPath(
      cleanPageId, recordMap, navigationPageIds, inversePageUrlOverrides)
    const canonicalPageId = getCanonicalPageIdImpl(pageId, recordMap, {
      uuid
    })
    return parentPath? parentPath + '/' + canonicalPageId : canonicalPageId
  }
}
