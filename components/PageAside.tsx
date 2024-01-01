import * as React from 'react'

import { Block, ExtendedRecordMap } from 'notion-types'

import { getPageTweet } from '@/lib/get-page-tweet'
import { SocialAccounts } from '@/lib/types'

import { PageActions } from './PageActions'
import { PageSocial } from './PageSocial'

export const PageAside: React.FC<{
  block: Block
  recordMap: ExtendedRecordMap
  isBlogPost: boolean
  author?: string
  socialAccounts?: SocialAccounts
}> = ({ block, recordMap, isBlogPost, author, socialAccounts }) => {
  if (!block) {
    return null
  }

  // only display comments and page actions on blog post pages
  if (isBlogPost) {
    const tweet = getPageTweet(block, recordMap)
    if (!tweet) {
      return null
    }

    return <PageActions tweet={tweet} />
  }

  return <PageSocial author={author} socialAccounts={socialAccounts} />
}
