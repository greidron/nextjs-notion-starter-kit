import { type ParsedUrlQuery } from 'node:querystring'

import { type ExtendedRecordMap, type PageMap } from 'notion-types'

export * from 'notion-types'

export interface RecordMapMeta {
  hash?: string
  pageIds?: string[]
}

export type NavigationStyle = 'default' | 'custom'

export interface NavigationLink {
  title: string
  pageId?: string
  url?: string
}

export interface PageError {
  message?: string
  statusCode: number
}

export interface PageProps {
  site?: Site
  recordMap?: ExtendedRecordMap
  pageId?: string
  error?: PageError
  redirectUrl?: string
}

export interface ExtendedTweetRecordMap extends ExtendedRecordMap {
  tweets: Record<string, any>
}

export interface Params extends ParsedUrlQuery {
  pageId: string[]
}

export interface SocialAccounts {
  twitter?: string
  mastodon?: string
  github?: string
  youtube?: string
  linkedin?: string
  newsletter?: string
  zhihu?: string
}

export interface Site {
  name: string
  domain: string

  rootNotionPageId: string
  rootNotionSpaceId: string

  // navigations
  navigationStyle: NavigationStyle
  navigationLinks?: Array<NavigationLink>
  navigationPageIds?: string[]
  inversePageUrlOverrides?: PageUrlOverridesInverseMap

  // default appearance
  defaultPageIcon?: string
  defaultPageCover?: string
  defaultPageCoverPosition?: number

  // settings
  html?: string
  fontFamily?: string
  darkMode?: boolean
  previewImages?: boolean
  isSearchEnabled?: boolean

  // opengraph metadata
  description?: string
  image?: string

  author?: string
  copyright?: string
  socialAccounts?: SocialAccounts
}

export interface SiteMap {
  site: Site
  pageMap: PageMap
  canonicalPageMap: CanonicalPageMap
}

export interface CanonicalPageMap {
  [canonicalPageId: string]: string
}

export interface PageUrlOverridesMap {
  // maps from a URL path to the notion page id the page should be resolved to
  // (this overrides the built-in URL path generation for these pages)
  [pagePath: string]: string
}

export interface PageUrlOverridesInverseMap {
  // maps from a notion page id to the URL path the page should be resolved to
  // (this overrides the built-in URL path generation for these pages)
  [pageId: string]: string
}

export interface NotionPageInfo {
  pageId: string
  title: string
  image: string
  imageObjectPosition: string
  author: string
  authorImage: string
  detail: string
}
