// Source: https://gist.github.com/loilo/ed43739361ec718129a15ae5d531095b

/**
 * Export all data from an IndexedDB database
 *
 * @param {IDBDatabase} idbDatabase The database to export from
 * @param {Array<string>} [excludeStores=[]] Array of store names to exclude from export
 * @return {Promise<string>}
 */
function exportToJson (idbDatabase, excludeStores = [], deleteIds = true) {
  return new Promise((resolve, reject) => {
    const exportObject = {}

    const storeNames = Array.from(idbDatabase.objectStoreNames).filter(
      storeName => !excludeStores.includes(storeName)
    )

    if (storeNames.length === 0) {
      resolve(JSON.stringify(exportObject))
    } else {
      const transaction = idbDatabase.transaction(storeNames, 'readonly')

      transaction.addEventListener('error', reject)

      for (const storeName of storeNames) {
        const allObjects = []
        transaction
          .objectStore(storeName)
          .openCursor()
          .addEventListener('success', event => {
            const cursor = event.target.result
            if (cursor) {
              const record = cursor.value

              // Skip siteConfigsOrder preference
              if (
                storeName === 'preferences' &&
                record.key === 'siteConfigsOrder'
              ) {
                cursor.continue()
                return
              }

              if (deleteIds && record && typeof record === 'object' && 'id' in record) {
                delete record.id
              }

              allObjects.push(record)
              cursor.continue()
            } else {
              // No more values, store is done
              exportObject[storeName] = allObjects

              // Last store was handled
              if (storeNames.length === Object.keys(exportObject).length) {
                resolve(JSON.stringify(exportObject))
              }
            }
          })
      }
    }
  })
}

/**
 * Import data from JSON into an IndexedDB database.
 * This does not delete any existing data from the database, so keys may clash.
 *
 * @param {IDBDatabase} idbDatabase Database to import into
 * @param {string}      json        Data to import, one key per object store
 * @return {Promise<object>} Information about the imported data
 */
function importFromJson (idbDatabase, json) {
  return new Promise((resolve, reject) => {
    const transaction = idbDatabase.transaction(
      idbDatabase.objectStoreNames,
      'readwrite'
    )
    transaction.addEventListener('error', reject)

    var importObject = JSON.parse(json)
    const importResults = {}
    let processedStores = 0
    const totalStores = Object.keys(importObject).filter(
      storeName =>
        Array.from(idbDatabase.objectStoreNames).includes(storeName) &&
        importObject[storeName].length > 0
    ).length

    if (totalStores === 0) {
      resolve({ success: true, imported: {} })
      return
    }

    for (const storeName of idbDatabase.objectStoreNames) {
      if (!importObject[storeName] || importObject[storeName].length === 0)
        continue

      importResults[storeName] = {
        count: 0,
        ids: []
      }

      const records = importObject[storeName]
      let processedRecords = 0

      for (const toAdd of records) {
        // Generate a new ID for each record
        if (!toAdd.id && storeName === 'siteConfigs') {
          toAdd.id = window.extensionStore.generateUUID()
        } else if (!toAdd.id && storeName === 'uploads') {
          toAdd.id = Date.now() + processedRecords // Add index to avoid collisions
        }

        // Use put for preferences to avoid constraint violations
        const method = storeName === 'preferences' ? 'put' : 'add'
        const request = transaction.objectStore(storeName)[method](toAdd)

        request.addEventListener('success', event => {
          importResults[storeName].ids.push(toAdd.id || event.target.result)
          importResults[storeName].count++

          processedRecords++
          if (processedRecords === records.length) {
            processedStores++
            if (processedStores === totalStores) {
              resolve({ success: true, imported: importResults })
            }
          }
        })

        request.addEventListener('error', event => {
          fpLogger.error(
            `Error importing record in ${storeName}`,
            event.target.error
          )
          processedRecords++
          if (processedRecords === records.length) {
            processedStores++
            if (processedStores === totalStores) {
              resolve({ success: true, imported: importResults })
            }
          }
        })
      }
    }
  })
}

/**
 * Clear a database
 *
 * @param {IDBDatabase} idbDatabase The database to delete all data from
 * @return {Promise<void>}
 */
function clearDatabase (idbDatabase) {
  return new Promise((resolve, reject) => {
    const transaction = idbDatabase.transaction(
      idbDatabase.objectStoreNames,
      'readwrite'
    )
    transaction.addEventListener('error', reject)

    let count = 0
    for (const storeName of idbDatabase.objectStoreNames) {
      transaction
        .objectStore(storeName)
        .clear()
        .addEventListener('success', () => {
          count++
          if (count === idbDatabase.objectStoreNames.length) {
            // Cleared all object stores
            resolve()
          }
        })
    }
  })
}

window.exportToJson = exportToJson
window.importFromJson = importFromJson
window.clearDatabase = clearDatabase
