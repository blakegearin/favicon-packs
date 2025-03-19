fpLogger.info('store.js loaded')

const DB_NAME = 'faviconPacksData'
const DB_VERSION = 1
const STORES = {
  icons: 'icons',
  preferences: 'preferences',
  siteConfigs: 'siteConfigs',
  uploads: 'uploads'
}

function capitalize (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

class ExtensionStore {
  constructor () {
    this.db = null
    this.initializationPromise = null
  }

  getDatabase () {
    fpLogger.debug('getDatabase()')
    return this.db
  }

  generateUUID () {
    fpLogger.verbose('generateUUID()')

    const randomValues = new Uint8Array(16)
    crypto.getRandomValues(randomValues)

    randomValues[6] = (randomValues[6] & 0x0f) | 0x40
    randomValues[8] = (randomValues[8] & 0x3f) | 0x80

    const hexArray = Array.from(randomValues).map(b =>
      b.toString(16).padStart(2, '0')
    )

    return [
      hexArray.slice(0, 4).join(''),
      hexArray.slice(4, 6).join(''),
      hexArray.slice(6, 8).join(''),
      hexArray.slice(8, 10).join(''),
      hexArray.slice(10, 16).join('')
    ].join('-')
  }

  async initialize () {
    fpLogger.verbose('initialize()')

    if (this.initializationPromise) return this.initializationPromise

    if (this.db) return Promise.resolve()

    this.initializationPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)

      request.onsuccess = event => {
        this.db = event.target.result
        resolve()
      }

      request.onupgradeneeded = async event => {
        const database = event.target.result
        const existingStoreNames = Array.from(database.objectStoreNames)

        if (!existingStoreNames.includes(STORES.icons)) {
          const iconsStore = database.createObjectStore(STORES.icons, {
            keyPath: 'id'
          })

          iconsStore.createIndex(
            'iconPackNameAndVersion',
            ['iconPackName', 'iconPackVersion'],
            { unique: false }
          )
        }

        if (!existingStoreNames.includes(STORES.siteConfigs)) {
          const siteConfigsStore = database.createObjectStore(
            STORES.siteConfigs,
            { keyPath: 'id' }
          )
          siteConfigsStore.createIndex('active', 'active', { unique: false })
        }

        if (!existingStoreNames.includes(STORES.uploads)) {
          database.createObjectStore(STORES.uploads, { keyPath: 'id' })
        }

        if (!existingStoreNames.includes(STORES.preferences)) {
          const preferencesStore = database.createObjectStore(
            STORES.preferences,
            { keyPath: 'key' }
          )

          // Initialize default preferences
          const defaultPreferences = [
            { key: 'siteConfigsOrder', value: [] },
            { key: 'lightThemeEnabled', value: true },
            { key: 'darkThemeEnabled', value: true },
            { key: 'lightThemeDefaultColor', value: '#333333' },
            { key: 'darkThemeDefaultColor', value: '#cccccc' },
            { key: 'anyThemeDefaultColor', value: '#808080' },
            { key: 'importPriority', value: 'lowest-priority' },
            { key: 'toolbarLogo', value: 'standard' }
          ]

          // Add all default preferences to the store
          for (const preference of defaultPreferences) {
            preferencesStore.add(preference)
          }
        }

        // We don't resolve here, as onsuccess will be called after
      }
    })

    return this.initializationPromise
  }

  // Ensure database is initialized before any operation
  async ensureInitialized () {
    if (!this.db) {
      await this.initialize()
    }
    if (!this.db) {
      throw new Error('Failed to initialize database')
    }
    return this.db
  }

  async fetchIconsMetadata (metadataUrl) {
    fpLogger.verbose('fetchIconsMetadata()')
    await this.ensureInitialized()

    let responseText

    try {
      const response = await fetch(metadataUrl)
      fpLogger.verbose('response', response)

      if (!response.ok) throw new Error('Network response was not ok')

      responseText = await response.text()
    } catch (error) {
      fpLogger.error('error ', error)
    }

    const parsedResponse = JSON.parse(responseText)
    fpLogger.verbose('parsedResponse', parsedResponse)

    let iconsMetadata = parsedResponse
    fpLogger.verbose('iconsMetadata', iconsMetadata)

    if (parsedResponse?.icons) {
      const iconObjects = {}

      if (Array.isArray(parsedResponse.icons)) {
        // Ionicons
        for (const icon of parsedResponse.icons) {
          const { name, tags } = icon
          iconObjects[name] = tags
        }
      } else {
        // Tabler
        for (const iconMetadata of Object.values(parsedResponse)) {
          const { name, tags, category } = iconMetadata

          const tagsArray = tags || []
          tagsArray.push(category.toLowerCase())

          iconObjects[name] = tagsArray
        }
      }

      iconsMetadata = iconObjects
    }

    fpLogger.verbose('iconsMetadata', iconsMetadata)
    return iconsMetadata || null
  }

  async downloadSvgIconsFromUrl (iconPack, versionMetadata, url, iconsMetadata) {
    fpLogger.verbose('downloadSvgIconsFromUrl()')
    await this.ensureInitialized()

    const response = await fetch(
      url.replaceAll('{VERSION}', versionMetadata.name)
    )
    fpLogger.verbose('response', response)

    if (!response.ok) throw new Error('Network response was not ok')

    const responseString = await response.text()
    fpLogger.verbose('responseString', responseString)

    const fileType = response.headers.get('content-type').split(';')[0]
    fpLogger.debug('fileType', fileType)

    const buildIconId = (iconPack, iconName) =>
      `${iconPack.name}-${versionMetadata.name}-${iconName}`

    let iconCount = 0

    if (fileType === 'text/plain' || fileType === 'image/svg+xml') {
      const saveIconFromSymbol = async (symbol, iconPack) => {
        fpLogger.verbose('saveIconFromSymbol', saveIconFromSymbol)

        const iconName = symbol.id.replace('tabler-', '')
        const iconId = buildIconId(iconPack, iconName)

        symbol.id = iconId

        const iconTags = iconsMetadata[iconName]
        // symbol.setAttribute("tags", iconTags.join(" "));

        const iconStyle = iconPack.styles.find(style => {
          return style.filter.test(iconName)
        }).name

        const icon = {
          id: iconId,
          iconPackName: iconPack.name,
          iconPackVersion: versionMetadata.name,
          name: iconName,
          style: iconStyle,
          tags: iconTags,
          symbol: symbol.outerHTML
        }

        await window.extensionStore.addIcon(icon)
        iconCount++
      }

      const parser = new window.DOMParser()

      // jsDelivr Docs: https://www.jsdelivr.com/documentation#id-restrictions
      if (fileType === 'text/plain') {
        const htmlDoc = parser.parseFromString(responseString, 'text/html')
        const htmlElement = htmlDoc.documentElement
        fpLogger.verbose('htmlElement', htmlElement)

        const svgElements = htmlElement.querySelectorAll('a > svg')

        for await (const svgElement of svgElements) {
          svgElement.setAttribute('viewBox', '0 0 512 512')

          const symbolId = svgElement.children[0].getAttribute('href')

          const blockList = versionMetadata.blockList || []
          if (blockList.includes(symbolId.replaceAll('#', ''))) continue

          const symbol = htmlElement.querySelector(symbolId)
          await saveIconFromSymbol(symbol, iconPack)
        }
      } else if (fileType === 'image/svg+xml') {
        const svgDoc = parser.parseFromString(responseString, fileType)
        const symbols = svgDoc.querySelectorAll('symbol')

        for await (const symbol of symbols) {
          symbol.classList.add(iconPack.name)
          if (versionMetadata.symbolViewBox)
            symbol.setAttribute('viewBox', versionMetadata.symbolViewBox)
          await saveIconFromSymbol(symbol, iconPack)
        }
      }
    } else if (fileType === 'application/json') {
      const iconsObject = JSON.parse(responseString)
      fpLogger.debug('iconsObject', iconsObject)

      const iconsObjectEntries = Object.entries(iconsObject)
      for (const [originalIconName, iconMetadata] of iconsObjectEntries) {
        fpLogger.verbose('originalIconName', originalIconName)

        const iconTags = iconMetadata?.search?.terms || []
        iconTags.push(originalIconName)

        const iconStyles = iconMetadata?.svgs?.classic
        fpLogger.debug('iconStyles', iconStyles)

        const iconStylesEntries = Object.entries(iconStyles)
        for (const [iconStyle, iconStyleMetadata] of iconStylesEntries) {
          const iconName = `${originalIconName}-${iconStyle}`
          const iconId = buildIconId(iconPack, iconName)

          // Convert svg to symbol; crude but simple & effective
          const symbolString = iconStyleMetadata.raw
            .replace('<svg', `<symbol id="${iconId}" class="${iconPack.name}"`)
            .replace('svg>', 'symbol>')

          const icon = {
            id: iconId,
            iconPackName: iconPack.name,
            iconPackVersion: versionMetadata.name,
            name: iconName,
            style: capitalize(iconStyle),
            tags: iconTags,
            symbol: symbolString
          }

          fpLogger.debug('icon', icon)

          await window.extensionStore.addIcon(icon)
          iconCount++
        }
      }
    }

    return iconCount
  }

  async downloadIconPackVersion (iconPack, versionMetadata) {
    fpLogger.debug('downloadIconPackVersion()')
    await this.ensureInitialized()

    const iconsMetadata = iconPack.metadataUrl
      ? await this.fetchIconsMetadata(
          iconPack.metadataUrl.replaceAll('{VERSION}', versionMetadata.name)
        )
      : null

    fpLogger.verbose('iconsMetadata', iconsMetadata)

    let iconCount = 0

    if (Array.isArray(iconPack.svgUrl)) {
      for (const url of iconPack.svgUrl) {
        iconCount += await this.downloadSvgIconsFromUrl(
          iconPack,
          versionMetadata,
          url,
          iconsMetadata
        )
      }
    } else {
      iconCount = await this.downloadSvgIconsFromUrl(
        iconPack,
        versionMetadata,
        iconPack.svgUrl,
        iconsMetadata
      )
    }

    return iconCount
  }

  async deleteIconsByIconPackVersion (iconPackName, iconPackVersion) {
    fpLogger.debug('deleteIconsByIconPackVersion()')
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.icons], 'readwrite')
      const store = transaction.objectStore(STORES.icons)
      let deletedCount = 0

      // Use a cursor to iterate through all records and delete matching ones
      const request = store.openCursor()

      request.onsuccess = event => {
        const cursor = event.target.result
        if (cursor) {
          const record = cursor.value
          if (
            record.iconPackName === iconPackName &&
            record.iconPackVersion === iconPackVersion
          ) {
            // Delete this record
            cursor.delete()
            deletedCount++
          }
          cursor.continue()
        } else {
          resolve(deletedCount)
        }
      }

      request.onerror = () => reject(request.error)

      transaction.oncomplete = () => {
        fpLogger.quiet(
          `Deleted ${deletedCount} icons from ${iconPackName} ${iconPackVersion}`
        )
        resolve(deletedCount)
      }

      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getIconCountByIconPackVersion (iconPackName, iconPackVersion) {
    fpLogger.debug('getIconCountByIconPackVersion()')
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.icons], 'readonly')
      const store = transaction.objectStore(STORES.icons)

      const index = store.index('iconPackNameAndVersion')
      const keyRange = window.IDBKeyRange.only([iconPackName, iconPackVersion])

      const countRequest = index.count(keyRange)

      countRequest.onsuccess = () => {
        resolve(countRequest.result)
      }

      countRequest.onerror = () => reject(countRequest.error)
    })
  }

  getIconPacks () {
    fpLogger.verbose('getIconPacks()')

    return [
      {
        name: 'Ionicons',
        homepageUrl: 'https://ionic.io/ionicons',
        changelogUrl:
          'https://github.com/ionic-team/ionicons/blob/main/CHANGELOG.md',
        svgUrl:
          'https://cdn.jsdelivr.net/npm/ionicons@{VERSION}/dist/cheatsheet.html',
        metadataUrl:
          'https://cdn.jsdelivr.net/npm/ionicons@{VERSION}/dist/ionicons.json',
        styles: [
          {
            name: 'Outline',
            filter: /-outline/
          },
          {
            name: 'Filled',
            filter: /^(?!.*-outline)(?!.*-sharp).*$/ // Not containing -outline or -sharp
          },
          {
            name: 'Sharp',
            filter: /-sharp/
          }
        ],
        versions: [
          // Fix PR: https://github.com/ionic-team/ionicons/pull/1433
          {
            name: '7.4.0',
            blockList: [
              'chevron-expand',
              'chevron-expand-outline',
              'chevron-expand-sharp',
              'logo-behance',
              'logo-bitbucket',
              'logo-docker',
              'logo-edge',
              'logo-facebook',
              'logo-npm',
              'logo-paypal',
              'logo-soundcloud',
              'logo-venmo'
            ]
          }
        ]
      },
      {
        name: 'Font_Awesome',
        homepageUrl: 'https://fontawesome.com',
        changelogUrl: 'https://fontawesome.com/changelog',
        svgUrl:
          'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@{VERSION}/metadata/icon-families.json',
        styles: [
          {
            name: 'Regular',
            filter: /-regular/
          },
          {
            name: 'Solid',
            filter: /-solid/
          },
          {
            name: 'Brands',
            filter: /-brand/
          }
        ],
        versions: [{ name: '6.7.2' }]
      },
      {
        name: 'Lucide',
        homepageUrl: 'https://lucide.dev',
        changelogUrl: 'https://github.com/lucide-icons/lucide/releases',
        svgUrl:
          'https://cdn.jsdelivr.net/npm/lucide-static@{VERSION}/sprite.svg',
        metadataUrl:
          'https://cdn.jsdelivr.net/npm/lucide-static@{VERSION}/tags.json',
        styles: [
          {
            name: 'Regular',
            filter: /.*/
          }
        ],
        versions: [
          {
            name: '0.477.0',
            // Issue: https://github.com/lucide-icons/lucide/issues/2768
            symbolViewBox: '0 0 24 24'
          }
        ]
      },
      {
        name: 'Tabler',
        homepageUrl: 'https://tabler.io/icons',
        changelogUrl: 'https://tabler.io/changelog',
        svgUrl: [
          'https://cdn.jsdelivr.net/npm/@tabler/icons-sprite@{VERSION}/dist/tabler-sprite.svg',
          'https://cdn.jsdelivr.net/npm/@tabler/icons-sprite@{VERSION}/dist/tabler-sprite-filled.svg'
        ],
        metadataUrl:
          'https://cdn.jsdelivr.net/npm/@tabler/icons@{VERSION}/icons.json',
        styles: [
          {
            name: 'Outline',
            filter: /^(?!filled-)/ // Not starting with filled-
          },
          {
            name: 'Filled',
            filter: /^filled-/
          }
        ],
        versions: [{ name: '3.30.0' }]
      }
    ]
  }

  checkAnyThemeEnabled () {
    fpLogger.debug('checkAnyThemeEnabled()')

    const lightThemeHidden =
      document.documentElement.style.getPropertyValue(
        '--light-theme-display'
      ) === 'none'
    const darkThemeHidden =
      document.documentElement.style.getPropertyValue(
        '--dark-theme-display'
      ) === 'none'

    const anyThemeEnabled = lightThemeHidden && darkThemeHidden

    document.documentElement.style.setProperty(
      '--any-theme-display',
      anyThemeEnabled ? 'table-cell' : 'none'
    )

    const anyThemeToggleId = '#any-theme-switch'
    const toggleElement = document.querySelector(anyThemeToggleId)
    if (toggleElement) toggleElement.checked = anyThemeEnabled
  }

  // Methods for siteConfigs
  async addSiteConfig (siteConfig) {
    fpLogger.debug('addSiteConfig()')
    await this.ensureInitialized()

    const configWithId = {
      ...siteConfig,
      id: this.generateUUID()
    }

    return this._addRecord(STORES.siteConfigs, configWithId)
  }

  async getSiteConfigById (id) {
    fpLogger.verbose('getSiteConfigById()')
    await this.ensureInitialized()
    return await this._getRecord(STORES.siteConfigs, id)
  }

  async getSiteConfigs () {
    fpLogger.verbose('getSiteConfigs()')
    await this.ensureInitialized()
    return this._getAllRecords(STORES.siteConfigs)
  }

  async getActiveSiteConfigs () {
    fpLogger.debug('getActiveSiteConfigs()')
    await this.ensureInitialized()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.siteConfigs], 'readonly')
      const store = transaction.objectStore(STORES.siteConfigs)
      const index = store.index('active')
      const request = index.getAll(window.IDBKeyRange.only(1)) // 1 is true

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async updateSiteConfig (siteConfig) {
    fpLogger.debug('updateSiteConfig()')
    await this.ensureInitialized()
    return this._updateRecord(STORES.siteConfigs, siteConfig)
  }

  async deleteSiteConfig (id) {
    fpLogger.debug('deleteSiteConfig()')
    await this.ensureInitialized()
    return this._deleteRecord(STORES.siteConfigs, id)
  }

  async deleteSiteConfigs (ids) {
    fpLogger.debug('deleteSiteConfigs()')
    await this.ensureInitialized()
    return this._deleteRecords(STORES.siteConfigs, ids)
  }

  // Methods for icons
  async addIcon (icon) {
    fpLogger.verbose('addIcon()')
    await this.ensureInitialized()

    try {
      const iconRecord = icon.id ? await this.getIconById(icon.id) : null

      if (!iconRecord) {
        return await this._addRecord(STORES.icons, icon)
      } else {
        return iconRecord
      }
    } catch (error) {
      if (
        error.name === 'DOMException' &&
        error.code === DOMException.CONSTRAINT_ERR
      ) {
        fpLogger.error('Error adding icon', error)
        return null
      } else {
        throw error
      }
    }
  }

  async getIconById (id) {
    fpLogger.trace('getIconById()')
    await this.ensureInitialized()
    return await this._getRecord(STORES.icons, id)
  }

  async getIcons () {
    fpLogger.verbose('getIcons()')
    await this.ensureInitialized()
    return this._getAllRecords(STORES.icons)
  }

  async updateIcon (icon) {
    fpLogger.debug('updateIcon()')
    await this.ensureInitialized()
    return this._updateRecord(STORES.icons, icon)
  }

  async deleteIcon (id) {
    fpLogger.debug('deleteIcon()')
    await this.ensureInitialized()
    return this._deleteRecord(STORES.icons, id)
  }

  // Methods for upload
  async addUpload (upload) {
    fpLogger.debug('addUpload()')
    await this.ensureInitialized()

    const configWithId = {
      ...upload,
      id: Date.now()
    }

    return this._addRecord(STORES.uploads, configWithId)
  }

  async getUploadById (id) {
    fpLogger.debug('getUploadById()')
    await this.ensureInitialized()
    return await this._getRecord(STORES.uploads, parseInt(id))
  }

  async getUploads () {
    fpLogger.debug('getUploads()')
    await this.ensureInitialized()
    return this._getAllRecords(STORES.uploads)
  }

  async updateUpload (upload) {
    fpLogger.debug('updateUpload()')
    await this.ensureInitialized()
    return this._updateRecord(STORES.uploads, upload)
  }

  async deleteUpload (id) {
    fpLogger.debug('deleteUpload()')
    await this.ensureInitialized()
    return this._deleteRecord(STORES.uploads, id)
  }

  async deleteUploads (ids) {
    fpLogger.debug('deleteUploads()')
    await this.ensureInitialized()
    return this._deleteRecords(STORES.uploads, ids)
  }

  // Preference methods
  async addPreference (key, value) {
    fpLogger.debug('addPreference()')
    await this.ensureInitialized()
    return await this._addRecord(STORES.preferences, { key, value })
  }

  async getPreference (key) {
    fpLogger.debug('getPreference()')
    await this.ensureInitialized()
    const preference = await this._getRecord(STORES.preferences, key)
    return preference?.value
  }

  async updatePreference (key, value) {
    fpLogger.debug('updatePreference()')
    await this.ensureInitialized()
    return this._updateRecord(STORES.preferences, { key, value })
  }

  // Private helper methods
  async _addRecord (storeName, record) {
    fpLogger.trace('_addRecord()')
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(record)

      request.onsuccess = () => resolve(record)
      request.onerror = () => reject(request.error)
    })
  }

  async _getAllRecords (storeName) {
    fpLogger.trace('_getAllRecords()')
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async _getRecord (storeName, id) {
    fpLogger.trace('_getRecord()')
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async _updateRecord (storeName, record) {
    fpLogger.trace('_updateRecord()')
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(record)

      request.onsuccess = () => resolve(record)
      request.onerror = () => reject(request.error)
    })
  }

  async _deleteRecord (storeName, id) {
    fpLogger.trace('_deleteRecord()')
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async _deleteRecords (storeName, ids) {
    fpLogger.trace('_deleteRecords()')
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)

      ids.forEach(id => store.delete(id))
    })
  }
}

window.extensionStore = new ExtensionStore()
