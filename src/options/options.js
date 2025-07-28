fpLogger.info('options.js loaded')

let ICON_SELECTOR_DRAWER

const svgNS = 'http://www.w3.org/2000/svg'

function svgToPngBase64 (svgString) {
  fpLogger.verbose('svgToPngBase64')

  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)

    const img = new window.Image()
    img.onload = function () {
      const canvas = document.createElement('canvas')

      // Ensure valid dimensions
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height

      if (canvas.width === 0 || canvas.height === 0) {
        URL.revokeObjectURL(url)
        reject(
          new Error(
            'Invalid SVG dimensions - width and height must be greater than 0'
          )
        )
        return
      }

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      URL.revokeObjectURL(url)

      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Failed to generate PNG blob'))
          return
        }

        const reader = new window.FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      }, 'image/png')
    }

    img.onerror = function (error) {
      URL.revokeObjectURL(url)
      const errorMessage = 'Failed to load SVG image'
      fpLogger.error(errorMessage, error)
      reject(new Error(errorMessage))
    }

    img.src = url
  })
}

// Note: This is not perfect, as it may be small, blurry, or not centered
function emojiToPngDataUri (emoji, size = 512) {
  fpLogger.debug('emojiToPngDataUri()')

  return new Promise((resolve, reject) => {
    try {
      // const canvas = document.createElement('canvas')
      // canvas.width = size
      // canvas.height = size

      // const ctx = canvas.getContext('2d')
      // // Clear the canvas with a transparent background
      // ctx.clearRect(0, 0, canvas.width, canvas.height)

      // // First draw the emoji on a temporary canvas to measure its actual size
      // const tempCanvas = document.createElement('canvas')
      // const tempSize = size * 2 // Much larger than needed to ensure we can measure properly
      // tempCanvas.width = tempSize
      // tempCanvas.height = tempSize

      // const tempCtx = tempCanvas.getContext('2d')
      // tempCtx.font = `${tempSize}px Arial`
      // tempCtx.textAlign = 'center'
      // tempCtx.textBaseline = 'middle'
      // tempCtx.fillText(emoji, tempSize / 2, tempSize / 2)

      // // Get the actual emoji dimensions by scanning the canvas
      // const imageData = tempCtx.getImageData(0, 0, tempSize, tempSize).data
      // let left = tempSize,
      //   right = 0,
      //   top = tempSize,
      //   bottom = 0

      // // Find the boundaries of the drawn emoji
      // for (let y = 0; y < tempSize; y++) {
      //   for (let x = 0; x < tempSize; x++) {
      //     const alpha = imageData[(y * tempSize + x) * 4 + 3]
      //     if (alpha > 0) {
      //       if (x < left) left = x
      //       if (x > right) right = x
      //       if (y < top) top = y
      //       if (y > bottom) bottom = y
      //     }
      //   }
      // }

      // // Calculate dimensions and scaling factor
      // const emojiWidth = right - left
      // const emojiHeight = bottom - top

      // // Use 90% of the available space for better visual margins
      // const scaleFactor = Math.min(
      //   (size * 0.9) / emojiWidth,
      //   (size * 0.9) / emojiHeight
      // )
      // // const finalFontSize = Math.floor(tempSize * scaleFactor)
      // const finalFontSize = size

      // // Now draw on the final canvas with optimal size
      // ctx.font = `${finalFontSize}px Arial`
      // ctx.textAlign = 'center'
      // ctx.textBaseline = 'middle'
      // ctx.fillText(emoji, size / 2, size / 2)

      // Credit: https://stackoverflow.com/a/72559156
      function setCanvas (canvas, w, h) {
        canvas.style.width = w + 'px'
        canvas.style.height = h + 'px'
        const scale = window.devicePixelRatio
        canvas.width = w * scale
        canvas.height = h * scale
        const ctx = canvas.getContext('2d')
        ctx.scale(scale, scale)
      }

      const width = size
      const height = size
      const fontSize = size
      const text = emoji

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      setCanvas(canvas, width, height)

      ctx.fillStyle = 'transparent'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = 'white'
      ctx.font = `${fontSize}px sans-serif`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      let { actualBoundingBoxAscent, actualBoundingBoxDescent } =
        ctx.measureText(text)
      ctx.fillText(
        text,
        width / 2,
        height / 2 + (actualBoundingBoxAscent - actualBoundingBoxDescent) / 2
      )

      // Convert to PNG data URI
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Failed to generate PNG blob from emoji'))
          return
        }

        const reader = new window.FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      }, 'image/png')
    } catch (error) {
      reject(new Error(`Failed to convert emoji to PNG: ${error.message}`))
    }
  })
}

function buildUploadImg (upload) {
  fpLogger.debug('buildUploadImg()')

  const iconImage = document.createElement('img')
  iconImage.src = upload.dataUri
  iconImage.setAttribute('upload-id', upload.id)

  return iconImage
}

function buildUrlImportImg (urlImport) {
  fpLogger.debug('buildUrlImportImg()')

  const iconImage = document.createElement('img')
  iconImage.src = urlImport.dataUri
  iconImage.setAttribute('url-import-id', urlImport.id)

  return iconImage
}

function buildSvgSprite (icon, size = 40) {
  fpLogger.trace('buildSvgSprite()')

  // svg tags don't work with createElement
  const iconSvg = document.createElementNS(svgNS, 'svg')
  iconSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  iconSvg.setAttribute('viewBox', '0 0 512 512')
  iconSvg.setAttribute('icon-id', icon.id)

  iconSvg.setAttribute('width', size.toString())
  iconSvg.setAttribute('height', size.toString())

  // use tags don't work with createElement
  const iconUse = document.createElementNS(svgNS, 'use')
  iconUse.setAttribute('href', `#${icon.id}`)

  iconSvg.appendChild(iconUse)

  return iconSvg
}

function convertSymbolStringToSymbolNode (symbolString) {
  const svgWrapper = `<svg xmlns="http://www.w3.org/2000/svg">${symbolString}</svg>`

  const parser = new DOMParser()
  const doc = parser.parseFromString(svgWrapper, 'image/svg+xml')

  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    fpLogger.error('Failed to parse symbol', symbol)
    fpLogger.error('Parser error', parserError)
    return
  }

  const symbolElement = doc.documentElement.firstElementChild
  return document.importNode(symbolElement, true)
}

function createFaviconSprite (icon, siteConfig, theme = null) {
  fpLogger.debug('createFaviconSprite()')

  const svgSprite = buildSvgSprite(icon, 1000)

  const symbolNode = convertSymbolStringToSymbolNode(icon.symbol)
  svgSprite.appendChild(symbolNode)

  fpLogger.debug('svgSprite', svgSprite)

  const styleElement = document.createElement('style')

  switch (icon.iconPackName) {
    case 'Ionicons':
      styleElement.textContent =
        '.ionicon { fill: currentColor; stroke: currentColor; } .ionicon-fill-none { fill: none; } .ionicon-stroke-width { stroke-width: 32px; }'
      break
    case 'Font_Awesome':
      styleElement.textContent =
        '.Font_Awesome { fill: currentColor; stroke: currentColor; }'
      break
    case 'Lucide':
      styleElement.textContent =
        '.Lucide { stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }'
      break
  }

  svgSprite.insertBefore(styleElement, svgSprite.firstChild)

  if (theme === 'dark') {
    svgSprite.style.setProperty('color', siteConfig.darkThemeColor)
  } else if (theme === 'any') {
    svgSprite.style.setProperty('color', siteConfig.anyThemeColor)
  } else if (theme !== null) {
    svgSprite.style.setProperty('color', siteConfig.lightThemeColor)
  }

  const serializer = new window.XMLSerializer()
  const updatedSvgString = serializer.serializeToString(svgSprite)
  fpLogger.debug('updatedSvgString', updatedSvgString)

  return updatedSvgString
}

function buildIconPackVariant (iconStyle, iconPackName, iconPackVersion) {
  fpLogger.trace('buildIconPackVariant()')

  const formattedIconPackVersion = iconPackVersion.replaceAll('.', '_')
  return `icon-pack-variant-${iconStyle}-${iconPackName}-${formattedIconPackVersion}`
}

async function populateDrawerIcons () {
  fpLogger.debug('populateDrawerIcons()')

  const icons = await window.extensionStore.getIcons()
  fpLogger.debug('icons', icons)

  const iconListFragment = document.createDocumentFragment()

  const sortedIcons = icons.sort((a, b) => a.name.localeCompare(b.name))
  for (const icon of sortedIcons) {
    const tooltip = document.createElement('sl-tooltip')
    const formattedIconPackName = icon.iconPackName.replaceAll('_', ' ')
    const tooltipContent = `${icon.name} ${formattedIconPackName} ${icon.iconPackVersion}`
    tooltip.setAttribute('content', tooltipContent)

    if (icon.tags) tooltip.setAttribute('tags', icon.tags.join(' '))

    tooltip.classList.add(
      buildIconPackVariant(icon.style, icon.iconPackName, icon.iconPackVersion)
    )

    const iconDiv = document.createElement('div')
    iconDiv.classList.add('icon-list-item')

    const svgSprite = buildSvgSprite(icon)

    tooltip.onclick = () => {
      ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.remove(
        'display-none'
      )

      ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.remove(
        'hidden'
      )
      ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren(
        svgSprite.cloneNode(true)
      )
    }

    iconDiv.appendChild(svgSprite)
    tooltip.appendChild(iconDiv)
    iconListFragment.appendChild(tooltip)

    const iconPackSvgSelector = `svg[icon-pack-name="${icon.iconPackName}"][icon-pack-version="${icon.iconPackVersion}"]`
    fpLogger.verbose('iconPackSvgSelector', iconPackSvgSelector)

    const symbolNode = convertSymbolStringToSymbolNode(icon.symbol)
    document.querySelector(iconPackSvgSelector).appendChild(symbolNode)
  }

  updateCurrentIconCount(sortedIcons.length)

  const iconList = ICON_SELECTOR_DRAWER.querySelector('.icon-list')
  iconList.replaceChildren(iconListFragment)
}

async function getSiteConfigsByUpload (uploadId) {
  fpLogger.debug('getSiteConfigsByUpload()')

  const siteConfigs = await window.extensionStore.getSiteConfigs()
  return siteConfigs.filter(
    siteConfig => siteConfig.uploadId?.toString() === uploadId?.toString()
  )
}

async function getSiteConfigsByUrlImport (urlImportId) {
  fpLogger.debug('getSiteConfigsByUrlImport()')

  const siteConfigs = await window.extensionStore.getSiteConfigs()
  return siteConfigs.filter(
    siteConfig => siteConfig.urlImportId?.toString() === urlImportId?.toString()
  )
}

async function populateDrawerUploads () {
  fpLogger.debug('populateDrawerUploads()')

  const uploads = await window.extensionStore.getUploads()
  const uploadListFragment = document.createDocumentFragment()

  const headerDiv = document.createElement('div')
  headerDiv.slot = 'header'

  const footerDiv = document.createElement('div')
  footerDiv.slot = 'footer'

  const deleteButton = document.createElement('sl-icon-button')
  deleteButton.setAttribute('name', 'trash')
  deleteButton.setAttribute('label', 'Delete')
  deleteButton.classList.add('delete-upload')

  const selectRadio = document.createElement('sl-radio')
  selectRadio.setAttribute('size', 'large')

  for (const upload of uploads) {
    const cardElement = document.createElement('sl-card')
    cardElement.classList.add('upload-list-item')

    const uploadHeaderDiv = headerDiv.cloneNode()
    uploadHeaderDiv.textContent = upload.name
    cardElement.appendChild(uploadHeaderDiv)

    const iconImage = buildUploadImg(upload)
    cardElement.appendChild(iconImage)

    const uploadFooterDiv = footerDiv.cloneNode(true)

    const deleteTooltip = document.createElement('sl-tooltip')
    deleteTooltip.setAttribute('content', 'Delete')

    const uploadDeleteButton = deleteButton.cloneNode(true)
    uploadDeleteButton.addEventListener('click', async () => {
      fpLogger.info('Upload delete button clicked')

      const relatedSiteConfigs = await getSiteConfigsByUpload(upload.id)
      fpLogger.debug('relatedSiteConfigs', relatedSiteConfigs)

      const usageCount = relatedSiteConfigs.length
      const uploadDate = new Date(parseInt(upload.id, 10))
      const formattedDate = uploadDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      const formattedTime = uploadDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      const formattedDateTime = `${formattedDate} at ${formattedTime}`

      let confirmationText = `Are you sure you want to delete this file?

      Name: ${upload.name}

      Uploaded: ${formattedDateTime}`

      if (usageCount) {
        const plural = usageCount === 1 ? '' : 's'
        confirmationText += `

        It's used by ${usageCount} site configuration${plural} which will be impacted.`
      }

      showDeleteConfirmationDialog(async () => {
        await window.extensionStore.deleteUpload(upload.id)

        const siteConfigs = await window.extensionStore.getSiteConfigs()
        for (const config of siteConfigs) {
          if (config.uploadId === upload.id) {
            await updateSiteConfig({
              id: config.id,
              uploadId: null
            })
          }
        }

        ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren()
        ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.add(
          'display-none'
        )
        ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.add(
          'hidden'
        )
        ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent =
          ''

        await populateDrawerUploads()
      }, confirmationText)
    })

    deleteTooltip.appendChild(uploadDeleteButton)
    uploadFooterDiv.appendChild(deleteTooltip)

    const selectTooltip = document.createElement('sl-tooltip')
    selectTooltip.setAttribute('content', 'Select')

    const uploadSelectRadio = selectRadio.cloneNode(true)

    const updatedIconUploadId =
      ICON_SELECTOR_DRAWER.querySelector('#updated-icon img')?.getAttribute(
        'upload-id'
      )
    fpLogger.debug('updatedIconUploadId', updatedIconUploadId)

    if (updatedIconUploadId?.toString() === upload.id.toString()) {
      uploadSelectRadio.checked = true
    }

    uploadSelectRadio.addEventListener('click', async () => {
      fpLogger.debug('Upload selected')

      ICON_SELECTOR_DRAWER.querySelectorAll(
        '.upload-list-item sl-radio'
      ).forEach(radio => {
        if (radio !== uploadSelectRadio) radio.checked = false
      })
      uploadSelectRadio.checked = true

      const imagePreview = buildUploadImg(upload)
      ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren(
        imagePreview
      )

      ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent =
        upload.name
      ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.remove(
        'display-none'
      )
      ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.remove(
        'hidden'
      )
    })

    selectTooltip.appendChild(uploadSelectRadio)
    uploadFooterDiv.appendChild(selectTooltip)

    cardElement.appendChild(uploadFooterDiv)
    uploadListFragment.appendChild(cardElement)
  }

  const uploadList = ICON_SELECTOR_DRAWER.querySelector('.upload-list')
  uploadList.replaceChildren(uploadListFragment)
}

async function populateDrawerUrlImports () {
  fpLogger.debug('populateDrawerUrlImports()')

  const urlImports = await window.extensionStore.getUrlImports()
  const urlImportListFragment = document.createDocumentFragment()

  const headerDiv = document.createElement('div')
  headerDiv.slot = 'header'

  const footerDiv = document.createElement('div')
  footerDiv.slot = 'footer'

  const deleteButton = document.createElement('sl-icon-button')
  deleteButton.setAttribute('name', 'trash')
  deleteButton.setAttribute('label', 'Delete')
  deleteButton.classList.add('delete-urlImport')

  const selectRadio = document.createElement('sl-radio')
  selectRadio.setAttribute('size', 'large')

  for (const urlImport of urlImports) {
    const cardElement = document.createElement('sl-card')
    cardElement.classList.add('url-import-list-item')

    const urlImportHeaderDiv = headerDiv.cloneNode()
    urlImportHeaderDiv.textContent = urlImport.url
    cardElement.appendChild(urlImportHeaderDiv)

    const iconImage = buildUrlImportImg(urlImport)
    cardElement.appendChild(iconImage)

    const urlImportFooterDiv = footerDiv.cloneNode(true)

    const deleteTooltip = document.createElement('sl-tooltip')
    deleteTooltip.setAttribute('content', 'Delete')

    const urlImportDeleteButton = deleteButton.cloneNode(true)
    urlImportDeleteButton.addEventListener('click', async () => {
      fpLogger.info('URL import delete button clicked')

      const relatedSiteConfigs = await getSiteConfigsByUrlImport(urlImport.id)
      fpLogger.debug('relatedSiteConfigs', relatedSiteConfigs)

      const usageCount = relatedSiteConfigs.length
      const urlImportDate = new Date(parseInt(urlImport.id, 10))
      const formattedDate = urlImportDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      const formattedTime = urlImportDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      const formattedDateTime = `${formattedDate} at ${formattedTime}`

      let confirmationText = `Are you sure you want to delete this file?

      URL: ${urlImport.url}

      Imported: ${formattedDateTime}`

      if (usageCount) {
        const plural = usageCount === 1 ? '' : 's'
        confirmationText += `

        It's used by ${usageCount} site configuration${plural} which will be impacted.`
      }

      showDeleteConfirmationDialog(async () => {
        await window.extensionStore.deleteUrlImport(urlImport.id)

        const siteConfigs = await window.extensionStore.getSiteConfigs()
        for (const config of siteConfigs) {
          if (config.urlImportId === urlImport.id) {
            await updateSiteConfig({
              id: config.id,
              urlImportId: null
            })
          }
        }

        ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren()
        ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.add(
          'display-none'
        )
        ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.add(
          'hidden'
        )
        // ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent =
        //   ''

        await populateDrawerUploads()
      }, confirmationText)
    })

    deleteTooltip.appendChild(urlImportDeleteButton)
    urlImportFooterDiv.appendChild(deleteTooltip)

    const selectTooltip = document.createElement('sl-tooltip')
    selectTooltip.setAttribute('content', 'Select')

    const urlImportSelectRadio = selectRadio.cloneNode(true)

    const updatedIconUrlImportId =
      ICON_SELECTOR_DRAWER.querySelector('#updated-icon img')?.getAttribute(
        'url-import-id'
      )
    fpLogger.debug('updatedIconUrlImportId', updatedIconUrlImportId)

    if (updatedIconUrlImportId?.toString() === urlImport.id.toString()) {
      urlImportSelectRadio.checked = true
    }

    urlImportSelectRadio.addEventListener('click', async () => {
      fpLogger.debug('URL import selected')

      ICON_SELECTOR_DRAWER.querySelectorAll(
        '.url-import-list-item sl-radio'
      ).forEach(radio => {
        if (radio !== urlImportSelectRadio) radio.checked = false
      })
      urlImportSelectRadio.checked = true

      const imagePreview = buildUrlImportImg(urlImport)
      ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren(
        imagePreview
      )

      // ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent =
      //   upload.name
      ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.remove(
        'display-none'
      )
      ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.remove(
        'hidden'
      )
    })

    selectTooltip.appendChild(urlImportSelectRadio)
    urlImportFooterDiv.appendChild(selectTooltip)

    cardElement.appendChild(urlImportFooterDiv)
    urlImportListFragment.appendChild(cardElement)
  }

  const urlImportList = ICON_SELECTOR_DRAWER.querySelector('.url-import-list')
  urlImportList.replaceChildren(urlImportListFragment)
}

async function getPriority (id) {
  fpLogger.debug('getPriority()')

  const siteConfigsOrder = await window.extensionStore.getPreference(
    'siteConfigsOrder'
  )
  return siteConfigsOrder.indexOf(id)
}

async function filterByIconPackVariant (filterIconPackVariant) {
  fpLogger.debug('filterByIconPackVariant()')

  const iconPackVariants = []

  const iconPacks = await window.extensionStore.getIconPacks()
  iconPacks.forEach(iconPack => {
    iconPack.versions.forEach(version => {
      iconPack.styles.forEach(style => {
        const variant = buildIconPackVariant(
          style.name,
          iconPack.name,
          version.name
        )
        iconPackVariants.push(variant)
      })
    })
  })

  for (const iconPackVariant of iconPackVariants) {
    const variantActive = ['All packs', iconPackVariant].includes(
      filterIconPackVariant
    )

    document.documentElement.style.setProperty(
      `--icon-pack-variant-${iconPackVariant}`,
      variantActive ? 'block' : 'none'
    )
  }

  let iconPackVariantSelector = '.icon-list sl-tooltip'

  if (filterIconPackVariant !== 'All packs') {
    iconPackVariantSelector += `.${filterIconPackVariant}`
  }

  const currentIconCount = ICON_SELECTOR_DRAWER.querySelectorAll(
    iconPackVariantSelector
  ).length
  updateCurrentIconCount(currentIconCount)
}

function updateCurrentIconCount (iconCount) {
  fpLogger.debug('updateCurrentIconCount()')
  document.querySelector('#current-icon-count').textContent =
    iconCount.toLocaleString()
}

function filterDrawerIcons (filter) {
  fpLogger.debug('filterDrawerIcons()')

  let currentIconCount = 0

  ICON_SELECTOR_DRAWER.querySelectorAll('sl-tooltip').forEach(icon => {
    let passes = false

    if (filter) {
      const name = icon.getAttribute('content')
      const tags = icon.getAttribute('tags') || []

      if (filter instanceof RegExp) {
        if (filter.test(name)) passes = true
      } else {
        if (name.includes(filter) || tags.includes(filter)) passes = true
      }
    } else {
      passes = true
    }

    if (passes) {
      currentIconCount++
      icon.classList.remove('display-none')
    } else {
      icon.classList.add('display-none')
    }
  })

  updateCurrentIconCount(currentIconCount)
}

async function updateSiteConfig ({
  id,
  patternType,
  websitePattern,
  iconId,
  uploadId,
  urlImportId,
  emojiUrl,
  lightThemeColor,
  darkThemeColor,
  anyThemeColor,
  active
}) {
  fpLogger.debug('updateSiteConfig()')

  const existingSiteConfig = await window.extensionStore.getSiteConfigById(id)

  // Boolean values have to be handled differently than a simple || since 0 is falsy
  const activeDefined = active !== undefined
  fpLogger.verbose('activeDefined', activeDefined)

  const patternTypeDefined = patternType !== undefined
  fpLogger.verbose('patternTypeDefined', patternTypeDefined)

  const newSiteConfig = {
    id,
    patternType: patternTypeDefined
      ? patternType
      : existingSiteConfig.patternType,
    websitePattern: websitePattern || existingSiteConfig.websitePattern,
    iconId: iconId || existingSiteConfig.iconId,
    uploadId: uploadId || existingSiteConfig.uploadId,
    urlImportId: urlImportId || existingSiteConfig.urlImportId,
    lightThemeColor: lightThemeColor || existingSiteConfig.lightThemeColor,
    darkThemeColor: darkThemeColor || existingSiteConfig.darkThemeColor,
    anyThemeColor: anyThemeColor || existingSiteConfig.anyThemeColor,
    emojiUrl: emojiUrl || existingSiteConfig.emojiUrl,
    lightPngUrl: existingSiteConfig.lightPngUrl,
    darkPngUrl: existingSiteConfig.darkPngUrl,
    anyPngUrl: existingSiteConfig.anyPngUrl,
    active: activeDefined ? active : existingSiteConfig.active
  }

  if (iconId || lightThemeColor || darkThemeColor || anyThemeColor) {
    if (!newSiteConfig.iconId) return

    const icon = await window.extensionStore.getIconById(newSiteConfig.iconId)
    if (!icon) fpLogger.error('Icon not found', iconId)

    if (iconId || lightThemeColor) {
      const faviconSpriteLight = createFaviconSprite(
        icon,
        newSiteConfig,
        'light'
      )
      const lightPngUrl = await svgToPngBase64(faviconSpriteLight)
      newSiteConfig.lightPngUrl = lightPngUrl
    }

    if (iconId || darkThemeColor) {
      const faviconSpriteDark = createFaviconSprite(icon, newSiteConfig, 'dark')
      const darkPngUrl = await svgToPngBase64(faviconSpriteDark)
      newSiteConfig.darkPngUrl = darkPngUrl
    }

    if (iconId || anyThemeColor) {
      const faviconSprite = createFaviconSprite(icon, newSiteConfig, 'any')
      const anyPngUrl = await svgToPngBase64(faviconSprite)
      newSiteConfig.anyPngUrl = anyPngUrl
    }

    delete newSiteConfig.uploadId
    delete newSiteConfig.urlImportId
    delete newSiteConfig.emojiUrl
  } else if (uploadId || urlImportId || emojiUrl) {
    delete newSiteConfig.iconId
    delete newSiteConfig.lightPngUrl
    delete newSiteConfig.darkPngUrl
    delete newSiteConfig.anyPngUrl
  }

  fpLogger.debug('newSiteConfig', newSiteConfig)
  const updatedSiteConfig = await window.extensionStore.updateSiteConfig(
    newSiteConfig
  )
  fpLogger.debug('updatedSiteConfig', updatedSiteConfig)

  if (activeDefined) {
    const siteConfigs = await window.extensionStore.getSiteConfigs()
    updateRecordsSummary(siteConfigs)
  } else {
    await populateTableRow(updatedSiteConfig, false)
  }
}

function updateRecordsSummary (siteConfigs) {
  fpLogger.debug('updateRecordsSummary()')

  document.querySelector('#siteConfigs-length').innerText = siteConfigs.length
  document.querySelector('#active-siteConfigs-length').innerText =
    siteConfigs.filter(siteConfig => siteConfig.active)?.length || 0
}

async function swapPriorities (record1Id, direction) {
  fpLogger.debug('swapPriorities()')

  const siteConfigsOrder = await window.extensionStore.getPreference(
    'siteConfigsOrder'
  )
  fpLogger.debug('siteConfigsOrder', siteConfigsOrder)
  const currentIndex = siteConfigsOrder.indexOf(record1Id)

  if (
    currentIndex === -1 ||
    (direction === 'increment' && currentIndex === 0) ||
    (direction === 'decrement' && currentIndex === siteConfigsOrder.length - 1)
  ) {
    return
  }

  const targetIndex =
    direction === 'increment' ? currentIndex - 1 : currentIndex + 1
  const record2Id = siteConfigsOrder[targetIndex]
  const record2 = await window.extensionStore.getSiteConfigById(record2Id)

  ;[siteConfigsOrder[currentIndex], siteConfigsOrder[targetIndex]] = [
    siteConfigsOrder[targetIndex],
    siteConfigsOrder[currentIndex]
  ]

  fpLogger.debug('siteConfigsOrder', siteConfigsOrder)
  await window.extensionStore.updatePreference(
    'siteConfigsOrder',
    siteConfigsOrder
  )

  const tr1 = document.querySelector(`#row-${record1Id}`)
  const tr2 = document.querySelector(`#row-${record2.id}`)
  if (!tr1 || !tr2) return

  await setPriorityButtonVisibility(tr1, targetIndex)
  await setPriorityButtonVisibility(tr2, currentIndex)

  if (direction === 'increment') {
    tr2.parentNode.insertBefore(tr1, tr2)
  } else {
    tr2.parentNode.insertBefore(tr2, tr1)
  }
}

async function setPriorityButtonVisibility (row, priority) {
  fpLogger.debug('setPriorityButtonVisibility()')
  fpLogger.verbose('row', row)
  fpLogger.verbose('priority', priority)

  const siteConfigs = await window.extensionStore.getSiteConfigs()
  fpLogger.verbose('siteConfigs', siteConfigs)

  const incrementButton = row.querySelector('.increment')
  const decrementButton = row.querySelector('.decrement')

  if (priority === 0) {
    incrementButton.classList.add('hidden')

    if (siteConfigs.length > 1) {
      decrementButton.classList.remove('hidden')
    } else {
      decrementButton.classList.add('hidden')
    }
  } else if (priority === siteConfigs.length - 1) {
    incrementButton.classList.remove('hidden')
    decrementButton.classList.add('hidden')
  } else {
    incrementButton.classList.remove('hidden')
    decrementButton.classList.remove('hidden')
  }
}

async function populateTableRow (siteConfig, insertion, tablePosition = 'last') {
  fpLogger.debug('populateTableRow()')

  const id = siteConfig.id
  const rowId = `row-${id}`
  const templateRow = document.querySelector('#template-row')
  let newRow

  if (insertion) {
    newRow = templateRow.cloneNode(true)
    newRow.id = rowId
    newRow.classList.remove('display-none')
    newRow.classList.add('siteConfig-row')
  } else {
    newRow = document.querySelector(`#${rowId}`)
  }

  // Priority column
  const incrementButton = newRow.querySelector('.increment')
  const decrementButton = newRow.querySelector('.decrement')

  const priority = await getPriority(id)
  await setPriorityButtonVisibility(newRow, priority)

  incrementButton.addEventListener('click', async () => {
    fpLogger.debug('Increment button clicked')
    await swapPriorities(siteConfig.id, 'increment')
  })
  decrementButton.addEventListener('click', async () => {
    fpLogger.debug('Decrement button clicked')
    await swapPriorities(siteConfig.id, 'decrement')
  })

  // Pattern Type column
  const patternTypeTag = newRow.querySelector('.type-cell sl-tag')
  patternTypeTag.innerText =
    siteConfig.patternType === 0 ? 'Simple Match' : 'Regex Match'

  const variantValue = siteConfig.patternType === 0 ? 'primary' : 'warning'
  patternTypeTag.setAttribute('variant', variantValue)

  const toggleTypeButton = newRow.querySelector('.toggle-type')
  toggleTypeButton.addEventListener('click', () => {
    fpLogger.debug('Toggle type button clicked')

    const patternType = 1 - siteConfig.patternType // Fun way to toggle between 0 and 1
    fpLogger.verbose('patternType', patternType)

    updateSiteConfig({ id, patternType })
  })

  // Site Match column
  newRow.querySelector('.site-match-value').innerText =
    siteConfig.websitePattern
  newRow
    .querySelector('.site-match-value-copy')
    .setAttribute('value', siteConfig.websitePattern)

  const siteRead = newRow.querySelector('.site-cell.read')
  const siteEdit = newRow.querySelector('.site-cell.edit')
  const siteMatchInput = newRow.querySelector('.site-cell sl-input')

  if (siteConfig.websitePattern) {
    siteMatchInput.value = siteConfig.websitePattern

    siteRead.classList.remove('display-none')
    siteEdit.classList.add('display-none')
  } else {
    siteRead.classList.add('display-none')
    siteEdit.classList.remove('display-none')
  }

  const editSiteButton = newRow.querySelector('.site-cell .edit-site')

  // addEventListener does not allow editing multiple times
  editSiteButton.onclick = () => {
    fpLogger.debug('editSiteButton clicked')

    siteRead.classList.toggle('display-none')
    siteEdit.classList.toggle('display-none')

    siteEdit.querySelector('sl-input').focus()
  }

  const form = newRow.querySelector('.site-cell.edit')

  form.addEventListener('submit', event => {
    event.preventDefault()
    fpLogger.info('Save button clicked')

    const websitePattern = siteMatchInput.value
    updateSiteConfig({ id, websitePattern })
  })

  form.addEventListener('reset', () => {
    fpLogger.debug('Reset button clicked')
    const siteMatchInput = newRow.querySelector('.site-cell sl-input')

    siteMatchInput.updateComplete.then(() => {
      siteMatchInput.value = siteConfig.websitePattern || ''
      siteMatchInput.focus()
    })
  })

  // Icon column
  let icon

  if (siteConfig.iconId) {
    icon = await window.extensionStore.getIconById(siteConfig.iconId)

    if (icon) {
      const svgSprite = buildSvgSprite(icon)

      newRow
        .querySelector('#icon-value')
        .replaceChildren(svgSprite.cloneNode(true))
      newRow.querySelector('#icon-value').classList.remove('display-none')
      newRow.querySelector('#icon-vale-not-found').classList.add('display-none')
    } else {
      fpLogger.quiet(
        `Icon not found, likely due to icon pack deletion: ${siteConfig.iconId}`
      )

      newRow.querySelector('#icon-value').replaceChildren()
      newRow.querySelector('#icon-value').classList.add('display-none')
      newRow
        .querySelector('#icon-vale-not-found')
        .classList.remove('display-none')
    }

    newRow.querySelector('.icon-cell .add').classList.add('display-none')
    newRow.querySelector('.icon-cell .edit').classList.remove('display-none')

    if (siteConfig.lightPngUrl) {
      const imageElementLight = document.createElement('img')
      imageElementLight.src = siteConfig.lightPngUrl

      const lightThemeFavicon = newRow.querySelector(
        '.favicon-value.light-theme-color-style'
      )
      lightThemeFavicon.replaceChildren(imageElementLight)
      lightThemeFavicon.classList.remove('display-none')
    }

    if (siteConfig.darkPngUrl) {
      const imageElementDark = document.createElement('img')
      imageElementDark.src = siteConfig.darkPngUrl

      const darkThemeFavicon = newRow.querySelector(
        '.favicon-value.dark-theme-color-style'
      )
      darkThemeFavicon.replaceChildren(imageElementDark)
      darkThemeFavicon.classList.remove('display-none')
    }

    if (siteConfig.anyPngUrl) {
      const imageElementNo = document.createElement('img')
      imageElementNo.src = siteConfig.anyPngUrl

      const anyThemeFavicon = newRow.querySelector(
        '.favicon-value.any-theme-color-style'
      )
      anyThemeFavicon.replaceChildren(imageElementNo)
      anyThemeFavicon.classList.remove('display-none')
    }

    const darkThemeEnabled = await window.extensionStore.getPreference(
      'darkThemeEnabled'
    )
    fpLogger.debug('darkThemeEnabled', darkThemeEnabled)

    const lightThemeEnabled = await window.extensionStore.getPreference(
      'lightThemeEnabled'
    )
    fpLogger.debug('lightThemeEnabled', lightThemeEnabled)

    if (!darkThemeEnabled && !lightThemeEnabled) {
      const anyThemeDisplayElement = newRow.querySelector(
        '.favicon-value.any-theme-display'
      )
      anyThemeDisplayElement.classList.remove('display-none')
    }

    newRow
      .querySelector('.favicon-value.image-display')
      .classList.add('display-none')
  } else if (siteConfig.emojiUrl) {
    const imageElement = document.createElement('img')
    imageElement.src = siteConfig.emojiUrl

    newRow.querySelectorAll('#icon-value').forEach(iconValueElement => {
      iconValueElement.replaceChildren(imageElement.cloneNode(true))
    })

    newRow.querySelector('.icon-cell .add').classList.add('display-none')
    newRow.querySelector('.icon-cell .edit').classList.remove('display-none')

    newRow.querySelectorAll('.favicon-value.icon').forEach(iconElement => {
      iconElement.classList.add('display-none')
    })

    const imageDisplayElement = newRow.querySelector(
      '.favicon-value.image-display'
    )
    imageDisplayElement.replaceChildren(imageElement.cloneNode(true))
    imageDisplayElement.classList.remove('display-none')
  } else if (siteConfig.uploadId || siteConfig.urlImportId) {
    let imageElement

    if (siteConfig.uploadId) {
      fpLogger.debug('siteConfig.uploadId', siteConfig.uploadId)

      const upload = await window.extensionStore.getUploadById(
        siteConfig.uploadId
      )
      fpLogger.debug('upload', upload)

      imageElement = buildUploadImg(upload)
    } else if (siteConfig.urlImportId) {
      fpLogger.debug('siteConfig.urlImportId', siteConfig.urlImportId)

      const urlImport = await window.extensionStore.getUrlImportById(
        siteConfig.urlImportId
      )
      fpLogger.debug('urlImport', urlImport)

      imageElement = buildUrlImportImg(urlImport)
    }

    newRow.querySelectorAll('#icon-value').forEach(iconValueElement => {
      iconValueElement.replaceChildren(imageElement.cloneNode(true))
    })

    newRow.querySelector('.icon-cell .add').classList.add('display-none')
    newRow.querySelector('.icon-cell .edit').classList.remove('display-none')

    newRow.querySelectorAll('.favicon-value.icon').forEach(iconElement => {
      iconElement.classList.add('display-none')
    })

    const imageDisplayElement = newRow.querySelector(
      '.favicon-value.image-display'
    )
    imageDisplayElement.replaceChildren(imageElement.cloneNode(true))
    imageDisplayElement.classList.remove('display-none')
  } else {
    newRow.querySelector('.icon-cell .add').classList.remove('display-none')
    newRow.querySelector('.icon-cell .edit').classList.add('display-none')
  }

  const addIconButton = newRow.querySelector('.icon-cell .add sl-button')
  addIconButton.addEventListener('click', () => {
    fpLogger.debug('Add icon button clicked')

    ICON_SELECTOR_DRAWER.setAttribute('data-siteConfig-id', id)

    ICON_SELECTOR_DRAWER.querySelector('[panel="icon-packs"]').click()

    ICON_SELECTOR_DRAWER.querySelectorAll('.upload-list-item sl-radio').forEach(
      radio => {
        radio.checked = false
      }
    )

    ICON_SELECTOR_DRAWER.querySelector('#current-icon').replaceChildren()
    ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren()

    ICON_SELECTOR_DRAWER.querySelector('#current-upload-name').textContent = ''
    ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent = ''

    ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.add('hidden')

    ICON_SELECTOR_DRAWER.show()
  })

  ICON_SELECTOR_DRAWER.querySelector('.drawer__overlay').addEventListener(
    'click',
    () => {
      ICON_SELECTOR_DRAWER.hide()
    }
  )

  ICON_SELECTOR_DRAWER.querySelector('.drawer__close').addEventListener(
    'click',
    () => {
      ICON_SELECTOR_DRAWER.hide()
    }
  )

  const updateIcon = async () => {
    fpLogger.debug('Opening icon selector drawer')

    if (siteConfig.uploadId) {
      ICON_SELECTOR_DRAWER.querySelector('[panel="upload"]').click()

      ICON_SELECTOR_DRAWER.querySelectorAll(
        '.upload-list-item sl-radio'
      ).forEach(radio => {
        radio.checked = false
      })

      const upload = await window.extensionStore.getUploadById(
        siteConfig.uploadId
      )
      ICON_SELECTOR_DRAWER.querySelector('#current-icon').replaceChildren(
        buildUploadImg(upload)
      )

      ICON_SELECTOR_DRAWER.querySelector('#current-upload-name').textContent =
        upload.name
      ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent =
        ''
    } else if (siteConfig.urlImportId) {
      ICON_SELECTOR_DRAWER.querySelector('[panel="url"]').click()

      ICON_SELECTOR_DRAWER.querySelectorAll(
        '.url-import-list-item sl-radio'
      ).forEach(radio => {
        radio.checked = false
      })

      const urlImport = await window.extensionStore.getUrlImportById(
        siteConfig.urlImportId
      )
      ICON_SELECTOR_DRAWER.querySelector('#current-icon').replaceChildren(
        buildUrlImportImg(urlImport)
      )

      // ICON_SELECTOR_DRAWER.querySelector('#current-upload-name').textContent =
      //   upload.name
      // ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent =
      //   ''
    } else {
      ICON_SELECTOR_DRAWER.querySelector('#current-icon').replaceChildren()
      ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren()

      ICON_SELECTOR_DRAWER.querySelector('[panel="icon-packs"]').click()
      ICON_SELECTOR_DRAWER.querySelector('#current-upload-name').textContent =
        ''

      if (siteConfig.iconId && icon) {
        ICON_SELECTOR_DRAWER.querySelector('#current-icon').replaceChildren(
          buildSvgSprite(icon)
        )
      }
    }

    ICON_SELECTOR_DRAWER.setAttribute('data-siteConfig-id', id)

    ICON_SELECTOR_DRAWER.show()
  }
  newRow
    .querySelectorAll('.icon-cell .edit sl-button')
    .forEach(selectIconButton => {
      selectIconButton.addEventListener('click', updateIcon)
    })

  // Light Theme column
  const lightThemeColorPicker = newRow.querySelector(
    '.light-theme-color-picker'
  )

  if (siteConfig.uploadId || !siteConfig.iconId) {
    lightThemeColorPicker.parentNode.classList.add('display-none')
  } else {
    lightThemeColorPicker.parentNode.classList.remove('display-none')
    lightThemeColorPicker.addEventListener('sl-blur', event => {
      fpLogger.info('Updating light theme color')

      event.target.updateComplete.then(() => {
        const lightThemeColor = event.target.input.value
        updateSiteConfig({ id, lightThemeColor })
      })
    })
    newRow
      .querySelectorAll('.light-theme-color-value')
      .forEach(lightThemeColorValueElement => {
        lightThemeColorValueElement.value = siteConfig.lightThemeColor
      })
  }

  // Dark Theme column
  const darkThemeColorPicker = newRow.querySelector('.dark-theme-color-picker')

  if (siteConfig.uploadId || !siteConfig.iconId) {
    darkThemeColorPicker.parentNode.classList.add('display-none')
  } else {
    darkThemeColorPicker.parentNode.classList.remove('display-none')
    darkThemeColorPicker.addEventListener('sl-blur', event => {
      fpLogger.info('Updating dark theme color')

      event.target.updateComplete.then(() => {
        const darkThemeColor = event.target.input.value
        updateSiteConfig({ id, darkThemeColor })
      })
    })
    newRow
      .querySelectorAll('.dark-theme-color-value')
      .forEach(darkThemeColorValueElement => {
        darkThemeColorValueElement.value = siteConfig.darkThemeColor
      })
  }

  // Any Theme column
  const anyThemeColorPicker = newRow.querySelector('.any-theme-color-picker')

  if (siteConfig.uploadId || !siteConfig.iconId) {
    anyThemeColorPicker.parentNode.classList.add('display-none')
  } else {
    anyThemeColorPicker.parentNode.classList.remove('display-none')
    anyThemeColorPicker.addEventListener('sl-blur', event => {
      fpLogger.info('Updating icon color')

      event.target.updateComplete.then(() => {
        const anyThemeColor = event.target.input.value
        updateSiteConfig({ id, anyThemeColor })
      })
    })
    newRow
      .querySelectorAll('.any-theme-color-value')
      .forEach(anyThemeColorValueElement => {
        anyThemeColorValueElement.value = siteConfig.anyThemeColor
      })
  }

  // Favicon column
  if (siteConfig.iconId) {
    newRow
      .querySelector('.light-theme-color-style')
      .style.setProperty('color', siteConfig.lightThemeColor)
    newRow
      .querySelector('.dark-theme-color-style')
      .style.setProperty('color', siteConfig.darkThemeColor)
    newRow
      .querySelector('.any-theme-color-style')
      .style.setProperty('color', siteConfig.anyThemeColor)
  }

  // Active column
  const switchElement = newRow.querySelector('.active-cell sl-switch')
  if (siteConfig.active) switchElement.setAttribute('checked', '')

  switchElement.addEventListener('sl-input', event => {
    event.target.updateComplete.then(() => {
      fpLogger.info('Updating active')
      const checked = event.target.checked
      const active = checked ? 1 : 0
      updateSiteConfig({ id, active })
    })
  })

  if (insertion) {
    fpLogger.debug('insertion')
    const tableBody = document.querySelector('#siteConfigs tbody')

    if (tablePosition === 'last') {
      tableBody.appendChild(newRow)
    } else if (tablePosition === 'first') {
      tableBody.insertBefore(newRow, tableBody.firstChild)
    }
  }
}

async function populateTable (siteConfigs) {
  fpLogger.debug('populateTable()')
  fpLogger.debug('siteConfigs', siteConfigs)

  const tableBody = document.querySelector('#siteConfigs tbody')
  tableBody.querySelectorAll('.siteConfig-row').forEach(row => row.remove())

  let siteConfigsOrder = await window.extensionStore.getPreference(
    'siteConfigsOrder'
  )
  fpLogger.debug('siteConfigsOrder', siteConfigsOrder)

  if (!siteConfigsOrder) {
    siteConfigsOrder = []

    await window.extensionStore.updatePreference(
      'siteConfigsOrder',
      siteConfigsOrder
    )
  }

  // Remove any siteConfigs that no longer exist
  if (siteConfigsOrder.length > siteConfigs.length) {
    siteConfigsOrder = siteConfigs
      .filter(siteConfig => siteConfigsOrder.includes(siteConfig.id))
      .map(siteConfig => siteConfig.id)

    await window.extensionStore.updatePreference(
      'siteConfigsOrder',
      siteConfigsOrder
    )
  }

  fpLogger.debug('siteConfigsOrder', siteConfigsOrder)

  const sortedSiteConfigs = siteConfigsOrder
    .map(id => siteConfigs.find(siteConfig => siteConfig.id === id))
    .filter(Boolean)

  const noDataRow = document.querySelector('.no-data-row')
  if (sortedSiteConfigs.length === 0) {
    noDataRow.classList.remove('display-none')
    return
  } else {
    noDataRow.classList.add('display-none')
  }

  for await (const siteConfig of sortedSiteConfigs) {
    await populateTableRow(siteConfig, true)
  }
}

function openTabPanels (tabPanelName) {
  fpLogger.debug('openTabPanels()')

  const iconPacksTabPanels = ICON_SELECTOR_DRAWER.querySelectorAll(
    'sl-tab-panel[name="icon-packs"]'
  )
  const emojiTabPanels = ICON_SELECTOR_DRAWER.querySelectorAll(
    'sl-tab-panel[name="emojis"]'
  )
  const uploadTabPanels = ICON_SELECTOR_DRAWER.querySelectorAll(
    'sl-tab-panel[name="upload"]'
  )
  const urlTabPanels = ICON_SELECTOR_DRAWER.querySelectorAll(
    'sl-tab-panel[name="url"]'
  )

  switch (tabPanelName) {
    case 'icon-packs':
      // ICON_SELECTOR_DRAWER.querySelector('.drawer__body').classList.remove('display-none')
      iconPacksTabPanels.forEach(tabPanel =>
        tabPanel.setAttribute('active', '')
      )
      emojiTabPanels.forEach(tabPanel => tabPanel.removeAttribute('active'))
      uploadTabPanels.forEach(tabPanel => tabPanel.removeAttribute('active'))
      urlTabPanels.forEach(tabPanel => tabPanel.removeAttribute('active', ''))
      break
    case 'emojis':
      // ICON_SELECTOR_DRAWER.querySelector('.drawer__body').classList.add('display-none')
      iconPacksTabPanels.forEach(tabPanel => tabPanel.removeAttribute('active'))
      emojiTabPanels.forEach(tabPanel => tabPanel.setAttribute('active', ''))
      uploadTabPanels.forEach(tabPanel => tabPanel.removeAttribute('active'))
      urlTabPanels.forEach(tabPanel => tabPanel.removeAttribute('active', ''))
      break
    case 'upload':
      // ICON_SELECTOR_DRAWER.querySelector('.drawer__body').classList.remove('display-none')
      iconPacksTabPanels.forEach(tabPanel => tabPanel.removeAttribute('active'))
      emojiTabPanels.forEach(tabPanel => tabPanel.removeAttribute('active'))
      uploadTabPanels.forEach(tabPanel => tabPanel.setAttribute('active', ''))
      urlTabPanels.forEach(tabPanel => tabPanel.removeAttribute('active', ''))
      break
    case 'url':
      // ICON_SELECTOR_DRAWER.querySelector('.drawer__body').classList.remove('display-none')
      iconPacksTabPanels.forEach(tabPanel => tabPanel.removeAttribute('active'))
      emojiTabPanels.forEach(tabPanel => tabPanel.removeAttribute('active'))
      uploadTabPanels.forEach(tabPanel =>
        tabPanel.removeAttribute('active', '')
      )
      urlTabPanels.forEach(tabPanel => tabPanel.setAttribute('active', ''))
      break
  }
}

function showDeleteConfirmationDialog (deleteFunction, confirmationText) {
  fpLogger.debug('showDeleteConfirmationDialog()')

  const deleteConfirmationDialog = document.querySelector(
    'sl-dialog#delete-confirmation'
  )

  deleteConfirmationDialog
    .querySelector('#delete-cancel-button')
    .addEventListener('click', async () => {
      fpLogger.debug('Delete cancel button clicked')
      deleteConfirmationDialog.hide()
    })

  deleteConfirmationDialog
    .querySelector('#delete-confirmation-button')
    .addEventListener('click', async () => {
      fpLogger.info('Delete confirmation button clicked')
      await deleteFunction()
      deleteConfirmationDialog.hide()
    })

  deleteConfirmationDialog.querySelector(
    '#delete-confirmation-text'
  ).innerText = confirmationText

  deleteConfirmationDialog.show()
}

async function createVersionRow (iconPack, versionMetadata) {
  fpLogger.verbose('createVersionRow()')

  const versionRow = document.createElement('tr')

  const versionCell = document.createElement('td')
  versionCell.classList.add('center')

  const code = document.createElement('code')
  code.textContent = versionMetadata.name
  versionCell.appendChild(code)

  versionRow.appendChild(versionCell)

  const statusCell = document.createElement('td')
  statusCell.classList.add('center')

  // Check if the version is downloaded
  const iconCount = await window.extensionStore.getIconCountByIconPackVersion(
    iconPack.name,
    versionMetadata.name
  )
  const isDownloaded = iconCount > 0

  const downloadedTag = document.createElement('sl-tag')
  downloadedTag.setAttribute('variant', 'success')
  downloadedTag.textContent = 'Downloaded'
  statusCell.appendChild(downloadedTag)

  const notDownloadedTag = document.createElement('sl-tag')
  notDownloadedTag.setAttribute('variant', 'neutral')
  notDownloadedTag.textContent = 'Not Downloaded'
  statusCell.appendChild(notDownloadedTag)

  versionRow.appendChild(statusCell)

  const countCell = document.createElement('td')
  countCell.classList.add('center')

  const downloadedCountBadge = document.createElement('sl-badge')
  downloadedCountBadge.setAttribute(
    'variant',
    isDownloaded ? 'success' : 'neutral'
  )
  downloadedCountBadge.setAttribute('pill', '')

  downloadedCountBadge.textContent = iconCount
  countCell.appendChild(downloadedCountBadge)

  versionRow.appendChild(countCell)

  const actionCell = document.createElement('td')
  actionCell.classList.add('center')

  const removeButton = document.createElement('sl-button')
  removeButton.setAttribute('variant', 'danger')
  removeButton.setAttribute('outline', '')
  removeButton.textContent = 'Remove'

  const downloadButton = document.createElement('sl-button')
  downloadButton.setAttribute('variant', 'primary')
  downloadButton.setAttribute('outline', '')
  downloadButton.textContent = 'Download'

  if (isDownloaded) {
    downloadButton.classList.add('display-none')
    notDownloadedTag.classList.add('display-none')
  } else {
    removeButton.classList.add('display-none')
    downloadedTag.classList.add('display-none')
  }

  downloadButton.addEventListener('click', async () => {
    fpLogger.info('Downloading icon pack version')
    toggleLoadingSpinner()

    const iconCount = await window.extensionStore.downloadIconPackVersion(
      iconPack,
      versionMetadata
    )
    downloadedCountBadge.textContent = iconCount

    downloadedCountBadge.setAttribute('variant', 'success')
    downloadedTag.classList.remove('display-none')

    notDownloadedTag.classList.add('display-none')

    downloadButton.classList.add('display-none')
    removeButton.classList.remove('display-none')

    for (const style of iconPack.styles) {
      const iconPackVariant = buildIconPackVariant(
        style.name,
        iconPack.name,
        versionMetadata.name
      )
      document.documentElement.style.setProperty(
        `--icon-pack-variant-${iconPackVariant}`,
        'block'
      )
    }

    await populateIconPackVariantSelector()
    await populateDrawerIcons()

    toggleLoadingSpinner()
  })

  removeButton.addEventListener('click', async () => {
    fpLogger.info('Removing icon pack version')
    toggleLoadingSpinner()

    await window.extensionStore.deleteIconsByIconPackVersion(
      iconPack.name,
      versionMetadata.name
    )
    downloadedCountBadge.textContent = 0

    downloadedCountBadge.setAttribute('variant', 'neutral')
    downloadedTag.classList.add('display-none')

    notDownloadedTag.classList.remove('display-none')

    downloadButton.classList.remove('display-none')
    removeButton.classList.add('display-none')

    for (const style of iconPack.styles) {
      const iconPackVariant = buildIconPackVariant(
        style.name,
        iconPack.name,
        versionMetadata.name
      )
      document.documentElement.style.setProperty(
        `--icon-pack-variant-${iconPackVariant}`,
        'none'
      )
    }

    await populateIconPackVariantSelector()
    await populateDrawerIcons()

    toggleLoadingSpinner()
  })

  actionCell.appendChild(downloadButton)
  actionCell.appendChild(removeButton)

  versionRow.appendChild(actionCell)
  return versionRow
}

async function createIconPackTable (iconPack) {
  fpLogger.verbose('createIconPackTable()')

  const iconPackDiv = document.createElement('div')
  iconPackDiv.classList.add('center')

  const iconPackLink = document.createElement('a')
  iconPackLink.href = iconPack.homepageUrl
  iconPackLink.target = '_blank'
  iconPackLink.rel = 'noopener noreferrer'

  const iconPackTitle = document.createElement('h3')
  iconPackTitle.textContent = iconPack.name.replaceAll('_', ' ')

  iconPackLink.appendChild(iconPackTitle)
  iconPackDiv.appendChild(iconPackLink)

  const headerRow = document.createElement('tr')
  headerRow.classList.add('icon-pack-header')

  const versionHeader = document.createElement('th')
  versionHeader.classList.add('center', 'width-auto')

  const versionDiv = document.createElement('div')
  versionDiv.classList.add('version')

  const versionSpan = document.createElement('span')
  versionSpan.textContent = 'Version'
  versionDiv.appendChild(versionSpan)

  const changelogLink = document.createElement('a')
  changelogLink.href = iconPack.changelogUrl
  changelogLink.target = '_blank'
  changelogLink.rel = 'noopener noreferrer'

  const changelogIconButton = document.createElement('sl-icon-button')
  changelogIconButton.setAttribute('name', 'file-earmark-diff')

  changelogLink.appendChild(changelogIconButton)
  versionDiv.appendChild(changelogLink)

  versionHeader.appendChild(versionDiv)
  headerRow.appendChild(versionHeader)

  const statusHeader = document.createElement('th')
  statusHeader.classList.add('center', 'width-auto')
  statusHeader.textContent = 'Status'
  headerRow.appendChild(statusHeader)

  const countHeader = document.createElement('th')
  countHeader.classList.add('center', 'width-content')
  countHeader.textContent = 'Icon Count'
  headerRow.appendChild(countHeader)

  const actionSubheader = document.createElement('th')
  actionSubheader.classList.add('center', 'width-auto')
  actionSubheader.textContent = 'Action'
  headerRow.appendChild(actionSubheader)

  const tableHeader = document.createElement('thead')
  tableHeader.appendChild(headerRow)

  const tableBody = document.createElement('tbody')

  for await (const versionMetadata of iconPack.versions) {
    const versionRow = await createVersionRow(iconPack, versionMetadata)
    tableBody.appendChild(versionRow)
  }

  const iconPackTable = document.createElement('table')
  iconPackTable.classList.add('icon-pack-table')
  iconPackTable.appendChild(tableHeader)
  iconPackTable.appendChild(tableBody)

  iconPackDiv.appendChild(iconPackTable)
  return iconPackDiv
}

function toggleLoadingSpinner () {
  fpLogger.debug('toggleLoadingSpinner()')

  // Add small delay to avoid race conditions
  setTimeout(() => {
    document
      .querySelector('div > #loading-overlay')
      .classList.toggle('display-none')
  }, 100)
}

async function populateIconPackVariantSelector () {
  fpLogger.debug('populateIconPackVariantSelector()')

  const iconPacksSelect =
    ICON_SELECTOR_DRAWER.querySelector('#icon-packs-select')
  iconPacksSelect.replaceChildren()

  const selectAllOption = document.createElement('sl-option')
  selectAllOption.setAttribute('value', 'all')
  selectAllOption.textContent = 'All packs'
  selectAllOption.addEventListener(
    'click',
    async () => await filterByIconPackVariant('All packs')
  )
  iconPacksSelect.appendChild(selectAllOption)

  const iconPacks = window.extensionStore.getIconPacks()
  for (const iconPack of iconPacks) {
    for await (const versionMetadata of iconPack.versions) {
      if (
        !document.querySelector(
          `svg[icon-pack-name="${iconPack.name}"][icon-pack-version="${versionMetadata.name}"]`
        )
      ) {
        // svg tags don't work with createElement
        const iconPackSvg = document.createElementNS(svgNS, 'svg')

        iconPackSvg.setAttribute('icon-pack-name', iconPack.name)
        iconPackSvg.setAttribute('icon-pack-version', versionMetadata.name)
        iconPackSvg.style.display = 'none'

        document.body.appendChild(iconPackSvg)
      }

      const iconCount =
        await window.extensionStore.getIconCountByIconPackVersion(
          iconPack.name,
          versionMetadata.name
        )
      if (iconCount === 0) continue

      // Add icon pack styles to the select element
      for (const style of iconPack.styles) {
        const selectOption = document.createElement('sl-option')
        const iconPackVariant = buildIconPackVariant(
          style.name,
          iconPack.name,
          versionMetadata.name
        )

        const cssVariableName = `--icon-pack-variant-${iconPackVariant}`
        document.documentElement.style.setProperty(cssVariableName, 'block')

        let styleElement = document.getElementById('icon-pack-variant-styles')
        if (!styleElement) {
          styleElement = document.createElement('style')
          styleElement.id = 'icon-pack-variant-styles'
          document.head.appendChild(styleElement)
        }

        styleElement.textContent += `.${iconPackVariant} { display: var(${cssVariableName}); }`

        selectOption.setAttribute('value', iconPackVariant)
        const formattedIconPackName = iconPack.name.replaceAll('_', ' ')
        const textBefore = document.createTextNode(
          `${formattedIconPackName} ${style.name} (`
        )
        selectOption.appendChild(textBefore)

        const codeElement = document.createElement('code')
        codeElement.textContent = versionMetadata.name
        selectOption.appendChild(codeElement)

        const textAfter = document.createTextNode(')')
        selectOption.appendChild(textAfter)

        iconPacksSelect.appendChild(selectOption)
      }
    }
  }
}

async function applyToolbarLogo () {
  const toolbarLogo = await window.extensionStore.getPreference('toolbarLogo')
  let path = '../img/logo.svg'

  switch (toolbarLogo) {
    case 'monochrome':
      path = '../img/monochrome-logo.svg'
      break
  }

  try {
    browser.browserAction.setIcon({ path })
  } catch (error) {
    fpLogger.verbose('Failed to set toolbar logo', error)
  }
}

async function applyPreferences () {
  fpLogger.debug('getPreferenceMetadata()')

  const preferenceMetadata = {
    lightThemeEnabled: {
      initialize: async () => {
        const storageKey = 'lightThemeEnabled'
        const inputId = '#light-theme-switch'
        const cssVariable = '--light-theme-display'
        const defaultValue = true

        const apply = async value => {
          const isEnabled =
            (value === undefined ? defaultValue : value).toString() === 'true'
          fpLogger.debug(`Setting ${storageKey} to ${value}`)

          const inputElement = document.querySelector(inputId)
          if (inputElement) inputElement.checked = isEnabled

          document.documentElement.style.setProperty(
            cssVariable,
            isEnabled ? 'table-cell' : 'none'
          )

          window.extensionStore.checkAnyThemeEnabled()
        }

        const existingValue = await window.extensionStore.getPreference(
          storageKey
        )
        apply(existingValue)

        const inputElement = document.querySelector(inputId)
        if (!inputElement) return

        inputElement.addEventListener('sl-change', event => {
          const isEnabled = event.target.checked
          window.extensionStore.updatePreference(
            storageKey,
            isEnabled.toString()
          )
          apply(isEnabled)
        })
      }
    },
    darkThemeEnabled: {
      initialize: async () => {
        const storageKey = 'darkThemeEnabled'
        const inputId = '#dark-theme-switch'
        const cssVariable = '--dark-theme-display'
        const defaultValue = true

        const apply = async value => {
          const isEnabled =
            (value === undefined ? defaultValue : value).toString() === 'true'
          fpLogger.debug(`Setting ${storageKey} to ${value}`)

          const inputElement = document.querySelector(inputId)
          if (inputElement) inputElement.checked = isEnabled

          document.documentElement.style.setProperty(
            cssVariable,
            isEnabled ? 'table-cell' : 'none'
          )

          window.extensionStore.checkAnyThemeEnabled()
        }

        const existingValue = await window.extensionStore.getPreference(
          storageKey
        )
        apply(existingValue)

        const inputElement = document.querySelector(inputId)
        if (!inputElement) return

        inputElement.addEventListener('sl-change', event => {
          const isEnabled = event.target.checked
          window.extensionStore.updatePreference(
            storageKey,
            isEnabled.toString()
          )
          apply(isEnabled)
        })
      }
    },
    lightThemeDefaultColor: {
      initialize: async () => {
        const storageKey = 'lightThemeDefaultColor'
        const inputId = '#default-light-theme-color'
        const defaultValue = '#333333'

        const apply = async value => {
          fpLogger.debug(`Setting ${storageKey} to ${value}`)

          await window.extensionStore.updatePreference(storageKey, value)

          const inputElement = document.querySelector(inputId)
          if (inputElement) inputElement.value = value
        }

        const existingValue = await window.extensionStore.getPreference(
          storageKey
        )
        apply(existingValue || defaultValue)

        const inputElement = document.querySelector(inputId)
        if (!inputElement) return

        inputElement.addEventListener('sl-blur', event => {
          event.target.updateComplete.then(() => {
            const color = event.target.input.value
            apply(color)
          })
        })
      }
    },
    darkThemeDefaultColor: {
      initialize: async () => {
        const storageKey = 'darkThemeDefaultColor'
        const inputId = '#default-dark-theme-color'
        const defaultValue = '#cccccc'

        const apply = async value => {
          fpLogger.debug(`Setting ${storageKey} to ${value}`)

          await window.extensionStore.updatePreference(storageKey, value)

          const inputElement = document.querySelector(inputId)
          if (inputElement) inputElement.value = value
        }

        const existingValue = await window.extensionStore.getPreference(
          storageKey
        )
        apply(existingValue || defaultValue)

        const inputElement = document.querySelector(inputId)
        if (!inputElement) return

        inputElement.addEventListener('sl-blur', event => {
          event.target.updateComplete.then(() => {
            const color = event.target.input.value
            apply(color)
          })
        })
      }
    },
    anyThemeDefaultColor: {
      initialize: async () => {
        const storageKey = 'anyThemeDefaultColor'
        const inputId = '#default-any-theme-color'
        const defaultValue = '#808080'

        const apply = async value => {
          fpLogger.debug(`Setting ${storageKey} to ${value}`)

          await window.extensionStore.updatePreference(storageKey, value)

          const inputElement = document.querySelector(inputId)
          if (inputElement) inputElement.value = value
        }

        const existingValue = await window.extensionStore.getPreference(
          storageKey
        )
        apply(existingValue || defaultValue)

        const inputElement = document.querySelector(inputId)
        if (!inputElement) return

        inputElement.addEventListener('sl-blur', event => {
          event.target.updateComplete.then(() => {
            const color = event.target.input.value
            apply(color)
          })
        })
      }
    },
    importPriority: {
      initialize: async () => {
        const storageKey = 'importPriority'
        const inputId = '#import-priority-select'
        const defaultValue = 'lowest-priority'

        const apply = async value => {
          fpLogger.debug(`Setting ${storageKey} to ${value}`)
          await window.extensionStore.updatePreference(storageKey, value)
        }

        const existingValue = await window.extensionStore.getPreference(
          storageKey
        )
        const currentValue = existingValue || defaultValue
        apply(currentValue)

        const inputElement = document.querySelector(inputId)
        if (!inputElement) return

        inputElement.value = currentValue

        inputElement.addEventListener('sl-change', event => {
          event.target.updateComplete.then(async () => {
            apply(event.target.value)
          })
        })
      }
    },
    fpLogLevel: {
      initialize: () => {
        const storageKey = fpLogger.storageKey
        const inputId = '#log-level-select'
        const defaultValue = fpLogger.defaultLogLevel

        const apply = async value => {
          fpLogger.quiet(`Setting ${storageKey} to ${value}`)
          await fpLogger.setLogLevel(value)
        }

        const existingValue = fpLogger.getLogLevelName()
        const currentValue = existingValue || defaultValue

        const inputElement = document.querySelector(inputId)
        inputElement.value = currentValue

        inputElement.addEventListener('sl-change', event => {
          event.target.updateComplete.then(async () => {
            await apply(event.target.value)
          })
        })
      }
    },
    toolbarLogo: {
      initialize: async () => {
        const storageKey = 'toolbarLogo'
        const inputId = '#toolbar-logo-select'
        const defaultValue = 'standard'

        const apply = async value => {
          fpLogger.debug(`Setting ${storageKey} to ${value}`)
          await window.extensionStore.updatePreference(storageKey, value)

          await applyToolbarLogo()
        }

        const existingValue = await window.extensionStore.getPreference(
          storageKey
        )
        const currentValue = existingValue || defaultValue
        apply(currentValue)

        const inputElement = document.querySelector(inputId)
        if (!inputElement) return

        inputElement.value = currentValue

        inputElement.addEventListener('sl-change', event => {
          event.target.updateComplete.then(async () => {
            apply(event.target.value)
          })
        })
      }
    }
  }

  for await (const [name, preference] of Object.entries(preferenceMetadata)) {
    fpLogger.verbose('name', name)
    await preference.initialize()
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  fpLogger.trace('DOMContentLoaded')
  await window.extensionStore.initialize()

  document.querySelector('#extension-version').textContent =
    'v' + browser.runtime.getManifest().version

  await applyPreferences()
  void applyToolbarLogo()

  // Icon selector drawer
  ICON_SELECTOR_DRAWER = document.querySelector('sl-drawer#icon-selector')

  await populateIconPackVariantSelector()

  const iconPacksSelect =
    ICON_SELECTOR_DRAWER.querySelector('#icon-packs-select')
  iconPacksSelect.addEventListener('sl-change', event => {
    event.target.updateComplete.then(async () => {
      fpLogger.info('Filtering by icon pack variant')
      await filterByIconPackVariant(event.target.value)
    })
  })

  const iconDrawerTabGroup = document.querySelector('#icon-drawer-tab-group')
  iconDrawerTabGroup.addEventListener('sl-tab-show', event => {
    fpLogger.debug('Switching tab to icon selector drawer')
    openTabPanels(event.detail.name)
  })

  document
    .querySelector('emoji-picker')
    .addEventListener('emoji-click', async event => {
      fpLogger.debug('Emoji picked')
      fpLogger.verbose('event', event)

      const emoji = event.detail.unicode
      fpLogger.debug('emoji', emoji)

      ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.remove(
        'display-none'
      )

      ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.remove(
        'hidden'
      )

      const emojiDiv = document.createElement('div')
      emojiDiv.classList.add('emoji')
      emojiDiv.innerText = emoji

      ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren(
        emojiDiv
      )
    })

  await populateDrawerIcons()
  await populateDrawerUploads()
  await populateDrawerUrlImports()

  ICON_SELECTOR_DRAWER.querySelector('#clear-icon-button').addEventListener(
    'click',
    () => {
      fpLogger.info('Clear icon button clicked')

      ICON_SELECTOR_DRAWER.querySelectorAll(
        '.upload-list-item sl-radio, .url-import-list-item sl-radio'
      ).forEach(radio => {
        radio.checked = false
      })

      ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent =
        ''
      ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren()
      ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.add(
        'display-none'
      )
      ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.add(
        'hidden'
      )
    }
  )

  ICON_SELECTOR_DRAWER.querySelector('#save-icon-button').addEventListener(
    'click',
    async () => {
      fpLogger.info('Saving icon')

      const selectedCell = ICON_SELECTOR_DRAWER.querySelector('#updated-icon')
      const id = ICON_SELECTOR_DRAWER.getAttribute('data-siteConfig-id')

      const emojiDiv = selectedCell.querySelector('div.emoji')
      const iconElement = selectedCell.querySelector('[icon-id]')
      const uploadElement = selectedCell.querySelector('[upload-id]')
      const urlImportElement = selectedCell.querySelector('[url-import-id]')

      if (emojiDiv) {
        const emoji = emojiDiv.innerText
        fpLogger.debug('Found emoji:', emoji)

        const emojiUrl = await emojiToPngDataUri(emoji)
        fpLogger.verbose('emojiUrl', emojiUrl)

        updateSiteConfig({ id, emojiUrl })
      } else if (iconElement) {
        const iconId = iconElement.getAttribute('icon-id')
        fpLogger.debug('iconId', iconId)

        updateSiteConfig({ id, iconId })
      } else if (uploadElement) {
        const uploadId = uploadElement.getAttribute('upload-id')
        fpLogger.debug('uploadId', uploadId)

        updateSiteConfig({ id, uploadId })
      } else if (urlImportElement) {
        const urlImportId = urlImportElement.getAttribute('url-import-id')
        fpLogger.debug('urlImportId', urlImportId)

        updateSiteConfig({ id, urlImportId })
      }

      ICON_SELECTOR_DRAWER.querySelector('#current-icon').replaceChildren(
        selectedCell.firstChild
      )
      selectedCell.replaceChildren()

      ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.add(
        'display-none'
      )
      ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.add(
        'hidden'
      )

      ICON_SELECTOR_DRAWER.hide()
    }
  )

  ICON_SELECTOR_DRAWER.querySelector('#search-input').addEventListener(
    'sl-input',
    event => {
      event.target.updateComplete.then(() => {
        fpLogger.debug('Search input event fired')
        const searchQuery = event.target.input.value
        filterDrawerIcons(searchQuery)
      })
    }
  )

  ICON_SELECTOR_DRAWER.querySelector('#upload > button').addEventListener(
    'click',
    async event => {
      event.preventDefault()
      fpLogger.debug('Upload button clicked')

      const fileInput = ICON_SELECTOR_DRAWER.querySelector('#icon-upload-input')
      const file = fileInput.files[0]

      if (!file) return

      async function fileToDataUri (file) {
        return new Promise((resolve, reject) => {
          const reader = new window.FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(file)
        })
      }

      try {
        const name = file.name
        const dataUri = await fileToDataUri(file)
        const upload = await window.extensionStore.addUpload({ name, dataUri })

        const imagePreview = document.createElement('img')
        imagePreview.src = upload.dataUri
        imagePreview.setAttribute('upload-id', upload.id)

        ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren(
          imagePreview
        )
        ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent =
          upload.name

        // Show unsaved changes UI
        ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.remove(
          'display-none'
        )
        ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.remove(
          'hidden'
        )

        // Clear the file input
        fileInput.value = ''

        await populateDrawerUploads()
      } catch (error) {
        fpLogger.error('Failed to convert file to data URI', error)
        fileInput.value = ''
      }
    }
  )

  ICON_SELECTOR_DRAWER.querySelector(
    '.url-input-row > sl-button'
  ).addEventListener('click', async event => {
    event.preventDefault()
    fpLogger.silent('Import button clicked')

    const urlInput = ICON_SELECTOR_DRAWER.querySelector(
      '#icon-url-import-input'
    )
    const url = urlInput.value
    fpLogger.debug('url', url)

    // Fetch the image from the URL and turn it into a data URI
    function urlToDataUri (url) {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const dataUri = canvas.toDataURL('image/png')
          resolve(dataUri)
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = url
      })
    }

    const dataUri = await urlToDataUri(url)
    const urlImport = await window.extensionStore.addUrlImport({ url, dataUri })
    fpLogger.verbose('urlImport', urlImport)

    const imagePreview = document.createElement('img')
    imagePreview.src = urlImport.dataUri
    imagePreview.setAttribute('url-import-id', urlImport.id)

    ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren(
      imagePreview
    )
    // ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent =
    //   upload.name

    // Show unsaved changes UI
    ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.remove(
      'display-none'
    )
    ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.remove(
      'hidden'
    )

    // Clear the URL input
    urlInput.value = ''

    await populateDrawerUrlImports()
  })

  document
    .querySelector('#pattern-type-header sl-icon-button')
    .addEventListener('click', () => {
      fpLogger.debug('Opening pattern type drawer')
      document.querySelector('#pattern-types').show()
    })

  const siteConfigs = await window.extensionStore.getSiteConfigs()
  fpLogger.debug('siteConfigs', siteConfigs)

  await populateTable(siteConfigs)
  updateRecordsSummary(siteConfigs)

  const selectAllButton = document.querySelector('#select-all')
  selectAllButton.addEventListener('sl-change', event => {
    fpLogger.debug('Select all button clicked')
    const isChecked = event.target.checked

    document
      .querySelectorAll('sl-checkbox.select-all-target')
      .forEach(checkbox => {
        if (isChecked) {
          checkbox.setAttribute('checked', '')
        } else {
          checkbox.removeAttribute('checked')
        }
      })
  })

  const checkboxObserver = new window.MutationObserver(() => {
    let checkedCount = 0
    const checkboxes = document.querySelectorAll(
      'tr:not(#template-row) sl-checkbox.select-all-target'
    )
    const totalCheckboxes = checkboxes.length

    for (const checkbox of checkboxes) {
      if (checkbox.hasAttribute('checked')) checkedCount++
    }

    if (checkedCount === 0) {
      selectAllButton.removeAttribute('checked')
      selectAllButton.removeAttribute('indeterminate')
      document.querySelector('#selected-actions').classList.add('display-none')
    } else if (checkedCount === totalCheckboxes) {
      selectAllButton.setAttribute('checked', '')
      selectAllButton.removeAttribute('indeterminate')
      document
        .querySelector('#selected-actions')
        .classList.remove('display-none')
    } else {
      selectAllButton.removeAttribute('checked')
      selectAllButton.setAttribute('indeterminate', '')
      document
        .querySelector('#selected-actions')
        .classList.remove('display-none')
    }

    // Hide buttons that require a single selection
    document.querySelectorAll('.single-limited-action').forEach(element => {
      if (checkedCount > 1) {
        element.classList.add('display-none')
      } else {
        element.classList.remove('display-none')
      }
    })
  })

  const observeCheckboxes = () => {
    document
      .querySelectorAll('sl-checkbox.select-all-target')
      .forEach(checkbox => {
        checkboxObserver.observe(checkbox, {
          attributes: true,
          attributeFilter: ['checked']
        })
      })
  }

  // Initial observation
  observeCheckboxes()

  const tableObserver = new window.MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          const checkboxes = node.querySelectorAll(
            'sl-checkbox.select-all-target'
          )
          if (checkboxes.length) observeCheckboxes()
        }
      })
    })
  })

  // Start observing the table for added rows
  tableObserver.observe(document.querySelector('#siteConfigs tbody'), {
    childList: true,
    subtree: true
  })

  // Action buttons
  const createDropdown = document.querySelector('#create-dropdown')
  createDropdown.addEventListener('sl-select', async event => {
    fpLogger.info('Create button clicked')

    const lightThemeDefaultColor = await window.extensionStore.getPreference(
      'lightThemeDefaultColor'
    )
    const darkThemeDefaultColor = await window.extensionStore.getPreference(
      'darkThemeDefaultColor'
    )
    const anyThemeDefaultColor = await window.extensionStore.getPreference(
      'anyThemeDefaultColor'
    )

    const siteConfig = await window.extensionStore.addSiteConfig({
      patternType: 0, // Default to "Simple Match"
      active: 1, // Default to active
      lightThemeColor: lightThemeDefaultColor,
      darkThemeColor: darkThemeDefaultColor,
      anyThemeColor: anyThemeDefaultColor
    })

    const priority = event.detail.item.value

    const siteConfigsOrder = await window.extensionStore.getPreference(
      'siteConfigsOrder'
    )
    fpLogger.debug('siteConfigsOrder', siteConfigsOrder)

    let tablePosition

    if (priority === 'highest-priority') {
      siteConfigsOrder.unshift(siteConfig.id)
      tablePosition = 'first'

      // Update first row to remove .hidden from .increment
      document
        .querySelector(':nth-child(1 of .siteConfig-row .increment)')
        ?.classList.remove('hidden')
    } else {
      siteConfigsOrder.push(siteConfig.id)
      tablePosition = 'last'

      // Update last row to remove .hidden from .decrement
      document
        .querySelector('.siteConfig-row:last-child .decrement')
        ?.classList.remove('hidden')
    }

    await window.extensionStore.updatePreference(
      'siteConfigsOrder',
      siteConfigsOrder
    )

    document.querySelector('.no-data-row').classList.add('display-none')
    await populateTableRow(siteConfig, true, tablePosition)

    const siteConfigs = await window.extensionStore.getSiteConfigs()
    updateRecordsSummary(siteConfigs)
  })

  function getRowsChecked () {
    const rowsChecked = Array.from(
      document.querySelectorAll(
        'tr:not(#template-row):has(sl-checkbox.select-all-target[checked])'
      )
    )

    const ids = rowsChecked.map(element => element.id.split('row-')[1])

    return { rowsChecked, ids }
  }

  async function deleteSiteConfigRows (rows, ids) {
    const siteConfigsOrder = await window.extensionStore.getPreference(
      'siteConfigsOrder'
    )
    fpLogger.debug('siteConfigsOrder', siteConfigsOrder)

    await window.extensionStore.updatePreference(
      'siteConfigsOrder',
      siteConfigsOrder.filter(id => !ids.includes(id))
    )

    await window.extensionStore.deleteSiteConfigs(ids)
    rows.forEach(row => row.remove())

    selectAllButton.removeAttribute('checked')
    selectAllButton.removeAttribute('indeterminate')

    const siteConfigs = await window.extensionStore.getSiteConfigs()
    await populateTable(siteConfigs)
  }

  document
    .querySelector('#delete-action-button')
    .addEventListener('click', async () => {
      fpLogger.debug('Delete button clicked')
      const { rowsChecked, ids } = getRowsChecked()

      const deleteCount = ids.length
      if (deleteCount > 2) {
        showDeleteConfirmationDialog(
          () => deleteSiteConfigRows(rowsChecked, ids),
          `Are you sure you want to delete ${deleteCount} site configurations?`
        )
      } else {
        await deleteSiteConfigRows(rowsChecked, ids)
      }

      document.querySelector('#selected-actions').classList.add('display-none')
    })

  document
    .querySelector('#activate-action-button')
    .addEventListener('click', async () => {
      fpLogger.debug('Activate button clicked')
      const { rowsChecked } = getRowsChecked()

      rowsChecked.forEach(row => {
        row.querySelector('.active-cell sl-switch:not([checked])')?.click()
        row.querySelector('sl-checkbox').removeAttribute('checked')
      })
    })

  document
    .querySelector('#deactivate-action-button')
    .addEventListener('click', async () => {
      fpLogger.debug('Deactivate button clicked')
      const { rowsChecked } = getRowsChecked()

      for (const row of rowsChecked) {
        row.querySelector('.active-cell sl-switch[checked]')?.click()
        row.querySelector('sl-checkbox').removeAttribute('checked')
      }
    })

  document
    .querySelector('#duplicate-action-button')
    .addEventListener('click', async () => {
      fpLogger.debug('Duplicate button clicked')
      const { rowsChecked, ids } = getRowsChecked()

      if (rowsChecked.length !== 1) return
      const id = ids[0]

      const siteConfig = await window.extensionStore.getSiteConfigById(id)
      delete siteConfig.id

      const newSiteConfig = await window.extensionStore.addSiteConfig(
        siteConfig
      )

      const siteConfigsOrder = await window.extensionStore.getPreference(
        'siteConfigsOrder'
      )
      fpLogger.debug('siteConfigsOrder', siteConfigsOrder)

      const siteConfigsOrderPriority = await getPriority(id)
      siteConfigsOrder.splice(siteConfigsOrderPriority + 1, 0, newSiteConfig.id)
      await window.extensionStore.updatePreference(
        'siteConfigsOrder',
        siteConfigsOrder
      )

      const row = rowsChecked[0]
      row.querySelector('.active-cell sl-switch[checked]')?.click()

      const siteConfigs = await window.extensionStore.getSiteConfigs()
      await populateTable(siteConfigs)

      selectAllButton.removeAttribute('checked')
      selectAllButton.removeAttribute('indeterminate')
    })

  document
    .querySelector('#import-action-button')
    .addEventListener('click', async event => {
      event.preventDefault()

      fpLogger.debug('Import button clicked')

      const inputElement = document.querySelector('#import-file-input')

      // Remove any existing event listeners by cloning the element
      const newInputElement = inputElement.cloneNode(true)
      inputElement.parentNode.replaceChild(newInputElement, inputElement)

      newInputElement.addEventListener('change', async () => {
        fpLogger.debug(
          'newInputElement.files.length',
          newInputElement.files.length
        )

        if (!newInputElement.files.length) {
          fpLogger.info('No file selected')
          return
        }

        const file = newInputElement.files[0]
        const fileUrl = URL.createObjectURL(file)

        const response = await fetch(fileUrl)
        fpLogger.debug('response', response)

        if (!response.ok) {
          fpLogger.error('Failed to fetch file', response.statusText)
          return
        }

        const responseString = await response.text()
        fpLogger.verbose('responseString', responseString)

        const idbDatabase = window.extensionStore.getDatabase()
        fpLogger.verbose('idbDatabase', idbDatabase)

        const imports = await window.importFromJson(idbDatabase, responseString)
        fpLogger.debug('imports', imports)

        const siteConfigsOrder = await window.extensionStore.getPreference(
          'siteConfigsOrder'
        )
        fpLogger.debug('siteConfigsOrder', siteConfigsOrder)

        const importedIds = imports?.imported?.siteConfigs?.ids || []

        const importPriority = await window.extensionStore.getPreference(
          'importPriority'
        )
        fpLogger.debug('importPriority', importPriority)

        let newSiteConfigsOrder

        if (importPriority === 'highest-priority') {
          newSiteConfigsOrder = importedIds.concat(siteConfigsOrder)
        } else {
          newSiteConfigsOrder = siteConfigsOrder.concat(importedIds)
        }

        fpLogger.debug('newSiteConfigsOrder', newSiteConfigsOrder)
        await window.extensionStore.updatePreference(
          'siteConfigsOrder',
          newSiteConfigsOrder
        )

        const siteConfigs = await window.extensionStore.getSiteConfigs()
        fpLogger.debug('siteConfigs', siteConfigs)

        await populateTable(siteConfigs)
        updateRecordsSummary(siteConfigs)
        applyPreferences()

        // Clear the file input
        newInputElement.value = ''
      })

      newInputElement.click()
    })

  const exportDropdown = document.querySelector('#export-dropdown')
  exportDropdown.addEventListener('sl-select', async event => {
    fpLogger.info('Export button clicked')

    const exportType = event.detail.item.value
    fpLogger.debug('exportType', exportType)

    const excludeStores = ['icons']
    if (exportType === 'site-configs') excludeStores.push('preferences')
    fpLogger.debug('excludeStores', excludeStores)

    const idbDatabase = window.extensionStore.getDatabase()
    window
      .exportToJson(idbDatabase, excludeStores)
      .then(jsonString => {
        fpLogger.verbose('jsonString', jsonString)

        const blob = new Blob([jsonString], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const downloadLink = document.createElement('a')
        downloadLink.href = url
        const formattedExtensionName = fpLogger.extensionName.replaceAll(
          ' ',
          '-'
        )
        downloadLink.download = `${formattedExtensionName}-export-${Date.now()}.json`

        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)

        setTimeout(() => URL.revokeObjectURL(url), 100)
      })
      .catch(error => {
        fpLogger.error('Failed to export data', error)
      })
  })

  const settingsDialog = document.querySelector('#settings-dialog')
  document
    .querySelector('#open-settings-button')
    .addEventListener('click', async () => {
      fpLogger.debug('Open settings button clicked')
      settingsDialog.show()
    })

  const iconPacksDiv = document.querySelector('#icon-packs-tables')
  fpLogger.debug('iconPacksDiv', iconPacksDiv)

  const iconPacks = window.extensionStore.getIconPacks()
  for await (const iconPack of iconPacks) {
    const iconPackTable = await createIconPackTable(iconPack)
    iconPacksDiv.appendChild(iconPackTable)
  }

  document.documentElement.style.setProperty('--table-row-display', 'table-row')

  // Lastly, remove loading indicators
  document
    .querySelectorAll('.skeleton-row')
    .forEach(row => row.classList.toggle('display-none'))
  toggleLoadingSpinner()
})

// Theme selector
;(() => {
  function getTheme () {
    return window.localStorage.getItem('theme') || 'auto'
  }

  function isDark () {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme === 'dark'
  }

  function setTheme (newTheme) {
    theme = newTheme
    window.localStorage.setItem('theme', theme)

    // Update the UI
    updateSelection()

    // Toggle the dark mode class
    document.documentElement.classList.toggle('sl-theme-dark', isDark())
  }

  function updateSelection () {
    const menu = document.querySelector('#theme-selector sl-menu')
    if (!menu) return
    ;[...menu.querySelectorAll('sl-menu-item')].map(
      item => (item.checked = item.getAttribute('value') === theme)
    )
  }

  let theme = getTheme()

  // Selection is not preserved when changing page, so update when opening dropdown
  document.addEventListener('sl-show', event => {
    const themeSelector = event.target.closest('#theme-selector')
    if (!themeSelector) return
    updateSelection()
  })

  // Listen for selections
  document.addEventListener('sl-select', event => {
    const menu = event.target.closest('#theme-selector sl-menu')
    if (!menu) return
    setTheme(event.detail.item.value)
  })

  // Update the theme when the preference changes
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => setTheme(theme))

  // Toggle with backslash
  document.addEventListener('keydown', event => {
    if (
      event.key === '\\' &&
      !event
        .composedPath()
        .some(el => ['input', 'textarea'].includes(el?.tagName?.toLowerCase()))
    ) {
      event.preventDefault()
      setTheme(isDark() ? 'light' : 'dark')
    }
  })

  // Set the initial theme and sync the UI
  setTheme(theme)
})()
