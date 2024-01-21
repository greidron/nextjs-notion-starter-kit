import { getAllPagesInSpace, uuidToId, getPageProperty } from 'notion-utils'
import pMemoize from 'p-memoize'

import * as config from './config'
import * as types from './types'
import { includeNotionIdInUrls } from './config'
import { getCanonicalPageId } from './get-canonical-page-id'
import { notion } from './notion-api'

const uuid = !!includeNotionIdInUrls

export async function getSiteMap(): Promise<types.SiteMap> {
  const partialSiteMap = await getAllPages(
    config.rootNotionPageId,
    config.rootNotionSpaceId
  )

  return {
    site: config.site,
    ...partialSiteMap
  } as types.SiteMap
}

const ALL_PAGES_KEY = Symbol("AllPages")
const pageCache = new Map()

const getPageImpl = async (pageId: string, ...args) => {
  console.log('\nnotion getPage', uuidToId(pageId))
  const recordMap = await notion.getPage(pageId, ...args)
  // calculate canonical page ID in advance
  const block = recordMap.block[pageId]?.value
  if (getPageProperty<boolean|null>('Public', block, recordMap) ?? true) {
    if (!block.properties) {
      block.properties = {}
    }
    block.properties.canonical_page_id = getCanonicalPageId(pageId, recordMap, {
      uuid
    })
  }
  return recordMap
}

export function updateSiteMap(pageId: string): Promise<types.SiteMap> {
  pageCache.delete(pageId)
  pageCache.delete(ALL_PAGES_KEY)
  return getSiteMap()
}

const getPage = pMemoize(getPageImpl, {
  cacheKey: ([pageId]) => (pageId),
  cache: pageCache,
})

const getAllPages = pMemoize(getAllPagesImpl, {
  cacheKey: () => (ALL_PAGES_KEY),
  cache: pageCache,
})

async function getAllPagesImpl(
  rootNotionPageId: string,
  rootNotionSpaceId: string
): Promise<Partial<types.SiteMap>> {
  const pageMap = await getAllPagesInSpace(
    rootNotionPageId,
    rootNotionSpaceId,
    getPage
  )

  const canonicalPageMap = Object.keys(pageMap)
    .map((pageId) => {
      const recordMap = pageMap[pageId]
      if (!recordMap) {
        throw new Error(`Error loading page "${pageId}"`)
      }
      const block = recordMap.block[pageId]?.value
      if (!block) {
        return null
      }
      return block
    })
    .filter(Boolean)
    .sort((lhs, rhs) => ((lhs.created_time ?? 0) - (rhs.created_time ?? 0)))
    .reduce((map, block) => {
      const pageId = block.id
      const canonicalPageId = block.properties?.canonical_page_id
      if (!canonicalPageId) {
        return map
      }
      if (map[canonicalPageId]) {
        // you can have multiple pages in different collections that have the same id
        // TODO: we may want to error if neither entry is a collection page
        console.warn('error duplicate canonical page id', {
          canonicalPageId,
          pageId,
          existingPageId: map[canonicalPageId]
        })

        return map
      } else {
        return {
          ...map,
          [canonicalPageId]: pageId
        }
      }
    }, {})

  return {
    pageMap,
    canonicalPageMap
  }
}
