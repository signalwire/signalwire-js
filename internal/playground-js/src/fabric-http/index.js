import { SWClient } from '@signalwire/js'

let __client = null
/**
 * Connect with Relay creating a client and attaching all the event handler.
 */
window.connect = async () => {
  __client = new SWClient({
    httpHost: document.getElementById('host').value,
    accessToken: document.getElementById('token').value,
  })

  const addressesDiv = document.getElementById('addresses')
  addressesDiv.innerHTML = ''
  try {
    const { addresses, nextPage, prevPage } = await __client.getAddresses()
    const list = addresses.map((address) => {
      return `<li class="list-group-item">
        <b>${address.display_name}</b> / <span>${
        address.name
      } </span> <span class="badge bg-primary float-end">${address.type}</span>
      <ul class="list-group list-group-flush">
        ${Object.keys(address.channels)
          .map((c) => {
            return `<li class="list-group-item">${address.channels[c]}</li>`
          })
          .join('')}
      </ul>
      </li>`
    })
    console.log('addresses', addresses, list)

    addressesDiv.insertAdjacentHTML('beforeend', list.join(''))
  } catch (error) {
    console.error('Client Error', error)
    alert('Error - Double check host and token')
  }

  // Navigate throught pages
  // const next = await nextPage()
  // const prev = await prevPage()
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
    host: 'fabric.swire.io',
    accessToken: '<ACCESS-TOKEN>',
    deviceType: 'iOS',
    deviceToken: 'foo',
  })
}

window.unregisterDeviceSNS = () => {
  return __client.unregisterDevice({
    host: 'fabric.swire.io',
    accessToken: '<ACCESS-TOKEN>',
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
