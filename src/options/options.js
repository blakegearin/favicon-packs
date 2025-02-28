console.log("Favicon Packs: options.js loaded");

let ICON_SELECTOR_DRAWER;

function svgToPngBase64(svgString) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');

      // Ensure valid dimensions
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      if (canvas.width === 0 || canvas.height === 0) {
        URL.revokeObjectURL(url);
        reject(new Error('Invalid SVG dimensions - width and height must be greater than 0'));
        return;
      }

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      URL.revokeObjectURL(url);

      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Failed to generate PNG blob'));
            return;
          }

          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        },
        'image/png',
      );
    };

    img.onerror = function(error) {
      URL.revokeObjectURL(url);
      console.error(error);
      reject(new Error('Failed to load SVG image'));
    };

    img.src = url;
  });
}

function buildUploadImg(upload) {
  const iconImage = document.createElement("img");
  iconImage.src = upload.dataUri;
  // iconImage.src = "dataUriValue";
  iconImage.setAttribute('upload-id', upload.id);

  return iconImage;
}

function buildSvgSprite(icon, size = 40) {
  // console.log("buildSvgSprite");

  const svgNS = "http://www.w3.org/2000/svg";

  /// svg tags don't work with createElement
  const iconSvg = document.createElementNS(svgNS, "svg");
  iconSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  iconSvg.setAttribute("viewBox", "0 0 512 512");
  iconSvg.setAttribute("icon-id", icon.id);

  iconSvg.setAttribute("width", size.toString());
  iconSvg.setAttribute("height", size.toString());

  // use tags don't work with createElement
  const iconUse = document.createElementNS(svgNS, 'use');
  iconUse.setAttribute("href", `#${icon.id}`);
  iconUse.setAttribute("xlink:href", `#${icon.id}`);

  iconSvg.appendChild(iconUse);

  return iconSvg;
}

function createFaviconSprite(icon, siteConfig, theme = null) {
  // console.log("createFaviconSprite");

  // console.log(`theme`);
  // console.dir(theme, { depth: null });

  const svgSprite = buildSvgSprite(icon, 1000);
  svgSprite.innerHTML += icon.symbol;

  const styleElement = document.createElement('style');

  switch (icon.iconPackName) {
    case 'Ionicons':
      styleElement.textContent = `.ionicon { fill: currentColor; stroke: currentColor; } .ionicon-fill-none { fill: none; } .ionicon-stroke-width { stroke-width: 32px; }`;
      break;
    case 'Font_Awesome':
      styleElement.textContent = `.font-awesome { fill: currentColor; stroke: currentColor; }`;
      break;
  }

  svgSprite.insertBefore(styleElement, svgSprite.firstChild);

  if (theme === "dark") {
    svgSprite.style.setProperty("color", siteConfig.darkThemeColor);
  } else if (theme !== null) {
    svgSprite.style.setProperty("color", siteConfig.lightThemeColor);
  }

  const serializer = new XMLSerializer();
  const updatedSvgString = serializer.serializeToString(svgSprite);

  // console.log(`updatedSvgString`);
  // console.dir(updatedSvgString, { depth: null });

  return updatedSvgString;
}

async function populateDrawerIcons() {
  const icons = await window.extensionStore.getIcons();
  const iconListFragment = document.createDocumentFragment();
  const iconSymbols = {};

  // console.log(`icons`);
  // console.dir(icons, { depth: null });

  const sortedIcons = icons.sort((a, b) => a.name.localeCompare(b.name));
  for (const icon of sortedIcons) {
    const tooltip = document.createElement('sl-tooltip');
    tooltip.setAttribute('content', `${icon.iconPackName.replace('_', ' ')} ${icon.name}`);

    if (icon.tags) tooltip.setAttribute('tags', icon.tags.join(' '));

    tooltip.classList.add(`icon-style-${icon.iconPackName}-${icon.style}`);

    const iconDiv = document.createElement('div');
    iconDiv.classList.add('icon-list-item');

    const svgSprite = buildSvgSprite(icon);

    tooltip.onclick = () => {
      ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.remove('display-none');

      ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.remove('hidden');
      ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren(svgSprite.cloneNode(true));
    }

    iconDiv.appendChild(svgSprite);
    tooltip.appendChild(iconDiv);
    iconListFragment.appendChild(tooltip);

    const [iconPackName, iconPackVersion] = icon.id.split('-');
    const iconPackSvgSelector = `svg[icon-pack-name="${iconPackName}"][icon-pack-version="${iconPackVersion}"]`;

    if (iconSymbols[iconPackSvgSelector]) {
      iconSymbols[iconPackSvgSelector].push(icon.symbol);
    } else {
      iconSymbols[iconPackSvgSelector] = [icon.symbol];
    }
  };

  const iconList = ICON_SELECTOR_DRAWER.querySelector('.icon-list');
  iconList.replaceChildren(iconListFragment);

  // console.log(`iconSymbols`);
  // console.dir(iconSymbols, { depth: null });

  for (let [selector, symbols] of Object.entries(iconSymbols)) {
    const iconPackSvg = document.querySelector(selector);

    if (!iconPackSvg) {
      console.error(`Icon pack SVG not found: ${selector}`);
      continue;
    }

    iconPackSvg.innerHTML = symbols.join('');
  };
}

async function getSiteConfigsByUpload(uploadId) {
  const siteConfigs = await window.extensionStore.getSiteConfigs();
  return siteConfigs.filter(siteConfig => siteConfig.uploadId?.toString() === uploadId?.toString());
}

async function populateDrawerUploads() {
  const uploads = await window.extensionStore.getUploads();
  const uploadListFragment = document.createDocumentFragment();

  const headerDiv = document.createElement('div');
  headerDiv.slot = 'header';

  const footerDiv = document.createElement('div');
  footerDiv.slot = 'footer';

  const deleteButton = document.createElement('sl-icon-button');
  deleteButton.setAttribute('name', 'trash');
  deleteButton.setAttribute('label', 'Delete');
  deleteButton.classList.add('delete-upload');

  const selectRadio = document.createElement('sl-radio');
  selectRadio.setAttribute('size', 'large');

  for (const upload of uploads) {
    const cardElement = document.createElement('sl-card');
    cardElement.classList.add('upload-list-item');

    const uploadHeaderDiv = headerDiv.cloneNode();
    uploadHeaderDiv.textContent = upload.name;
    cardElement.appendChild(uploadHeaderDiv);

    const iconImage = buildUploadImg(upload);
    cardElement.appendChild(iconImage);

    const uploadFooterDiv = footerDiv.cloneNode(true);

    const deleteTooltip = document.createElement('sl-tooltip');
    deleteTooltip.setAttribute('content', 'Delete');

    const uploadDeleteButton = deleteButton.cloneNode(true);
    uploadDeleteButton.addEventListener('click', async () => {
      const relatedSiteConfigs = await getSiteConfigsByUpload(upload.id);
      const usageCount = relatedSiteConfigs.length;

      // console.log(`relatedSiteConfigs`);
      // console.dir(relatedSiteConfigs, { depth: null });

      const uploadDate = new Date(parseInt(upload.id, 10));
      const formattedDate = `${uploadDate.getFullYear()}-${String(uploadDate.getMonth() + 1).padStart(2, '0')}-${String(uploadDate.getDate()).padStart(2, '0')} at ${String(uploadDate.getHours()).padStart(2, '0')}:${String(uploadDate.getMinutes()).padStart(2, '0')}`;

      let confirmationText = `Are you sure you want to delete this file?

      Name: ${upload.name}

      Uploaded: ${formattedDate}`;

      if (usageCount) {
        const rowText = usageCount === 1 ? 'row' : 'rows';
        confirmationText += `

        It's used by ${usageCount} ${rowText} as their icon, which will be impacted.`;
      }

      showDeleteConfirmationDialog(
        async () => {
          await window.extensionStore.deleteUpload(upload.id);

          const siteConfigs = await window.extensionStore.getSiteConfigs();
          for (const config of siteConfigs) {
            if (config.uploadId === upload.id) {
              await updateSiteConfig({
                id: config.id,
                uploadId: null
              });
            }
          }

          ICON_SELECTOR_DRAWER.querySelector('#updated-icon').innerHTML = '';
          ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.add('display-none');
          ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.add('hidden');
          ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent = '';
          await populateDrawerUploads();
        },
        confirmationText,
      );
    });

    deleteTooltip.appendChild(uploadDeleteButton);
    uploadFooterDiv.appendChild(deleteTooltip);

    const selectTooltip = document.createElement('sl-tooltip');
    selectTooltip.setAttribute('content', 'Select');

    const uploadSelectRadio = selectRadio.cloneNode(true);

    const updatedIconUploadId = ICON_SELECTOR_DRAWER.querySelector('#updated-icon img')?.getAttribute('upload-id');

    // console.log(`updatedIconUploadId`);
    // console.dir(updatedIconUploadId);

    if (updatedIconUploadId?.toString() === upload.id.toString()) uploadSelectRadio.checked = true;

    uploadSelectRadio.addEventListener('click', async () => {
      ICON_SELECTOR_DRAWER.querySelectorAll('.upload-list-item sl-radio').forEach(radio => {
        if (radio !== uploadSelectRadio) radio.checked = false;
      });
      uploadSelectRadio.checked = true;

      const imagePreview = buildUploadImg(upload);
      ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren(imagePreview);

      ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent = upload.name;
      ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.remove('display-none');
      ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.remove('hidden');
    });

    selectTooltip.appendChild(uploadSelectRadio);
    uploadFooterDiv.appendChild(selectTooltip);

    cardElement.appendChild(uploadFooterDiv);
    uploadListFragment.appendChild(cardElement);
  }

  const uploadList = ICON_SELECTOR_DRAWER.querySelector('.upload-list');
  uploadList.replaceChildren(uploadListFragment);
}

function updatePriorityOrder(siteConfigsOrder) {
  return localStorage.setItem('siteConfigsOrder', JSON.stringify(siteConfigsOrder));
}

function getSiteConfigsOrder() {
  return JSON.parse(localStorage.getItem('siteConfigsOrder')) || [];
}

function getPriority(id) {
  const siteConfigsOrder = getSiteConfigsOrder();
  return siteConfigsOrder.indexOf(id);
}

function filterByStyle(styleName) {
  // console.log('filterByStyle')

  // console.log(`styleName`);
  // console.dir(styleName, { depth: null });

  const iconStyles = [
    'Ionicons-Outline',
    'Ionicons-Filled',
    'Ionicons-Sharp',
    'Font_Awesome-Regular',
    'Font_Awesome-Solid',
    'Font_Awesome-Brands',
  ];

  for (const iconStyle of iconStyles) {
    document.documentElement.style.setProperty(
      `--icon-style-${iconStyle}`,
      ['All', iconStyle].includes(styleName) ? 'block' : 'none'
    );
  }

  // document.documentElement.style.setProperty(
  //   '--icon-style-outline',
  //   ['Outline', 'All'].includes(styleName) ? 'block' : 'none'
  // );
  // document.documentElement.style.setProperty(
  //   '--icon-style-filled',
  //   ['Filled', 'All'].includes(styleName) ? 'block' : 'none'
  // );
  // document.documentElement.style.setProperty(
  //   '--icon-style-sharp',
  //   ['Sharp', 'All'].includes(styleName) ? 'block' : 'none'
  // );
}

function filterDrawerIcons(filter) {
  // console.log(`filter`);
  // console.dir(filter, { depth: null });

  ICON_SELECTOR_DRAWER.querySelectorAll('sl-tooltip').forEach((icon) => {
    let passes = false;

    if (filter) {
      const name = icon.getAttribute('content');
      const tags = icon.getAttribute('tags');

      if (filter instanceof RegExp) {
        if (filter.test(name)) passes = true;
      } else {
        if (name.includes(filter) && tags.includes(filter)) passes = true;
      }
    } else {
      passes = true;
    }

    if (passes) {
      icon.classList.remove('display-none');
    } else {
      icon.classList.add('display-none');
    }
  });

}

async function updateSiteConfig({ id, patternType, websitePattern, iconId, uploadId, lightThemeColor, darkThemeColor, lightPngUrl, darkPngUrl, active }) {
  // console.log('updateSiteConfig');

  const existingSiteConfig = await window.extensionStore.getSiteConfigById(id);
  const activeDefined = active !== undefined;

  const newSiteConfig = {
    id,
    patternType: patternType || existingSiteConfig.patternType,
    websitePattern: websitePattern || existingSiteConfig.websitePattern,
    iconId: iconId || existingSiteConfig.iconId,
    uploadId: uploadId || existingSiteConfig.uploadId,
    lightThemeColor: lightThemeColor || existingSiteConfig.lightThemeColor,
    darkThemeColor: darkThemeColor || existingSiteConfig.darkThemeColor,
    lightPngUrl: existingSiteConfig.lightPngUrl,
    darkPngUrl: existingSiteConfig.darkPngUrl,
    active: activeDefined ? active : existingSiteConfig.active,
  };

  if (iconId || lightThemeColor || darkThemeColor) {
    const icon = newSiteConfig.iconId ? await window.extensionStore.getIconById(newSiteConfig.iconId) : null;

    if (iconId || lightThemeColor) {
      const faviconSpriteLight = createFaviconSprite(icon, newSiteConfig, 'light');
      const lightPngUrl = await svgToPngBase64(faviconSpriteLight);
      newSiteConfig.lightPngUrl = lightPngUrl;
    }

    if (iconId || darkThemeColor) {
      const faviconSpriteDark = createFaviconSprite(icon, newSiteConfig, 'dark');
      const darkPngUrl = await svgToPngBase64(faviconSpriteDark);
      newSiteConfig.darkPngUrl = darkPngUrl;
    }
  }

  // console.log(`newSiteConfig`);
  // console.dir(newSiteConfig, { depth: null });

  const updatedSiteConfig = await window.extensionStore.updateSiteConfig(newSiteConfig);

  if (activeDefined) {
    const siteConfigs = await window.extensionStore.getSiteConfigs();
    updateRecordsSummary(siteConfigs);
  } else {
    void populateTableRow(updatedSiteConfig, false);
  }
}

function updateRecordsSummary(siteConfigs) {
  document.querySelector('#siteConfigs-length').innerText = siteConfigs.length;
  document.querySelector('#active-siteConfigs-length').innerText =
    siteConfigs.filter(siteConfig => siteConfig.active)?.length || 0;
}

async function swapPriorities(record1Id, direction) {
  const siteConfigsOrder = getSiteConfigsOrder();
  const currentIndex = siteConfigsOrder.indexOf(record1Id);

  if (currentIndex === -1 ||
    (direction === 'increment' && currentIndex === 0) ||
    (direction === 'decrement' && currentIndex === siteConfigsOrder.length - 1)) {
    return;
  }

  const targetIndex = direction === 'increment' ? currentIndex - 1 : currentIndex + 1;
  const record2Id = siteConfigsOrder[targetIndex];
  // const record2 = siteConfigs.find(siteConfig => siteConfig.id === record2Id);
  const record2 = await window.extensionStore.getSiteConfigById(record2Id);

  [siteConfigsOrder[currentIndex], siteConfigsOrder[targetIndex]] =
    [siteConfigsOrder[targetIndex], siteConfigsOrder[currentIndex]];
  localStorage.setItem('siteConfigsOrder', JSON.stringify(siteConfigsOrder));

  const tr1 = document.querySelector(`#row-${record1Id}`);
  const tr2 = document.querySelector(`#row-${record2.id}`);
  if (!tr1 || !tr2) return;

  if (direction === 'increment') {
    tr2.parentNode.insertBefore(tr1, tr2);
  } else {
    tr2.parentNode.insertBefore(tr2, tr1);
  }

  await setPriorityButtonVisibility(tr1, targetIndex);
  await setPriorityButtonVisibility(tr2, currentIndex);
}

async function setPriorityButtonVisibility(row, priority) {
  const siteConfigs = await window.extensionStore.getSiteConfigs();
  const incrementButton = row.querySelector('.increment');
  const decrementButton = row.querySelector('.decrement');

  if (priority === 0) {
    incrementButton.classList.add('hidden');

    if (siteConfigs.length > 1) {
      decrementButton.classList.remove('hidden');
    } else {
      decrementButton.classList.add('hidden');
    }
  } else if (priority === (siteConfigs.length - 1)) {
    incrementButton.classList.remove('hidden');
    decrementButton.classList.add('hidden');
  } else {
    incrementButton.classList.remove('hidden');
    decrementButton.classList.remove('hidden');
  }
}

async function populateTableRow(siteConfig, insertion) {
  // console.log('populateTableRow');

  const id = siteConfig.id;
  const rowId = `row-${id}`;
  const templateRow = document.querySelector('#template-row');
  let newRow;

  if (insertion) {
    newRow = templateRow.cloneNode(true);
    newRow.id = rowId;
    newRow.classList.remove('display-none');
    newRow.classList.add('siteConfig-row');
  } else {
    newRow = document.querySelector(`#${rowId}`);
  }

  // Priority column
  const incrementButton = newRow.querySelector('.increment');
  const decrementButton = newRow.querySelector('.decrement');

  const priority = getPriority(id);
  await setPriorityButtonVisibility(newRow, priority);

  incrementButton.addEventListener('click', () => {
    void swapPriorities(siteConfig.id, 'increment');
  });
  decrementButton.addEventListener('click', () => {
    void swapPriorities(siteConfig.id, 'decrement');
  });

  // Pattern Type column
  const patternTypeTag = newRow.querySelector('.type-cell sl-tag');
  patternTypeTag.innerText = siteConfig.patternType;

  const variantValue = siteConfig.patternType === 'Regex Match' ? 'warning' : 'primary';
  patternTypeTag.setAttribute('variant', variantValue);

  const toggleTypeButton = newRow.querySelector('.toggle-type');
  toggleTypeButton.addEventListener('click', () => {
    const patternType = siteConfig.patternType === 'Simple Match' ? 'Regex Match' : 'Simple Match';
    updateSiteConfig({ id, patternType });
  });

  // Site Match column
  newRow.querySelector('.site-match-value').innerText = siteConfig.websitePattern;
  newRow.querySelector('.site-match-value-copy').setAttribute('value', siteConfig.websitePattern);

  const siteRead = newRow.querySelector('.site-cell.read');
  const siteEdit = newRow.querySelector('.site-cell.edit');
  const siteMatchInput = newRow.querySelector('.site-cell sl-input');

  if (siteConfig.websitePattern) {
    siteMatchInput.value = siteConfig.websitePattern;

    siteRead.classList.remove('display-none');
    siteEdit.classList.add('display-none');
  } else {
    siteRead.classList.add('display-none');
    siteEdit.classList.remove('display-none');
  }

  const editSiteButton = newRow.querySelector('.site-cell .edit-site');

  // addEventListener does not allow editing multiple times
  editSiteButton.onclick = () => {
    // console.log('editSiteButton clicked');

    siteRead.classList.toggle('display-none');
    siteEdit.classList.toggle('display-none');

    siteEdit.querySelector('sl-input').focus();
  };

  const form = newRow.querySelector('.site-cell.edit');

  Promise.all([
    customElements.whenDefined('sl-input'),
  ]).then(() => {
    form.addEventListener('submit', event => {
      event.preventDefault();

      const websitePattern = siteMatchInput.value;
      updateSiteConfig({ id, websitePattern });
    });

    form.addEventListener('reset', event => {
      const siteMatchInput = newRow.querySelector('.site-cell sl-input');

      siteMatchInput.updateComplete.then(() => {
        siteMatchInput.value = siteConfig.websitePattern || '';
        siteMatchInput.focus();
      });
    });
  });

  // Icon column
  let icon;

  if (siteConfig.iconId) {
    icon = await window.extensionStore.getIconById(siteConfig.iconId);
    if (!icon) console.error(`Icon not found: ${siteConfig.iconId}`);

    const svgSprite = buildSvgSprite(icon);

    newRow.querySelectorAll('.icon-value').forEach((iconValueElement) => {
      iconValueElement.replaceChildren(svgSprite);
    });

    newRow.querySelector('.icon-cell .add').classList.add('display-none');
    newRow.querySelector('.icon-cell .edit').classList.remove('display-none');

    if (siteConfig.lightPngUrl) {
      const imageElementLight = document.createElement("img");
      imageElementLight.src = siteConfig.lightPngUrl;

      newRow.querySelector(".favicon-value.light-theme-color-style").replaceChildren(imageElementLight);
    }

    if (siteConfig.darkPngUrl) {
      const imageElementDark = document.createElement("img");
      imageElementDark.src = siteConfig.darkPngUrl;

      newRow.querySelector(".favicon-value.dark-theme-color-style").replaceChildren(imageElementDark);
    }
  } else if (siteConfig.uploadId) {
    // console.log(`siteConfig.uploadId`);
    // console.dir(siteConfig.uploadId, { depth: null });

    const upload = await window.extensionStore.getUploadById(siteConfig.uploadId);

    // console.log(`upload`);
    // console.dir(upload, { depth: null });

    const imageElement = buildUploadImg(upload);

    newRow.querySelectorAll('.icon-value').forEach((iconValueElement) => {
      iconValueElement.replaceChildren(imageElement.cloneNode(true));
    });

    newRow.querySelector('.icon-cell .add').classList.add('display-none');
    newRow.querySelector('.icon-cell .edit').classList.remove('display-none');

    newRow.querySelector(".favicon-value.light-theme-color-style").replaceChildren(
      imageElement.cloneNode(true)
    );
    newRow.querySelector(".favicon-value.dark-theme-color-style").replaceChildren(
      imageElement.cloneNode(true)
    );
  } else {
    newRow.querySelector('.icon-cell .add').classList.remove('display-none');
    newRow.querySelector('.icon-cell .edit').classList.add('display-none');
  }

  const addIconButton = newRow.querySelector('.icon-cell .add sl-button');
  addIconButton.addEventListener('click', () => {
    ICON_SELECTOR_DRAWER.setAttribute('data-siteConfig-id', id);

    ICON_SELECTOR_DRAWER.querySelector('[panel="icon-packs"]').click();

    ICON_SELECTOR_DRAWER.querySelectorAll('.upload-list-item sl-radio').forEach(radio => {
      radio.checked = false;
    });

    ICON_SELECTOR_DRAWER.querySelector('#current-icon').replaceChildren();
    ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren();

    ICON_SELECTOR_DRAWER.querySelector('#current-upload-name').textContent = '';
    ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent = '';

    ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.add('hidden');

    ICON_SELECTOR_DRAWER.show();
  });

  ICON_SELECTOR_DRAWER.querySelector('.drawer__overlay').addEventListener('click', () => {
    ICON_SELECTOR_DRAWER.hide();
  });

  ICON_SELECTOR_DRAWER.querySelector('.drawer__close').addEventListener('click', () => {
    ICON_SELECTOR_DRAWER.hide();
  });

  const selectIconButton = newRow.querySelector('.icon-cell .edit sl-button');
  selectIconButton.addEventListener('click', async () => {
    if (siteConfig.uploadId) {
      ICON_SELECTOR_DRAWER.querySelector('[panel="upload"]').click();

      ICON_SELECTOR_DRAWER.querySelectorAll('.upload-list-item sl-radio').forEach(radio => {
        radio.checked = false;
      });

      const upload = await window.extensionStore.getUploadById(siteConfig.uploadId);
      ICON_SELECTOR_DRAWER.querySelector('#current-icon').replaceChildren(buildUploadImg(upload));

      ICON_SELECTOR_DRAWER.querySelector('#current-upload-name').textContent = upload.name
      ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent = '';
    } else {
      ICON_SELECTOR_DRAWER.querySelector('#current-icon').replaceChildren();
      ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren();

      ICON_SELECTOR_DRAWER.querySelector('[panel="icon-packs"]').click();
      ICON_SELECTOR_DRAWER.querySelector('#current-upload-name').textContent = '';

      if (siteConfig.iconId) {
        console.log('667');
        ICON_SELECTOR_DRAWER.querySelector('#current-icon').replaceChildren(buildSvgSprite(icon));
      }
    }

    ICON_SELECTOR_DRAWER.setAttribute('data-siteConfig-id', id);

    ICON_SELECTOR_DRAWER.show();
  });

  // Light Theme column
  const lightThemeColorPicker = newRow.querySelector('.light-theme-color-picker');

  if (siteConfig.uploadId || !siteConfig.iconId) {
    lightThemeColorPicker.parentNode.classList.add('display-none');
  } else {
    lightThemeColorPicker.parentNode.classList.remove('display-none');
    lightThemeColorPicker .addEventListener('sl-blur', (event) => {
      event.target.updateComplete.then(() => {
        const lightThemeColor = event.target.input.value;
        updateSiteConfig({ id, lightThemeColor });
      });
    });
    newRow.querySelectorAll('.light-theme-color-value').forEach((lightThemeColorValueElement) => {
      lightThemeColorValueElement.value = siteConfig.lightThemeColor;
    });
  }

  // Dark Theme column
  const darkThemeColorPicker = newRow.querySelector('.dark-theme-color-picker');

  if (siteConfig.uploadId || !siteConfig.iconId) {
    darkThemeColorPicker.parentNode.classList.add('display-none');
  } else {
    darkThemeColorPicker.parentNode.classList.remove('display-none');
    darkThemeColorPicker.addEventListener('sl-blur', (event) => {
      event.target.updateComplete.then(() => {
        const darkThemeColor = event.target.input.value;
        updateSiteConfig({ id, darkThemeColor });
      });
    });
    newRow.querySelectorAll('.dark-theme-color-value').forEach((darkThemeColorValueElement) => {
      darkThemeColorValueElement.value = siteConfig.darkThemeColor;
    });
  }

  // Favicon column
  if (siteConfig.iconId) {
    newRow.querySelector('.light-theme-color-style').style.setProperty('color', siteConfig.lightThemeColor);
    newRow.querySelector('.dark-theme-color-style').style.setProperty('color', siteConfig.darkThemeColor);
  }

  // Active column
  const switchElement = newRow.querySelector('.active-cell sl-switch');
  if (siteConfig.active) switchElement.setAttribute('checked', '');

  switchElement.addEventListener('sl-input', (event) => {
    event.target.updateComplete.then(() => {
      const active = event.target.checked;
      updateSiteConfig({ id, active });
    });
  });

  // console.log(`insertion`);
  // console.dir(insertion, { depth: null });

  if (insertion) {
    const tableBody = document.querySelector('#siteConfigs tbody');
    tableBody.appendChild(newRow);
  }
}

async function populateTable(siteConfigs) {
  // console.log('populateTable');

  const tableBody = document.querySelector('#siteConfigs tbody');
  tableBody.querySelectorAll('.siteConfig-row').forEach(row => row.remove());

  let siteConfigsOrder = getSiteConfigsOrder();

  // Remove any siteConfigs that no longer exist
  if (siteConfigsOrder.length > siteConfigs.length) {
    siteConfigsOrder = siteConfigs
      .filter(siteConfig => siteConfigsOrder.includes(siteConfig.id))
      .map(siteConfig => siteConfig.id);

    updatePriorityOrder(siteConfigsOrder);
  }

  // console.log(`siteConfigsOrder`);
  // console.dir(siteConfigsOrder, { depth: null });

  const sortedSiteConfigs = siteConfigsOrder
    .map(id => siteConfigs.find(siteConfig => siteConfig.id === id))
    .filter(Boolean);

  const noDataRow = document.querySelector('.no-data-row');
  if (sortedSiteConfigs.length === 0) {
    noDataRow.classList.remove('display-none');
    return;
  } else {
    noDataRow.classList.add('display-none');
  }

  for await (const siteConfig of sortedSiteConfigs) {
    await populateTableRow(siteConfig, true);
  }
}

function openTabPanels(tabPanelName) {
  const iconPacksTabPanels = ICON_SELECTOR_DRAWER.querySelectorAll('sl-tab-panel[name="icon-packs"]');
  const uploadTabPanels = ICON_SELECTOR_DRAWER.querySelectorAll('sl-tab-panel[name="upload"]');

  switch (tabPanelName) {
    case 'icon-packs':
      uploadTabPanels.forEach((tabPanel) => tabPanel.removeAttribute('active'));
      iconPacksTabPanels.forEach((tabPanel) => tabPanel.setAttribute('active', ''));
      break;
    case 'upload':
      iconPacksTabPanels.forEach((tabPanel) => tabPanel.removeAttribute('active'));
      uploadTabPanels.forEach((tabPanel) => tabPanel.setAttribute('active', ''));
      break;
  }
}

function showDeleteConfirmationDialog(deleteFunction, confirmationText) {
  const deleteConfirmationDialog = document.querySelector('sl-dialog#delete-confirmation');

  deleteConfirmationDialog.querySelector('#delete-cancel-button').addEventListener('click', async () => {
    deleteConfirmationDialog.hide();
  });

  deleteConfirmationDialog.querySelector('#delete-all-button').addEventListener('click', async () => {
    await deleteFunction();
    deleteConfirmationDialog.hide();
  });

  deleteConfirmationDialog.querySelector('#delete-confirmation-text').innerText = confirmationText;

  deleteConfirmationDialog.show();
}

document.addEventListener("DOMContentLoaded", async function() {
  await window.extensionStore.initialize();

  // Icon selector drawer
  ICON_SELECTOR_DRAWER = document.querySelector('sl-drawer#icon-selector');

  const iconTypesSelect = ICON_SELECTOR_DRAWER.querySelector('#icon-types');

  const iconPacks = window.extensionStore.getIconPacks();
  for(const iconPack of iconPacks) {
    // Create an svg element for each icon pack to store the icon symbols

    // svg tags don't work with createElement
    const svgNS = "http://www.w3.org/2000/svg";
    const iconPackSvg = document.createElementNS(svgNS, "svg");

    iconPackSvg.setAttribute("icon-pack-name", iconPack.name);
    iconPackSvg.setAttribute("icon-pack-version", iconPack.version);
    iconPackSvg.style.display = "none";

    document.body.appendChild(iconPackSvg);

    // Add icon pack styles to the select element
    for (const style of iconPack.styles) {
      const selectOption = document.createElement('sl-option');

      selectOption.setAttribute('value', style.value);
      selectOption.textContent = `${iconPack.name.replace('_', ' ')} ${style.name}`;
      selectOption.addEventListener('click', () => filterByStyle(`${iconPack.name}-${style.name}`));

      iconTypesSelect.appendChild(selectOption);
    };

    const selectAllOption = iconTypesSelect.querySelector('sl-option[value="all"]');
    selectAllOption.addEventListener('click', () => filterByStyle('All'));
  };

  const iconDrawerTabGroup = document.querySelector('#icon-drawer-tab-group');
  iconDrawerTabGroup.addEventListener('sl-tab-show', (event) => {
    openTabPanels(event.detail.name);
  });

  await populateDrawerIcons();
  await populateDrawerUploads();

  ICON_SELECTOR_DRAWER.querySelector('#clear-icon-button').addEventListener('click', () => {
    ICON_SELECTOR_DRAWER.querySelectorAll('.upload-list-item sl-radio').forEach(radio => {
      radio.checked = false;
    });

    ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent = '';
    ICON_SELECTOR_DRAWER.querySelector('#updated-icon').innerHTML = '';
    ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.add('display-none');
    ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.add('hidden');
  });

  ICON_SELECTOR_DRAWER.querySelector('#save-icon-button').addEventListener('click', async () => {
    const selectedCell = ICON_SELECTOR_DRAWER.querySelector('#updated-icon');
    const id = ICON_SELECTOR_DRAWER.getAttribute('data-siteConfig-id');

    let iconId;
    let uploadId;

    if (ICON_SELECTOR_DRAWER.querySelector('sl-tab-panel[name="icon-packs"][active]')) {
      iconId = selectedCell.querySelector('[icon-id]').getAttribute('icon-id');
      uploadId = null;
    } else if (ICON_SELECTOR_DRAWER.querySelector('sl-tab-panel[name="upload"][active]')) {
      iconId = null;
      uploadId = selectedCell.querySelector('[upload-id]').getAttribute('upload-id');
    }

    updateSiteConfig({ id, iconId, uploadId });

    ICON_SELECTOR_DRAWER.querySelector('#current-icon').innerHTML = selectedCell.innerHTML;
    selectedCell.innerHTML = '';

    ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.add('display-none');
    ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.add('hidden');

    ICON_SELECTOR_DRAWER.hide();
  });

  ICON_SELECTOR_DRAWER.querySelector('sl-input').addEventListener('sl-input', (event) => {
    event.target.updateComplete.then(() => {
      const searchQuery = event.target.input.value;
      filterDrawerIcons(searchQuery);
    });
  });

  ICON_SELECTOR_DRAWER.querySelector('#upload > button').addEventListener('click', async (event) => {
    event.preventDefault();

    const fileInput = ICON_SELECTOR_DRAWER.querySelector('#icon-upload-input');
    const file = fileInput.files[0];

    if (!file) return;

    async function fileToDataUri(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    }

    try {
      const name = file.name;
      const dataUri = await fileToDataUri(file);
      const upload = await window.extensionStore.addUpload({ name, dataUri });

      const imagePreview = document.createElement('img');
      imagePreview.src = upload.dataUri;
      imagePreview.setAttribute('upload-id', upload.id);

      ICON_SELECTOR_DRAWER.querySelector('#updated-icon').replaceChildren(imagePreview);
      ICON_SELECTOR_DRAWER.querySelector('#updated-upload-name').textContent = upload.name;

      // Show unsaved changes UI
      ICON_SELECTOR_DRAWER.querySelector('#unsaved').classList.remove('display-none');
      ICON_SELECTOR_DRAWER.querySelector('.drawer-footer').classList.remove('hidden');

      // Clear the file input
      fileInput.value = '';

      await populateDrawerUploads();
    } catch (error) {
      console.error(error.message);
      fileInput.value = '';
    }
  });

  document.querySelector('#pattern-type-header sl-icon-button').addEventListener('click', () => {
    document.querySelector('#pattern-types').show();
  });

  const siteConfigs = await window.extensionStore.getSiteConfigs();

  await populateTable(siteConfigs);
  updateRecordsSummary(siteConfigs);

  const selectAllButton = document.querySelector('#select-all');
  selectAllButton.addEventListener('sl-change', (event) => {
    const isChecked = event.target.checked;

    document.querySelectorAll('sl-checkbox.select-all-target').forEach((checkbox) => {
      if (isChecked) {
        checkbox.setAttribute('checked', '');
      } else {
        checkbox.removeAttribute('checked');
      }
    });
  });

  const checkboxObserver = new MutationObserver(() => {
    let checkedCount = 0;
    const checkboxes = document.querySelectorAll('tr:not(#template-row) sl-checkbox.select-all-target');
    const totalCheckboxes = checkboxes.length;

    for (const checkbox of checkboxes) {
      if (checkbox.hasAttribute('checked')) checkedCount++;
    }

    if (checkedCount === 0) {
      selectAllButton.removeAttribute('checked');
      selectAllButton.removeAttribute('indeterminate');
      document.querySelector('#selected-actions').classList.add('display-none');
    } else if (checkedCount === totalCheckboxes) {
      selectAllButton.setAttribute('checked', '');
      selectAllButton.removeAttribute('indeterminate');
      document.querySelector('#selected-actions').classList.remove('display-none');
    } else {
      selectAllButton.removeAttribute('checked');
      selectAllButton.setAttribute('indeterminate', '');
      document.querySelector('#selected-actions').classList.remove('display-none');
    }

    // Hide buttons that require a single selection
    document.querySelectorAll('.single-limited-action').forEach(element => {
      if (checkedCount > 1) {
        element.classList.add('display-none');
      } else {
        element.classList.remove('display-none');
      }
    });
  });

  const observeCheckboxes = () => {
    document.querySelectorAll('sl-checkbox.select-all-target').forEach(checkbox => {
      checkboxObserver.observe(checkbox, {
        attributes: true,
        attributeFilter: ['checked'],
      });
    });
  };

  // Initial observation
  observeCheckboxes();

  const tableObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          const checkboxes = node.querySelectorAll('sl-checkbox.select-all-target');
          if (checkboxes.length) observeCheckboxes();
        }
      });
    });
  });

  // Start observing the table for added rows
  tableObserver.observe(document.querySelector('#siteConfigs tbody'), {
    childList: true,
    subtree: true
  });

  // Action buttons
  const createDropdown = document.querySelector('#create-dropdown');
  createDropdown.addEventListener('sl-select', async (event) => {
    // const siteConfig = {
    //   // id: Date.now(),
    //   patternType: 'Simple Match',
    //   lightThemeColor: '#000000',
    //   darkThemeColor: '#ffffff',
    //   active: true,
    // };

    // siteConfigs.push(siteConfig);
    // await window.extensionStore.addSiteConfig(siteConfig);
    const siteConfig = await window.extensionStore.addSiteConfig({
      patternType: 'Simple Match',
      active: true,
      lightThemeColor: '#000000',
      darkThemeColor: '#ffffff',
    });

    const priority = event.detail.item.value;
    const siteConfigsOrder = getSiteConfigsOrder();

    if (priority === 'highest-priority') {
      siteConfigsOrder.unshift(siteConfig.id);
    } else {
      siteConfigsOrder.push(siteConfig.id);
    }

    updatePriorityOrder(siteConfigsOrder);

    const siteConfigs = await window.extensionStore.getSiteConfigs();
    void populateTable(siteConfigs);
    updateRecordsSummary(siteConfigs);
  });

  function getRowsChecked() {
    const rowsChecked = Array.from(
      document.querySelectorAll('tr:not(#template-row):has(sl-checkbox.select-all-target[checked])')
    );

    const ids = rowsChecked.map(element => element.id.split('row-')[1]);

    return { rowsChecked, ids };
  }

  async function deleteSiteConfigRows(rows, ids) {
    const siteConfigsOrder = getSiteConfigsOrder();
    updatePriorityOrder(siteConfigsOrder.filter(id => !ids.includes(id)));

    await window.extensionStore.deleteSiteConfigs(ids);
    rows.forEach(row => row.remove());

    selectAllButton.removeAttribute('checked');
    selectAllButton.removeAttribute('indeterminate');

    const siteConfigs = await window.extensionStore.getSiteConfigs();
    await populateTable(siteConfigs);
  }

  document.querySelector('#delete-action-button').addEventListener('click', async () => {
    const { rowsChecked, ids } = getRowsChecked();

    const deleteCount = ids.length;
    if (deleteCount > 2) {
      showDeleteConfirmationDialog(
        () => deleteSiteConfigRows(rowsChecked, ids),
        `Are you sure you want to delete ${deleteCount} rows?`
      );
    } else {
      await deleteSiteConfigRows(rowsChecked, ids);
    }

    document.querySelector('#selected-actions').classList.add('display-none');
  });

  document.querySelector('#activate-action-button').addEventListener('click', async () => {
    const { rowsChecked } = getRowsChecked();

    rowsChecked.forEach(row => {
      row.querySelector('.active-cell sl-switch:not([checked])')?.click();
      row.querySelector('sl-checkbox').removeAttribute('checked');
    });
  });

  document.querySelector('#deactivate-action-button').addEventListener('click', async () => {
    const { rowsChecked } = getRowsChecked();

    for (const row of rowsChecked) {
      row.querySelector('.active-cell sl-switch[checked]')?.click();
      row.querySelector('sl-checkbox').removeAttribute('checked');
    };
  });

  document.querySelector('#duplicate-action-button').addEventListener('click', async () => {
    const { rowsChecked, ids } = getRowsChecked();

    if (rowsChecked.length !== 1) return;
    const id = ids[0];

    const siteConfig = await window.extensionStore.getSiteConfigById(id);
    delete siteConfig.id;

    const newSiteConfig = await window.extensionStore.addSiteConfig(siteConfig);
    const siteConfigsOrder = getSiteConfigsOrder();

    const siteConfigsOrderPriority = getPriority(id);
    siteConfigsOrder.splice(siteConfigsOrderPriority + 1, 0, newSiteConfig.id);
    updatePriorityOrder(siteConfigsOrder);

    const row = rowsChecked[0];
    row.querySelector('.active-cell sl-switch[checked]')?.click();

    const siteConfigs = await window.extensionStore.getSiteConfigs();
    await populateTable(siteConfigs);

    selectAllButton.removeAttribute('checked');
    selectAllButton.removeAttribute('indeterminate');
  });

  // Lastly, remove loading indicators
  document.querySelector('.skeleton-row').classList.add('display-none');
  document.querySelector('div > #loading-overlay').classList.add('display-none');
});

//
// Theme selector
//
(() => {
  function getTheme() {
    return localStorage.getItem('theme') || 'auto';
  }

  function isDark() {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme === 'dark';
  }

  function setTheme(newTheme) {
    theme = newTheme;
    localStorage.setItem('theme', theme);

    // Update the UI
    updateSelection();

    // Toggle the dark mode class
    document.documentElement.classList.toggle('sl-theme-dark', isDark());
  }

  function updateSelection() {
    const menu = document.querySelector('#theme-selector sl-menu');
    if (!menu) return;
    [...menu.querySelectorAll('sl-menu-item')].map(item => (item.checked = item.getAttribute('value') === theme));
  }

  let theme = getTheme();

  // Selection is not preserved when changing page, so update when opening dropdown
  document.addEventListener('sl-show', event => {
    const themeSelector = event.target.closest('#theme-selector');
    if (!themeSelector) return;
    updateSelection();
  });

  // Listen for selections
  document.addEventListener('sl-select', event => {
    const menu = event.target.closest('#theme-selector sl-menu');
    if (!menu) return;
    setTheme(event.detail.item.value);
  });

  // Update the theme when the preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setTheme(theme));

  // Toggle with backslash
  document.addEventListener('keydown', event => {
    if (
      event.key === '\\' &&
      !event.composedPath().some(el => ['input', 'textarea'].includes(el?.tagName?.toLowerCase()))
    ) {
      event.preventDefault();
      setTheme(isDark() ? 'light' : 'dark');
    }
  });

  // Set the initial theme and sync the UI
  setTheme(theme);
})();
