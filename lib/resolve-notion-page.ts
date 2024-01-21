import { ExtendedRecordMap } from 'notion-types'
import { parsePageId } from 'notion-utils'

import * as acl from './acl'
import { environment, pageUrlAdditions, pageUrlOverrides, site } from './config'
import * as config from './config'
import { db } from './db'
import { getSiteMap, updateSiteMap } from './get-site-map'
import { getPage } from './notion'
import { template } from './template'
import { RecordMapMeta } from './types'

export async function resolveNotionPage(domain: string, rawPageId?: string) {
  let pageId: string
  let pageHash: string
  let recordMap: ExtendedRecordMap & RecordMapMeta

  if (rawPageId && rawPageId !== 'index') {
    const cacheKey = `uri-to-page-id:${domain}:${environment}:${rawPageId}`
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

      if (pageHash !== recordMap.hash) {
        // update site map if page content is changed
        if (pageHash) {
          await updateSiteMap(pageId)
        }
        try {
          // update the database mapping of URI to pageId
          const dbEntry = {
            pageId,
            pageHash: recordMap.hash,
          }
          await db.set(cacheKey, JSON.stringify(dbEntry))
        } catch (err) {
          // ignore redis errors
          console.warn(`redis error set "${cacheKey}"`, err.message)
        }
      }
    } else {
      // page ID from raw page ID
      pageId = parsePageId(rawPageId)

      // check if the site configuration provides an override or a fallback for
      // the page's URI
      if (!pageId) {
        const override =
          pageUrlOverrides[rawPageId] || pageUrlAdditions[rawPageId]
        if (override) {
          pageId = parsePageId(override)
        }
      }

      // handle mapping of user-friendly canonical page paths to Notion page IDs
      // e.g., /developer-x-entrepreneur versus /71201624b204481f862630ea25ce62fe
      if (!pageId) {
        const siteMap = await getSiteMap()
        pageId = siteMap?.canonicalPageMap[rawPageId]
      }

      if (pageId) {
        recordMap = await getPage(pageId, { meta: true })

        try {
          // update the database mapping of URI to pageId
          const dbEntry = {
            pageId,
            pageHash: recordMap.hash,
          }
          await db.set(cacheKey, JSON.stringify(dbEntry))
        } catch (err) {
          // ignore redis errors
          console.warn(`redis error set "${cacheKey}"`, err.message)
        }
      } else {
        // note: we're purposefully not caching URI to pageId mappings for 404s
        return {
          error: {
            message: `Not found "${rawPageId}"`,
            statusCode: 404
          }
        }
      }
    }
  } else {
    pageId = site.rootNotionPageId
    recordMap = await getPage(pageId, { meta: true })
  }

  const modifiedSite = {
    ...site,
    copyright: template(site.copyright, config),
  }
  const props = { site: modifiedSite, recordMap, pageId }
  return { ...props, ...(await acl.pageAcl(props)) }
}
