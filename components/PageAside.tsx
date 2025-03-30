import { type Block, type ExtendedRecordMap } from 'notion-types'

import { getPageTweet } from '@/lib/get-page-tweet'
import { type SocialAccounts } from '@/lib/types'

import { PageActions } from './PageActions'
import { PageSocial } from './PageSocial'

export function PageAside({
  block,
  recordMap,
  isBlogPost,
  author,
  socialAccounts
}: {
  block: Block
  recordMap: ExtendedRecordMap
  isBlogPost: boolean
  author?: string
  socialAccounts?: SocialAccounts
}) {
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
