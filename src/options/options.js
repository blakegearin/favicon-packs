console.log("options.js loaded");

let RECORDS;
let DRAWER;

// console.log("Waiting for 1 second...");
// setTimeout(() => {
//   console.log("1 second has passed!");
//   document.documentElement.style.setProperty("--loading", "none");
// }, 2000);
document.documentElement.style.setProperty("--loading", "none");

async function populateDrawerIcons() {
  const icons = await loadAllIcons();
  const iconListFragment = document.createDocumentFragment();
  const svgNS = "http://www.w3.org/2000/svg";

  const iconSymbols = {};

  for (let [iconId, icon] of Object.entries(icons)) {
    const tooltip = document.createElement('sl-tooltip');
    tooltip.setAttribute('content', icon.name);

    if (icon.tags) tooltip.setAttribute('tags', icon.tags.join(' '));

    tooltip.classList.add(`icon-style-${icon.style}`);

    const iconDiv = document.createElement('div');
    iconDiv.classList.add('icon-list-item');

    // Icon symbols don't work with createElement
    const iconSvg = document.createElementNS(svgNS, 'svg');
    iconSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    iconSvg.setAttribute('viewBox', '0 0 512 512');
    iconSvg.setAttribute('icon-id', iconId);

    // Icon symbols don't work with createElement
    const iconUse = document.createElementNS(svgNS, 'use');
    iconUse.setAttribute('href', `#${icon.name}`);
    iconUse.setAttribute('xlink:href', `#${icon.name}`);

    tooltip.onclick = () => {
      DRAWER.querySelector('#unsaved').classList.remove('display-none');

      DRAWER.querySelector('#drawer-footer').classList.remove('display-none');
      DRAWER.querySelector('#selected-icon').replaceChildren(iconSvg.cloneNode(true));
    }

    iconSvg.appendChild(iconUse);
    iconDiv.appendChild(iconSvg);
    tooltip.appendChild(iconDiv);
    iconListFragment.appendChild(tooltip);

    const [iconPackName, iconPackVersion] = iconId.split('-');
    const iconPackSvgSelector = `svg[icon-pack-name="${iconPackName}"][icon-pack-version="${iconPackVersion}"]`;

    if (iconSymbols[iconPackSvgSelector]) {
      iconSymbols[iconPackSvgSelector].push(icon.symbol);
    } else {
      iconSymbols[iconPackSvgSelector] = [icon.symbol];
    }
  }

  const iconList = DRAWER.querySelector('.icon-list');
  iconList.replaceChildren(iconListFragment);

  for (let [selector, symbols] of Object.entries(iconSymbols)) {
    const iconPackSvg = document.querySelector(selector);
    iconPackSvg.innerHTML = symbols.join('');
  };
}

function updatePriorityOrder(order) {
  return localStorage.setItem('recordOrder', JSON.stringify(order));
}

function getRecordOrder() {
  return JSON.parse(localStorage.getItem('recordOrder'));
}

function getPriority(id) {
  const recordOrder = getRecordOrder();
  return recordOrder.indexOf(id);
}

function filterByStyle(styleName) {
  console.log('filterByStyle')
  console.log(styleName)

  document.documentElement.style.setProperty(
    '--icon-style-outline',
    ['Outline', 'All'].includes(styleName) ? 'block' : 'none'
  );
  document.documentElement.style.setProperty(
    '--icon-style-filled',
    ['Filled', 'All'].includes(styleName) ? 'block' : 'none'
  );
  document.documentElement.style.setProperty(
    '--icon-style-sharp',
    ['Sharp', 'All'].includes(styleName) ? 'block' : 'none'
  );
}

function loadAllIcons() {
  return browser.storage.local.get().then((result) => {
    return result; // Return the entire result object
  }).catch((error) => {
    console.error('Error retrieving data:', error);
    return {}; // Return an empty object in case of error
  });
}

function loadIcon(iconId) {
  // console.log('loadIcon');

  return browser.storage.local.get(iconId).then((result) => {
    return result[iconId];
  }).catch((error) => {
    console.error('Error retrieving data:', error);
    return {};
  });
}

function filterDrawerIcons(filter) {
  // console.log(`filter`);
  // console.dir(filter, { depth: null });

  DRAWER.querySelectorAll('sl-tooltip').forEach((icon) => {
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

  // const iconList = DRAWER.querySelector('.icon-list');
  // iconList.replaceChildren(iconListFragment);
}

function updateRecord({ id, matchType, siteMatch, iconId, lightThemeColor, darkThemeColor, active }) {
  // console.log('updateRecord');

  const record = RECORDS.find(record => record.id.toString() === id.toString());
  const activeDefined = active !== undefined;

  const newRecord = {
    id: parseInt(id),
    // priority: priority || record.priority,
    matchType: matchType || record.matchType,
    siteMatch: siteMatch || record.siteMatch,
    iconId: iconId || record.iconId,
    // icon: icon || record.icon,
    lightThemeColor: lightThemeColor || record.lightThemeColor,
    darkThemeColor: darkThemeColor || record.darkThemeColor,
    active: activeDefined ? active : record.active,
  };

  console.log(`newRecord`);
  console.dir(newRecord, { depth: null });

  RECORDS = RECORDS.map(item => item.id === id ? newRecord : item);

  console.log(`RECORDS`);
  console.dir(RECORDS, { depth: null });

  if (activeDefined) {
    updateRecordsSummary(RECORDS);
  } else {
    populateTableRow(newRecord, false);
  }
}

function updateRecordsSummary(records) {
  document.querySelector('#records-length').innerText = records.length;
  document.querySelector('#active-records-length').innerText =
    records.filter(record => record.active)?.length || 0;
}

function swapPriorities(record1, direction) {
  const order = JSON.parse(localStorage.getItem('recordOrder')) || [];
  const currentIndex = order.indexOf(record1.id);

  if (currentIndex === -1 ||
    (direction === 'increment' && currentIndex === 0) ||
    (direction === 'decrement' && currentIndex === order.length - 1)) {
    return;
  }

  const targetIndex = direction === 'increment' ? currentIndex - 1 : currentIndex + 1;
  const record2Id = order[targetIndex];
  const record2 = records.find(record => record.id === record2Id);

  [order[currentIndex], order[targetIndex]] = [order[targetIndex], order[currentIndex]];
  localStorage.setItem('recordOrder', JSON.stringify(order));

  const tr1 = document.querySelector(`#row-${record1.id}`);
  const tr2 = document.querySelector(`#row-${record2.id}`);
  if (!tr1 || !tr2) return;

  if (direction === 'increment') {
    tr2.parentNode.insertBefore(tr1, tr2);
  } else {
    tr2.parentNode.insertBefore(tr2, tr1);
  }

  setPriorityButtonVisibility(tr1, targetIndex);
  setPriorityButtonVisibility(tr2, currentIndex);
}

function setPriorityButtonVisibility(row, priority) {
  const incrementButton = row.querySelector('.increment');
  const decrementButton = row.querySelector('.decrement');

  if (priority === 0) {
    incrementButton.classList.add('hidden');
    decrementButton.classList.remove('hidden');
  } else if (priority === (records.length - 1)) {
    incrementButton.classList.remove('hidden');
    decrementButton.classList.add('hidden');
  } else {
    incrementButton.classList.remove('hidden');
    decrementButton.classList.remove('hidden');
  }
}

async function populateTableRow(record, insertion) {
  // console.log('populateTableRow');

  const id = record.id;

  // console.log(`id`);
  // console.dir(id, { depth: null });

  const templateRow = document.querySelector('#template-row');
  const rowId = `row-${id}`;
  let newRow;

  if (insertion) {
    newRow = templateRow.cloneNode(true);
    newRow.id = rowId;
    newRow.classList.remove('display-none');
    newRow.classList.add('record-row');
  } else {
    newRow = document.querySelector(`#${rowId}`);
  }

  // console.log(`newRow`);
  // console.dir(newRow, { depth: null });

  // Priority column
  const incrementButton = newRow.querySelector('.increment');
  const decrementButton = newRow.querySelector('.decrement');

  const priority = getPriority(id);
  setPriorityButtonVisibility(newRow, priority);

  incrementButton.onclick = () => {
    swapPriorities(record, 'increment');
  }

  decrementButton.onclick = () => {
    swapPriorities(record, 'decrement');
  }

  // Match Type column
  const matchTypeTag = newRow.querySelector('.type-cell sl-tag');
  matchTypeTag.innerText = record.matchType;
  matchTypeTag.setAttribute('variant', record.matchType === 'Pattern' ? 'warning' : 'primary');

  const toggleTypeButton = newRow.querySelector('.toggle-type');
  toggleTypeButton.onclick = () => {
    const matchType = record.matchType === 'Domain' ? 'Pattern' : 'Domain';
    updateRecord({ id, matchType });
  };

  // Site Match column
  newRow.querySelector('.site-match-value').innerText = record.siteMatch;
  newRow.querySelector('.site-match-value-copy').setAttribute('value', record.siteMatch);

  const siteRead = newRow.querySelector('.site-cell.read');
  const siteEdit = newRow.querySelector('.site-cell.edit');
  const siteMatchInput = newRow.querySelector('.site-cell sl-input');

  if (record.siteMatch) {
    siteMatchInput.value = record.siteMatch;

    siteRead.classList.remove('display-none');
    siteEdit.classList.add('display-none');
  } else {
    siteRead.classList.add('display-none');
    siteEdit.classList.remove('display-none');
  }

  const editSiteButton = newRow.querySelector('.site-cell .edit-site');
  editSiteButton.onclick = () => {
    siteRead.classList.toggle('display-none');
    siteEdit.classList.toggle('display-none');
  };

  const form = newRow.querySelector('.site-cell.edit');

  Promise.all([
    customElements.whenDefined('sl-input'),
  ]).then(() => {
    form.addEventListener('submit', event => {
      event.preventDefault();

      const siteMatch = siteMatchInput.value;

      // console.log(`siteMatch`);
      // console.dir(siteMatch, { depth: null });

      updateRecord({ id, siteMatch });
    });
  });

  // Icon column
  const icon = await loadIcon(record.iconId);

  // console.log(`icon`);
  // console.dir(icon, { depth: null });

  if (record.iconId) {
    newRow.querySelectorAll('.icon-value').forEach((iconValueElement) => {
      // iconValueElement.innerHTML = record.icon;
      iconValueElement.innerHTML = icon.svg;
    });

    newRow.querySelector('.icon-cell .add').classList.add('display-none');
    newRow.querySelector('.icon-cell .edit').classList.remove('display-none');
  } else {
    newRow.querySelector('.icon-cell .add').classList.remove('display-none');
    newRow.querySelector('.icon-cell .edit').classList.add('display-none');
  }

  const addIconButton = newRow.querySelector('.icon-cell .add sl-button');
  addIconButton.onclick = () => {
    DRAWER.setAttribute('data-record-id', id);

    DRAWER.show();
  };

  const selectIconButton = newRow.querySelector('.icon-cell .edit sl-button');
  selectIconButton.onclick = () => {
    DRAWER.querySelector('#current-icon').innerHTML = icon.svg;
    DRAWER.setAttribute('data-record-id', id);

    DRAWER.show();
  };

  // Light Theme column
  newRow.querySelector('.light-theme-color-picker').addEventListener('sl-blur', (event) => {
    event.target.updateComplete.then(() => {
      const lightThemeColor = event.target.input.value;
      updateRecord({ id, lightThemeColor });
    });
  });
  newRow.querySelectorAll('.light-theme-color-value').forEach((lightThemeColorValueElement) => {
    lightThemeColorValueElement.value = record.lightThemeColor;
  });

  // Dark Theme column
  newRow.querySelector('.dark-theme-color-picker').addEventListener('sl-blur', (event) => {
    event.target.updateComplete.then(() => {
      const darkThemeColor = event.target.input.value;
      updateRecord({ id, darkThemeColor });
    });
  });
  newRow.querySelectorAll('.dark-theme-color-value').forEach((darkThemeColorValueElement) => {
    darkThemeColorValueElement.value = record.darkThemeColor;
  });

  // Favicon column
  newRow.querySelector('.light-theme-color-style').style.setProperty('color', record.lightThemeColor);
  newRow.querySelector('.dark-theme-color-style').style.setProperty('color', record.darkThemeColor);

  // Active column
  const switchElement = newRow.querySelector('.active-cell sl-switch');
  if (record.active) switchElement.setAttribute('checked', '');

  switchElement.addEventListener('sl-input', (event) => {
    event.target.updateComplete.then(() => {
      const active = event.target.checked;
      updateRecord({ id, active });
    });
  });

  // console.log(`insertion`);
  // console.dir(insertion, { depth: null });

  if (insertion) {
    const tableBody = document.querySelector('#records tbody');
    tableBody.appendChild(newRow);
  }
}

function populateTable(records) {
  const tableBody = document.querySelector('#records tbody');
  tableBody.querySelectorAll('.record-row').forEach(row => row.remove());

  const recordOrder = getRecordOrder();

  // console.log(`recordOrder`);
  // console.dir(recordOrder, { depth: null });

  // console.log(`records`);
  // console.dir(records, { depth: null });

  recordOrder
    .map(id => records.find(record => record.id === id))
    .filter(Boolean)
    .forEach(record => populateTableRow(record, true));
}


// const colorPicker = document.querySelector('sl-color-picker.blake');
// colorPicker.addEventListener('sl-blur', (event) => {
//   console.log('updated colorPicker')

//   console.log(`event`);
//   console.dir(event, { depth: null });

//   colorPicker.updateComplete.then(() => {
//     console.log('COMPLETE'); // true

//     // console.log(`event`);
//     // console.dir(event, { depth: null });

//     const formattedValue = colorPicker.getFormattedValue();
//     console.log(`formattedValue`);
//     console.dir(formattedValue, { depth: null });
//   });
// });

document.addEventListener("DOMContentLoaded", async function() {
  DRAWER = document.querySelector('.drawer-placement-start');

  await populateDrawerIcons();

  DRAWER.querySelector('#clear-icon-button').addEventListener('click', (event) => {
    DRAWER.querySelector('#selected-icon').innerHTML = '';
    DRAWER.querySelector('#unsaved').classList.add('display-none');
    DRAWER.querySelector('#drawer-footer').classList.add('display-none');
  });

  DRAWER.querySelector('#save-icon-button').addEventListener('click', (event) => {
    const selectedCell = DRAWER.querySelector('#selected-icon');
    const iconId = selectedCell.querySelector('[icon-id]').getAttribute('icon-id');
    const iconHtml = selectedCell.innerHTML;

    DRAWER.querySelector('#current-icon').innerHTML = iconHtml;
    selectedCell.innerHTML = '';

    DRAWER.querySelector('#unsaved').classList.add('display-none');
    DRAWER.querySelector('#drawer-footer').classList.add('display-none');

    const id = DRAWER.getAttribute('data-record-id');

    updateRecord({ id, iconId });
  });

  DRAWER.querySelector('sl-input').addEventListener('sl-input', (event) => {
    event.target.updateComplete.then(() => {
      const searchQuery = event.target.input.value;
      filterDrawerIcons(searchQuery);
    });
  });

  const iconPacks = [
    {
      name: "Ionicons",
      svgUrl: "https://unpkg.com/ionicons@7.4.0/dist/cheatsheet.html",
      metadataUrl: "https://unpkg.com/ionicons@7.4.0/dist/ionicons.json",
      styles: [
        {
          name: "Outline",
          value: "-outline",
          filter: /-outline/,
        },
        {
          name: "Filled",
          value: "",
          filter: /^(?!.*-outline)(?!.*-sharp).*$/, // Not containing -outline or -sharp
        },
        {
          name: "Sharp",
          value: "-sharp",
          filter: /-sharp/,
        },
      ],
    },
  ];

  const iconTypesSelect = DRAWER.querySelector('#icon-types');
  iconPacks.forEach((iconPack) => {
    iconPack.styles.forEach((style) => {
      const selectOption = document.createElement('sl-option');
      selectOption.setAttribute('value', style.value);
      selectOption.textContent = style.name;

      selectOption.onclick = () => filterByStyle(style.name);

      iconTypesSelect.appendChild(selectOption);
    });

    const selectAllOption = iconTypesSelect.querySelector('sl-option[value="all"]');
    selectAllOption.onclick = () => filterByStyle('All');
  });

  updatePriorityOrder([3, 1, 2]);

  RECORDS = [
    {
      id: 1,
      matchType: 'Domain',
      siteMatch: 'example.com',
      iconId: 'Ionicons-7.4.0-apps-sharp',
      darkThemeColor: '#fdbb99',
      active: true,
    },
    {
      id: 2,
      matchType: 'Pattern',
      siteMatch: '*://*.bing.com/*',
      iconId: 'Ionicons-7.4.0-bar-chart-outline',
      lightThemeColor: '#ff0000',
      darkThemeColor: '#00ff00',
      active: false,
    },
    {
      id: 3,
      matchType: 'Pattern',
      siteMatch: '*://*/*',
      iconId: 'Ionicons-7.4.0-people-circle',
      lightThemeColor: '#cc00f0',
      darkThemeColor: '#0bbffb',
      active: false,
    },
  ];

  populateTable(RECORDS);
  updateRecordsSummary(RECORDS);

  const selectAllButton = document.querySelector('#select-all');
  selectAllButton.onclick = (event) => {
    const isChecked = event.target.checked;

    document.querySelectorAll('sl-checkbox.select-all-target').forEach((checkbox) => {
      if (isChecked) {
        checkbox.setAttribute('checked', '');
      } else {
        checkbox.removeAttribute('checked');
      }
    });
  };

  const checkboxObserver = new MutationObserver(() => {
    let checkedCount = 0;
    const checkboxes = document.querySelectorAll('tr:not(#template-row) sl-checkbox.select-all-target');
    const totalCheckboxes = checkboxes.length;

    checkboxes.forEach(checkbox => {
      if (checkbox.hasAttribute('checked')) checkedCount++;
    });

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
  tableObserver.observe(document.querySelector('#records tbody'), {
    childList: true,
    subtree: true
  });

  const createDropdown = document.querySelector('#create-dropdown');
  createDropdown.addEventListener('sl-select', event => {
    const record = {
      id: Date.now(),
      matchType: 'Domain',
      lightThemeColor: '#000000',
      darkThemeColor: '#ffffff',
      active: true,
    };

    records.push(record);

    const priority = event.detail.item.value;
    const recordOrder = getRecordOrder();

    if (priority === 'highest-priority') {
      recordOrder.unshift(record.id);
    } else {
      recordOrder.push(record.id);
    }

    updatePriorityOrder(recordOrder);
    populateTable(records);
  });
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
