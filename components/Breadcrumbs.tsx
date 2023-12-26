import * as React from 'react'

import { Block, BasePageBlock, Collection, ExtendedRecordMap } from 'notion-types'
import { idToUuid, getBlockIcon, getBlockTitle } from 'notion-utils'
import { PageIcon, useNotionContext } from 'react-notion-x'
import cs from 'classnames'

import { rootNotionPageId, navigationLinks } from '@/lib/config'

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

function getBlockParentPage(block: Block, recordMap: ExtendedRecordMap): BasePageBlock | null {
  let currentBlock: Block | Collection = block
  while (currentBlock !== null) {
    const parentId: string = currentBlock.parent_id
    const parentTable = currentBlock.parent_table === 'collection'
      ? recordMap.collection : recordMap.block
    currentBlock = parentTable[parentId]?.value

    const blockType = (currentBlock as Block)?.type
    if (blockType === 'page' || blockType === 'collection_view_page') {
      return currentBlock as BasePageBlock
    }
  }
  return null
}

function getPageBreadcrumbs(
  recordMap: ExtendedRecordMap, activePageId: string): Array<any> {
  const rootPageId = rootNotionPageId && idToUuid(rootNotionPageId)
  const navigationPageIds = navigationLinks
    ?.map((link) => idToUuid(link.pageId))
    .filter(Boolean) ?? []
  if (rootPageId) {
    navigationPageIds.push(rootPageId)
  }

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

    if (navigationPageIds.includes(currentPageId)) {
      break
    }

    const parentBlock = getBlockParentPage(block, recordMap)
    currentPageId = parentBlock?.id
  }

  const rootBreadcrumb = getPageBreadcrumb(blockMap[rootPageId]?.value, recordMap)
  const lastPageId = breadcrumbs.slice(-1)[0]?.pageId
  
  if (rootBreadcrumb && lastPageId !== rootPageId) {
    breadcrumbs.push(rootBreadcrumb)
  }
  return breadcrumbs.reverse()
}

export const Breadcrumbs: React.FC<{
  block: Block
}> = ({ block }) => {
  const { recordMap, mapPageUrl, components } = useNotionContext()

  const breadcrumbs = React.useMemo(
      () => getPageBreadcrumbs(recordMap, block.id),
      [recordMap, block.id])

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
