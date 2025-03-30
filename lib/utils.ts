import { 
  idToUuid as idToUuidInternal, 
  uuidToId as uuidToIdInternal
} from 'notion-utils'

export function idToUuid(id : string) {
  return id?.includes('-')? id : idToUuidInternal(id)
}

export function uuidToId(uuid : string) {
  return uuid?.includes('-')? uuidToIdInternal(uuid) : uuid
}
