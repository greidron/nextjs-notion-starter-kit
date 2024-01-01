import * as React from 'react'

import { Block, BasePageBlock, ExtendedRecordMap } from 'notion-types'
import { idToUuid, getBlockIcon, getBlockTitle } from 'notion-utils'
import { PageIcon, useNotionContext } from 'react-notion-x'
import cs from 'classnames'

import { getBlockParent, isPage } from '@/lib/get-block-parent'

function getPageBreadcrumb(block: Block, recordMap: ExtendedRecordMap): any | null {
  if (!block) {
    return null
  }

  const title = getBlockTitle(block, recordMap)
  const icon = getBlockIcon(block, recordMap)
  if (!title && !icon) return null
  return {
      block,
      pageId: block.id,
      title,
      icon,
  }
}

function getPageBreadcrumbs(
  rootPageUuid: string,
  navigationPageUuids: string[],
  recordMap: ExtendedRecordMap,
  activePageId: string
): Array<any> {
  const blockMap = recordMap.block
  const breadcrumbs = []
  let currentPageId = activePageId
  while (currentPageId) {
    const block = blockMap[currentPageId]?.value
    if (!block) {
      break
    }
    const breadcrumb = getPageBreadcrumb(block, recordMap)
    breadcrumb.active = currentPageId === activePageId
    breadcrumbs.push(breadcrumb)

    if (navigationPageUuids.includes(currentPageId)) {
      break
    }

    const parentBlock = getBlockParent(block, recordMap, isPage()) as BasePageBlock
    currentPageId = parentBlock?.id
  }

  const rootBreadcrumb = getPageBreadcrumb(blockMap[rootPageUuid]?.value, recordMap)
  const lastPageId = breadcrumbs.slice(-1)[0]?.pageId
  
  if (rootBreadcrumb && lastPageId !== rootPageUuid) {
    breadcrumbs.push(rootBreadcrumb)
  }
  return breadcrumbs.reverse()
}

export const Breadcrumbs: React.FC<{
  block: Block,
  rootPageId: string,
  navigationPageIds?: string[]
}> = ({ block, rootPageId, navigationPageIds }) => {
  const { recordMap, mapPageUrl, components } = useNotionContext()
  const breadcrumbs = React.useMemo(
      () => {
        const rootPageUuid = rootPageId && idToUuid(rootPageId)
        const navigationPageUuids = navigationPageIds?.map(idToUuid) ?? []
        if (rootPageUuid) {
          navigationPageUuids.push(rootPageUuid)
        }
        return getPageBreadcrumbs(
          rootPageUuid, navigationPageUuids, recordMap, block.id)
      },
      [recordMap, block.id, rootPageId, navigationPageIds])

  return (
    <div className='breadcrumbs' key='breadcrumbs'>
      {breadcrumbs?.map((breadcrumb, index: number) => {
        if (!breadcrumb) {
          return null
        }

        const pageLinkProps: any = {}
        const componentMap = {
          pageLink: components.PageLink
        }

        if (breadcrumb.active) {
          componentMap.pageLink = (props) => <div {...props} />
        } else {
          pageLinkProps.href = mapPageUrl(breadcrumb.pageId)
        }

        return (
          <React.Fragment key={breadcrumb.pageId}>
            <componentMap.pageLink
              className={cs('breadcrumb', breadcrumb.active && 'active')}
              {...pageLinkProps}
            >
              {breadcrumb.icon && (
                <PageIcon className='icon' block={breadcrumb.block} />
              )}

              {breadcrumb.title && (
                <span className='title'>{breadcrumb.title}</span>
              )}
            </componentMap.pageLink>

            {index < breadcrumbs.length - 1 && (
              <span className='spacer'>/</span>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
