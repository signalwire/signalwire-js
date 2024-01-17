import { SWClient, SignalWire } from '@signalwire/js'

const searchInput = document.getElementById('searchInput')
const searchType = document.getElementById('searchType')

let client = null

async function getClient() {
  if (!client) {
    client = await SignalWire({
      host: document.getElementById('host').value,
      token: document.getElementById('token').value,
    })
  }

  return client
}

/**
 * Connect with Relay creating a client and attaching all the event handler.
 */
window.connect = async () => {
  const client = await getClient()
  window.__client = client

  await fetchAddresses()
}

window.saveInLocalStorage = (e) => {
  const key = e.target.name || e.target.id
  localStorage.setItem('fabric.http.' + key, e.target.value)
}

// jQuery document.ready equivalent
window.ready = (callback) => {
  if (document.readyState != 'loading') {
    callback()
  } else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', callback)
  } else {
    document.attachEvent('onreadystatechange', function () {
      if (document.readyState != 'loading') {
        callback()
      }
    })
  }
}

window.registerDeviceSNS = () => {
  return __client.registerDevice({
    deviceType: 'iOS',
    deviceToken: 'foo',
  })
}

window.unregisterDeviceSNS = () => {
  return __client.unregisterDevice({
    id: '<UUID>',
  })
}

/**
 * On document ready auto-fill the input values from the localStorage.
 */
window.ready(async function () {
  document.getElementById('host').value =
    localStorage.getItem('fabric.http.host') || ''
  document.getElementById('token').value =
    localStorage.getItem('fabric.http.token') || ''
})

const escapeHTML = (str) => {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function updateAddressUI() {
  const addressesDiv = document.getElementById('addresses')
  addressesDiv.innerHTML = ''
  const { addresses } = window.__addressData

  const createListItem = (address) => {
    const displayName = escapeHTML(address.display_name)
    const name = escapeHTML(address.name)
    const type = escapeHTML(address.type)

    const dialList = document.createElement('ul')
    dialList.className = 'list-group list-group-flush'

    const listItem = document.createElement('li')
    listItem.className = 'list-group-item'
    listItem.innerHTML = `<b>${displayName}</b> / <span>${name}</span> 
                          <span class="badge bg-primary float-end">${type}</span>`

    listItem.appendChild(dialList)

    Object.entries(address.channels).forEach(([channelName, channelValue]) => {
      const sanitizedValue = escapeHTML(channelValue)
      const li = document.createElement('li')
      li.className = 'list-group-item d-flex align-items-center gap-2'
      li.innerHTML = `<span>${sanitizedValue}</span>`
      dialList.appendChild(li)
    })

    return listItem
  }

  addresses
    .map(createListItem)
    .forEach((item) => addressesDiv.appendChild(item))
}

async function fetchAddresses() {
  if (!client) return
  try {
    const searchText = document.getElementById('searchInput').value
    const selectedType = document.getElementById('searchType').value

    console.log('searchText', searchText, selectedType)

    const addressData = await client.getAddresses({
      type: selectedType === 'all' ? undefined : selectedType,
      displayName: !searchText.length ? undefined : searchText,
    })
    console.log('addressData', addressData)
    window.__addressData = addressData
    updateAddressUI()
  } catch (error) {
    console.error('Unable to fetch addresses', error)
  }
}

window.fetchNextAddresses = async () => {
  const { nextPage } = window.__addressData
  try {
    const nextAddresses = await nextPage()
    window.__addressData = nextAddresses
    updateAddressUI()
  } catch (error) {
    console.error('Unable to fetch next addresses', error)
  }
}

window.fetchPrevAddresses = async () => {
  const { prevPage } = window.__addressData
  try {
    const prevAddresses = await prevPage()
    window.__addressData = prevAddresses
    updateAddressUI()
  } catch (error) {
    console.error('Unable to fetch prev addresses', error)
  }
}

let debounceTimeout
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimeout)
  // Search after 1 seconds when user stops typing
  debounceTimeout = setTimeout(fetchAddresses, 1000)
})

searchType.addEventListener('change', fetchAddresses)
