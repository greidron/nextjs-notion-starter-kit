import { ExtendedRecordMap } from 'notion-types'
import { parsePageId, uuidToId } from 'notion-utils'

import * as acl from './acl'
import { environment, pageUrlAdditions, pageUrlOverrides, site } from './config'
import * as config from './config'
import { db } from './db'
import { getSiteMap, updateSiteMap } from './get-site-map'
import { getPage } from './notion'
import { template } from './template'
import { SiteMap, RecordMapMeta } from './types'

function getSiteMapUrl(siteMap: SiteMap, pageId: string) {
  return siteMap?.pageMap[pageId]?.block?.[pageId]?.value?.properties?.canonical_page_path
}

export async function resolveNotionPage(domain: string, path?: string) {
  let pageId: string
  let pageHash: string
  let recordMap: ExtendedRecordMap & RecordMapMeta
  let siteMap = await getSiteMap()

  if (path && path !== 'index') {
    // page ID from path
    pageId = parsePageId(path)
    if (pageId) {
      // redirect URL with page UUID
      const redirectUrl = getSiteMapUrl(siteMap, pageId)
      if (redirectUrl && redirectUrl != path) {
        return { redirectUrl }
      }
    }

    const cacheKey = `uri-to-page-id:${domain}:${environment}:${path}`
    let dbData: string
    try {
      dbData = await db.get(cacheKey)
      // check if the database has a cached mapping of this URI to page ID
      if (dbData) {
        ({ pageId, pageHash } = JSON.parse(dbData))
      }
    } catch (err) {
      // ignore redis errors
      console.warn(`redis error get "${cacheKey}"`, err.message, dbData)
    }

    if (pageId) {
      recordMap = await getPage(pageId, { meta: true })
    } else {
      // check if the site configuration provides an override or a fallback for
      // the page's URI
      if (!pageId) {
        const override =
          pageUrlOverrides[path] || pageUrlAdditions[path]
        if (override) {
          pageId = parsePageId(override)
        }
      }

      // handle mapping of user-friendly canonical page paths to Notion page IDs
      // e.g., /developer-x-entrepreneur versus /71201624b204481f862630ea25ce62fe
      if (!pageId) {
        pageId = siteMap?.canonicalPageMap[path]
      }

      if (pageId) {
        recordMap = await getPage(pageId, { meta: true })
      } else {
        // note: we're purposefully not caching URI to pageId mappings for 404s
        return {
          error: {
            message: `Not found "${path}"`,
            statusCode: 404
          }
        }
      }
    }

    if (pageHash !== recordMap.hash) {
      // update site map if page content is changed
      if (pageHash) {
        siteMap = await updateSiteMap(pageId)
      }
      try {
        // update the database mapping of URI to pageId
        const dbEntry = {
          pageId,
          pageHash: recordMap.hash,
        }
        await db.set(cacheKey, JSON.stringify(dbEntry))
      } catch (err) {
        console.warn(`DB error set "${cacheKey}"`, err.message)
      }
    }
  } else {
    pageId = site.rootNotionPageId
    recordMap = await getPage(pageId, { meta: true })
  }

  // resolve page icon & cover of collection view page
  const currentBlock = recordMap.block?.[pageId]?.value
  const collectionPointer = currentBlock?.format?.collection_pointer
  const collectionBlock = recordMap[collectionPointer?.table]?.[collectionPointer?.id]?.value
  if (currentBlock?.format && collectionBlock) {
    if (!currentBlock.format.page_icon) {
      currentBlock.format.page_icon = collectionBlock.icon
    }
    if (!currentBlock.format.page_cover) {
      currentBlock.format.page_cover = collectionBlock.cover
    }
  }

  // resolve duplicated page urls in current page
  const canonicalPageMap = siteMap?.canonicalPageMap
  const inversePageUrlOverrides = {...site.inversePageUrlOverrides}
  if (canonicalPageMap) {
    const targetPageUuids = new Set(recordMap.pageIds)
    Object.entries(canonicalPageMap).reduce((map, [path, uuid]) => {
      if (targetPageUuids.has(uuid)) {
        map[uuidToId(uuid)] = path
      }
      return map
    }, inversePageUrlOverrides)
  }
  const modifiedSite = {
    ...site,
    inversePageUrlOverrides,
    copyright: template(site.copyright, config),
  }
  const props = { site: modifiedSite, recordMap, pageId }
  return { ...props, ...(await acl.pageAcl(props)) }
}
