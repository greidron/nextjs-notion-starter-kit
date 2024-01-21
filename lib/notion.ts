import { createHash } from 'crypto'
import { ExtendedRecordMap, SearchParams, SearchResults } from 'notion-types'
import { mergeRecordMaps } from 'notion-utils'
import pMap from 'p-map'
import pMemoize from 'p-memoize'

import {
  isPreviewImageSupportEnabled,
  navigationLinks,
  navigationStyle
} from './config'
import { notion } from './notion-api'
import { getPreviewImageMap } from './preview-images'
import { RecordMapMeta } from './types'

const getNavigationLinkPages = pMemoize(
  async (): Promise<ExtendedRecordMap[]> => {
    const navigationLinkPageIds = (navigationLinks || [])
      .map((link) => link.pageId)
      .filter(Boolean)

    if (navigationStyle !== 'default' && navigationLinkPageIds.length) {
      return pMap(
        navigationLinkPageIds,
        async (navigationLinkPageId) =>
          notion.getPage(navigationLinkPageId, {
            chunkLimit: 1,
            fetchMissingBlocks: false,
            fetchCollections: false,
            signFileUrls: false
          }),
        {
          concurrency: 4
        }
      )
    }

    return []
  }
)

function recordMapHash(recordMap?: ExtendedRecordMap): string {
  return [
    recordMap?.block, recordMap?.collection_view, recordMap?.collection
  ].map((obj) => Object.keys(obj)).flat().filter(Boolean)
  .reduce(
    (acc, data) => {
      acc.update(data)
      return acc
    },
    createHash('sha1')
  )
  .digest('base64')
}

export async function getPage(
  pageId: string,
  {
    meta = false,
  }: {
    meta?: boolean
  } = {}
): Promise<ExtendedRecordMap & RecordMapMeta> {
  let recordMap = await notion.getPage(pageId)
  let recordMapMeta: RecordMapMeta | null = null

  if (meta) {
    recordMapMeta = {
      hash: recordMapHash(recordMap),
    }
  }

  if (navigationStyle !== 'default') {
    // ensure that any pages linked to in the custom navigation header have
    // their block info fully resolved in the page record map so we know
    // the page title, slug, etc.
    const navigationLinkRecordMaps = await getNavigationLinkPages()

    if (navigationLinkRecordMaps?.length) {
      recordMap = navigationLinkRecordMaps.reduce(
        (map, navigationLinkRecordMap) =>
          mergeRecordMaps(map, navigationLinkRecordMap),
        recordMap
      )
    }
  }

  if (isPreviewImageSupportEnabled) {
    const previewImageMap = await getPreviewImageMap(recordMap)
    ;(recordMap as any).preview_images = previewImageMap
  }

  return { ...recordMap, ...recordMapMeta }
}

export async function search(params: SearchParams): Promise<SearchResults> {
  return notion.search(params)
}
