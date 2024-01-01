import * as React from 'react'
import { GetServerSideProps } from 'next'

import { NotionPage } from '@/components/NotionPage'
import { domain } from '@/lib/config'
import { resolveNotionPage } from '@/lib/resolve-notion-page'
import { PageProps, Params } from '@/lib/types'

export const getServerSideProps: GetServerSideProps<PageProps, Params> = async (
  context
) => {
  const pageId = context.params.pageId
  const rawPageId = Array.isArray(pageId)? (pageId as string[]).join('/') : pageId as string

  try {
    return { props: await resolveNotionPage(domain, rawPageId) }
  } catch (err) {
    console.error('page error', domain, rawPageId, err)

    // we don't want to publish the error version of this page, so
    // let next.js know explicitly that incremental SSG failed
    throw err
  }
}

export default function NotionDomainDynamicPage(props) {
  return <NotionPage {...props} />
}
