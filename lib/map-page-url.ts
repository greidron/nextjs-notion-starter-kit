import { ExtendedRecordMap } from 'notion-types'
import { parsePageId, uuidToId } from 'notion-utils'

import { includeNotionIdInUrls } from './config'
import { getCanonicalPath } from './get-canonical-page-id'
import { Site } from './types'

// include UUIDs in page URLs during local development but not in production
// (they're nice for debugging and speed up local dev)
const uuid = !!includeNotionIdInUrls

export const mapPageUrl =
  (site: Site, recordMap: ExtendedRecordMap, searchParams: URLSearchParams) =>
  (pageId = '') => {
    const pageUuid = parsePageId(pageId, { uuid: true })

    if (uuidToId(pageUuid) === site.rootNotionPageId) {
      return createUrl('/', searchParams)
    } else {
      const canonicalPagePath = getCanonicalPath(
        pageUuid, recordMap,
        {
          uuid,
          navigationPageIds: site.navigationPageIds,
          inversePageUrlOverrides: site.inversePageUrlOverrides,
        }
      )
      return createUrl(`/${canonicalPagePath}`, searchParams)
    }
  }

export const getCanonicalPageUrl =
  (site: Site, recordMap: ExtendedRecordMap) => {
    const mapPageUrlFn = mapPageUrl(site, recordMap, new URLSearchParams())
    return (pageId = '') => {
      const pageUrl = mapPageUrlFn(pageId).replace(/\/+$/, '')
      return `https://${site.domain}${pageUrl}`
    }
  }

function createUrl(path: string, searchParams: URLSearchParams) {
  return [path, searchParams.toString()].filter(Boolean).join('?')
}
