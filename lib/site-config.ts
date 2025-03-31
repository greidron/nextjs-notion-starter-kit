import type * as types from './types'

export interface SiteConfig {
  rootNotionPageId: string
  rootNotionSpaceId?: string

  name: string
  domain: string
  author: string
  description?: string
  language?: string

  twitter?: string
  github?: string
  linkedin?: string
  newsletter?: string
  youtube?: string
  zhihu?: string
  mastodon?: string

  defaultPageIcon?: string | null
  defaultPageCover?: string | null
  defaultPageCoverPosition?: number | null

  isPreviewImageSupportEnabled?: boolean
  isTweetEmbedSupportEnabled?: boolean
  isRedisEnabled?: boolean
  isLruEnabled?: boolean
  lruMax?: number | null
  lruTtl?: number | null
  isSearchEnabled?: boolean

  includeNotionIdInUrls?: boolean
  pageUrlOverrides?: types.PageUrlOverridesMap
  pageUrlAdditions?: types.PageUrlOverridesMap

  navigationStyle?: types.NavigationStyle
  navigationLinks?: Array<types.NavigationLink>

  nextAuthSecret?: string | null

  openAiApiKey?: string | null

  githubAppClientId?: string | null
  githubAppClientSecret?: string | null

  allowedUserId?: string[] | null
}

export const siteConfig = (config: SiteConfig): SiteConfig => {
  return config
}
