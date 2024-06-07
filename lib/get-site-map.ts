import { getAllPagesInSpace, uuidToId, getPageProperty } from 'notion-utils'
import pMemoize from 'p-memoize'

import * as types from './types'
import { rootNotionPageId, rootNotionSpaceId, includeNotionIdInUrls, site } from './config'
import { getCanonicalPath } from './get-canonical-page-id'
import { notion } from './notion-api'

const uuid = !!includeNotionIdInUrls

export async function getSiteMap(): Promise<types.SiteMap> {
  const partialSiteMap = await getAllPages(
    rootNotionPageId,
    rootNotionSpaceId
  )

  return {
    site,
    ...partialSiteMap
  } as types.SiteMap
}

const MAX_COLLISION = 1000
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
    block.properties.canonical_page_path = getCanonicalPath(pageId, recordMap, {
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

  const duplicatedIdCounter = new Map()
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
      const canonicalPagePath = block.properties?.canonical_page_path
      if (!canonicalPagePath) {
        return map
      }
      let mappedPageId = canonicalPagePath
      for (let i = 0; i < MAX_COLLISION; ++i) {
        if (!duplicatedIdCounter.has(mappedPageId)) {
          break
        }
        const ordinal = duplicatedIdCounter.get(canonicalPagePath)
        duplicatedIdCounter.set(canonicalPagePath, ordinal + 1)
        mappedPageId = `${canonicalPagePath}-${ordinal}`
      }

      if (!duplicatedIdCounter.has(mappedPageId)) {
        duplicatedIdCounter.set(mappedPageId, 2)
        map[mappedPageId] = pageId
      } else {
        console.warn('error duplicate canonical page path', {
          canonicalPagePath: canonicalPagePath,
          pageId,
          existingPageId: map[canonicalPagePath]
        })
      }
      return map
    }, {})

  return {
    pageMap,
    canonicalPageMap
  }
}
