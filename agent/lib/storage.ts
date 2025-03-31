import Keyv from '@keyvhq/core'
import KeyvFile from '@keyvhq/file'

const appDataPath = process.env.APP_DATA_PATH || './data'

let dataBase: Keyv
dataBase = new Keyv({store: new KeyvFile(`${appDataPath}/database.json`)});

let cache: Keyv
cache = new Keyv({store: new KeyvFile(`${appDataPath}/cache.json`)})

export { dataBase, cache }
