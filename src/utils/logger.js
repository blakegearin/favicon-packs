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

  log (level, message, variable = undefined) {
    if (this.getLogLevel() < level) return

    const version = browser.runtime.getManifest().version
    const levelName = getLogLevelKeyByValue(level)
    const log = `[${version}] [${levelName}] ${this.extensionName}: ${message}`

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

  error (message, error = null) {
    console.error(`${this.extensionName}: ${message}`)
    if (error) console.error(error)
  }
}

window.fpLogger = new Logger()
