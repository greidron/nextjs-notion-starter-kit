import { type ExtendedRecordMap } from 'notion-types'
import {
  getBlockTitle,
  getPageProperty,
  idToUuid,
  parsePageId,
  uuidToId,
} from 'notion-utils'
import unidecode from 'unidecode'

import {
  inversePageUrlOverrides as defaultInversePageUrlOverrides,
  navigationPageIds as defaultNavigationPageIds,
} from './config'
import { getBlockParent } from './get-block-parent'
import { type PageUrlOverridesInverseMap } from './types'

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

function normalizeTitle(title?: string | null): string {
  return unidecode(title || '')
    .replaceAll(' ', '-')
    .replaceAll(
      /[^\dA-Za-z\u3000-\u303F\u3041-\u3096\u30A1-\u30FC\u4E00-\u9FFF-]/g,
      ''
    )
    .replaceAll('--', '-')
    .replace(/-$/, '')
    .replace(/^-/, '')
    .trim()
    .toLowerCase()
}

export function getCanonicalPageId(
  pageId: string,
  recordMap: ExtendedRecordMap,
  {
    uuid = true,
  }: {
    uuid?: boolean,
  } = {}
): string | null {
  if (!pageId || !recordMap) return null

  const id = uuidToId(pageId)
  const block = recordMap.block[pageId]?.value

  if (block) {
    const slug =
      (getPageProperty('slug', block, recordMap) as string | null) ||
      (getPageProperty('Slug', block, recordMap) as string | null) ||
      normalizeTitle(getBlockTitle(block, recordMap))

    if (slug) {
      if (uuid) {
        return `${slug}-${id}`
      } else {
        return slug
      }
    }
  }

  return id
}

export function getCanonicalPath(
  pageId: string,
  recordMap: ExtendedRecordMap,
  {
    uuid = true,
    navigationPageIds = defaultNavigationPageIds,
    inversePageUrlOverrides = defaultInversePageUrlOverrides,
  }: {
    uuid?: boolean,
    navigationPageIds?: string[],
    inversePageUrlOverrides?: PageUrlOverridesInverseMap,
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
    const canonicalPageId = getCanonicalPageId(pageId, recordMap, { uuid })
    return parentPath? parentPath + '/' + canonicalPageId : canonicalPageId
  }
}
