import {
  type Block, type Collection, type ExtendedRecordMap,
  type SearchParams, type SearchResults,
} from 'notion-types'
import { idToUuid, uuidToId } from './utils'

import { getBlockParent } from './get-block-parent'

type SearchFunction = (params: SearchParams) => Promise<SearchResults>
type SearchFunctionEnhancer = (func: SearchFunction) => SearchFunction

function getPageIdPath(
  pageId: string,
  recordMap: ExtendedRecordMap
): Array<string> {
  const path = []
  let currentBlock: Block | Collection = recordMap.block[idToUuid(pageId)]?.value
  while (currentBlock) {
    path.push(currentBlock.id)
    currentBlock = getBlockParent(currentBlock, recordMap)
  }
  return path.filter(Boolean).map(uuidToId).reverse()
}

type StringAnyMap = { [key: string]: any }

function mergeMap(
  destMap: StringAnyMap,
  srcMap: StringAnyMap
): void {
  if (!srcMap) return
  for (const [key, value] of Object.entries(srcMap)) {
    if (key in destMap) continue
    destMap[key] = value
  }
}

function mergeRecordMap(
  destRecordMap: ExtendedRecordMap,
  srcRecordMap: ExtendedRecordMap
): void {
  mergeMap(destRecordMap.block, srcRecordMap.block)
  mergeMap(destRecordMap.collection, srcRecordMap.collection)
  mergeMap(destRecordMap.collection_view, srcRecordMap.collection_view)
}

export function withSearchScope(
  rootPageId: string | null,
  navigationPageIds: Array<string> | null,
  recordMap: ExtendedRecordMap
): SearchFunctionEnhancer {
  const targetPageIds = new Set<string>()
  if (navigationPageIds) {
    for (const navPageId of navigationPageIds) {
      const path = getPageIdPath(navPageId, recordMap)
      if (path.includes(rootPageId)) continue
      targetPageIds.add(uuidToId(navPageId))
    }
  }
  const rootPath = getPageIdPath(rootPageId, recordMap)
  if (rootPath.every(id => !targetPageIds.has(id))) {
    targetPageIds.add(rootPageId)
  }

  return (searchNotion: SearchFunction) => async (params: SearchParams) => {
    const searchTasks = []
    for (const navPageId of targetPageIds) {
      searchTasks.push(
        searchNotion({ ...params, ancestorId: navPageId })
      )
    }

    const searchResults = []
    let total = 0
    for (const searchTask of searchTasks) {
      try {
        const {
          results: subResults,
          total: subTotal,
          recordMap: subRecordMap,
        } = await searchTask
        searchResults.push(subResults)
        total += subTotal
        mergeRecordMap(recordMap, subRecordMap)
      } catch (err) {
        console.error(err, err.stack)
      }
    }

    const mergedSearchResults = searchResults.flat()
    const filteredSearchResults = mergedSearchResults.filter(
      (item) => getPageIdPath(item?.id, recordMap)?.some(id => targetPageIds.has(id))
    )
    return {
      recordMap,
      total: total + mergedSearchResults.length - filteredSearchResults.length,
      results: filteredSearchResults,
    }
  }
}

