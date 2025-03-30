import { type Block, type Collection, type ExtendedRecordMap } from 'notion-types'

export type BlockPredicate = (b: Block | Collection) => boolean

export function getBlockParent(
  block: Block | Collection,
  recordMap: ExtendedRecordMap,
  predicate: BlockPredicate = () => (true)
): Block | Collection | null {
  let currentBlock: Block | Collection = block
  while (currentBlock) {
    const parentId: string = currentBlock.parent_id
    const parentTable = currentBlock.parent_table === 'collection'
      ? recordMap.collection : recordMap.block
    currentBlock = parentTable[parentId]?.value

    if (predicate(currentBlock) === true) {
      return currentBlock
    }
  }
  return null
}

export function isBlockType(types: Array<string>): BlockPredicate {
  return (b: Block) => types.includes(b?.type)
}

export function isPage(): BlockPredicate {
  return isBlockType(['page', 'collection_view_page'])
}
