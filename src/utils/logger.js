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
    this.storageKey = 'logLevel'

    if (window.localStorage.getItem(this.storageKey) === null) {
      window.localStorage.setItem(this.storageKey, logLevels.quiet)
    }
  }

  getLogLevel () {
    return parseInt(window.localStorage.getItem(this.storageKey), 10)
  }

  getLogLevelName () {
    return getLogLevelKeyByValue(this.getLogLevel())
  }

  setLogLevel (level) {
    window.localStorage.setItem(this.storageKey, logLevels[level])
    return this
  }

  version () {
    return typeof browser !== 'undefined' ? browser?.runtime.getManifest().version : null
  }

  log (level, message, variable = undefined) {
    if (this.getLogLevel() < level) return

    const versionString = this.version() ? `[${this.version()}] ` : ''
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
