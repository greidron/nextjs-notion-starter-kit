import { ExtendedRecordMap } from 'notion-types'
import {
  getCanonicalPageId as getCanonicalPageIdImpl,
  parsePageId,
  idToUuid,
  uuidToId,
} from 'notion-utils'

import { inversePageUrlOverrides, navigationPageIds } from './config'
import { getBlockParent } from './get-block-parent'

function getParentPath(
  pageId: string,
  recordMap: ExtendedRecordMap,
): string | null {
  const currentBlock = recordMap.block[idToUuid(pageId)]?.value
  const navigationPageUuids = navigationPageIds.map(idToUuid)
  const parentBlock = getBlockParent(
    currentBlock,
    recordMap,
    (b) => navigationPageUuids.includes(b?.id)
  )
  const parentId = parentBlock?.id
  return parentId && inversePageUrlOverrides[uuidToId(parentId)]
}

export function getCanonicalPageId(
  pageId: string,
  recordMap: ExtendedRecordMap,
  { uuid = true }: { uuid?: boolean } = {}
): string | null {
  const cleanPageId = parsePageId(pageId, { uuid: false })
  if (!cleanPageId) {
    return null
  }

  const override = inversePageUrlOverrides[cleanPageId]
  if (override) {
    return override
  } else {
    const parentPath = getParentPath(cleanPageId, recordMap)
    const canonicalPageId = getCanonicalPageIdImpl(pageId, recordMap, {
      uuid
    })
    return parentPath? parentPath + '/' + canonicalPageId : canonicalPageId
  }
}
