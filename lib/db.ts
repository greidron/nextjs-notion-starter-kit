import Keyv from '@keyvhq/core'
import KeyvRedis from '@keyvhq/redis'
import { KeyvLru } from 'keyv-lru'

import {
  isLruEnabled,   isRedisEnabled, lruMax, lruTtl,
redisNamespace, redisUrl,
} from './config'

let db: Keyv
if (isLruEnabled) {
  const keyvLru = new KeyvLru({ max: lruMax, ttl: lruTtl })
  db = new Keyv({ store: keyvLru })
} else if (isRedisEnabled) {
  const keyvRedis = new KeyvRedis(redisUrl)
  db = new Keyv({ store: keyvRedis, namespace: redisNamespace || undefined })
} else {
  db = new Keyv()
}

export { db }
