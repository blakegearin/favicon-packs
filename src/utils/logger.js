const logLevels = {
  silent: 0,
  quiet: 1,
  info: 2,
  debug: 3,
  verbose: 4,
  trace: 5
}

const getLogLevelKeyByValue = value => {
  return Object.keys(logLevels).find(key => logLevels[key] === value) || null
}

class Logger {
  constructor () {
    this.extensionName = 'Favicon Packs'
    this.storageKey = 'fpLogLevel'
    this.defaultLogLevel = 1 // Default to 'quiet'
    this._cachedLogLevel = this.defaultLogLevel
    this._initialized = false

    // Initialize log level from storage
    this._initializeLogLevel()
  }

  async _initializeLogLevel () {
    try {
      if (typeof browser !== 'undefined') {
        const result = await browser.storage.local.get(this.storageKey)
        if (result[this.storageKey] !== undefined) {
          this._cachedLogLevel = result[this.storageKey]
        }

        this._initialized = true
      }
    } catch (error) {
      console.error('Failed to initialize log level from storage:', error)
    }
  }

  getLogLevel () {
    return this._cachedLogLevel || this.defaultLogLevel
  }

  getLogLevelName () {
    return getLogLevelKeyByValue(this.getLogLevel())
  }

  async setLogLevel (level) {
    try {
      // Store numeric value for consistent storage
      const numericLevel = typeof level === 'string' ? logLevels[level] : level

      // Update cache immediately for synchronous access
      this._cachedLogLevel = numericLevel

      // Store in extension storage asynchronously
      await browser.storage.local.set({ [this.storageKey]: numericLevel })
      return this
    } catch (error) {
      console.error('Failed to set log level in storage:', error)
      return this
    }
  }

  version () {
    return typeof browser !== 'undefined'
      ? browser?.runtime.getManifest().version
      : null
  }

  log (level, message, variable = undefined) {
    if (this.getLogLevel() < level) return

    const version = this.version()
    const versionString = version ? `[${version}] ` : ''
    const levelName = getLogLevelKeyByValue(level)
    const log = `${versionString}[${levelName}] ${this.extensionName}: ${message}`

    console.groupCollapsed(log)

    if (variable !== undefined) console.dir(variable, { depth: null })

    console.trace()
    console.groupEnd()
  }

  silent (message, variable) {
    this.log(logLevels.silent, message, variable)
  }

  quiet (message, variable) {
    this.log(logLevels.quiet, message, variable)
  }

  info (message, variable) {
    this.log(logLevels.info, message, variable)
  }

  debug (message, variable) {
    this.log(logLevels.debug, message, variable)
  }

  verbose (message, variable) {
    this.log(logLevels.verbose, message, variable)
  }

  trace (message, variable) {
    this.log(logLevels.trace, message, variable)
  }

  error (message, error = undefined) {
    const versionString = this.version() ? `[${this.version()}] ` : ''
    const log = `${versionString}[error] ${this.extensionName}: ${message}`

    console.groupCollapsed(log)

    if (error !== undefined) console.error(error)

    console.trace()
    console.groupEnd()
  }
}

window.fpLogger = new Logger()
