import { SignalWire } from '@signalwire/js'

const searchInput = document.getElementById('searchInput')
const searchType = document.getElementById('searchType')
const conversationMessageInput = document.getElementById('new-conversation-message')
const sendMessageBtn = document.getElementById('send-message')

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

  await Promise.all([fetchHistories(), fetchAddresses()])

  const subscriber = await client.getSubscriberInfo()
  console.log('>> subscriber', subscriber)
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

/** ======= Tab utilities start ======= */
window.toggleTabState = async (activeButtonName) => {
  const config = [
    {
      name: 'Directory',
      button: document.querySelector('button[name="Directory"]'),
      card: document.getElementById('addressCard'),
    },
    {
      name: 'History',
      button: document.querySelector('button[name="History"]'),
      card: document.getElementById('historyCard'),
    },
  ]

  config.forEach(({ name, button, card }) => {
    if (name === activeButtonName) {
      button.classList.add('active', 'text-black')
      button.classList.remove('text-secondary')
      card.classList.remove('d-none')
    } else {
      button.classList.remove('active', 'text-black')
      button.classList.add('text-secondary')
      card.classList.add('d-none')
    }
  })

  if (activeButtonName === 'History') {
    await fetchHistories()
  }

  if (activeButtonName === 'Directory') {
    await fetchAddresses()
  }
}

/** ======= Tab utilities end ======= */

/** ======= Address utilities start ======= */
const createAddressListItem = (address) => {
  const displayName = escapeHTML(address.display_name)
  const type = escapeHTML(address.type)

  const listItem = document.createElement('li')
  listItem.className = 'list-group-item'
  listItem.id = address.id

  const container = document.createElement('div')
  container.className = 'container p-0'
  listItem.appendChild(container)

  const row = document.createElement('div')
  row.className = 'row'
  container.appendChild(row)

  const col1 = document.createElement('div')
  col1.className = 'col-10'
  row.appendChild(col1)

  const badge = document.createElement('span')
  badge.className = 'badge bg-primary me-2'
  badge.textContent = type
  col1.appendChild(badge)

  const addressNameLink = document.createElement('button')
  addressNameLink.textContent = displayName
  addressNameLink.className = 'btn btn-link p-0'
  addressNameLink.onclick = () => openMessageModal(address)
  col1.appendChild(addressNameLink)

  const col2 = document.createElement('div')
  col2.className = 'col'
  row.appendChild(col2)

  Object.entries(address.channels).forEach(([channelName, channelValue]) => {
    const button = document.createElement('button')
    button.className = 'btn btn-sm btn-success'

    const icon = document.createElement('i')
    if (channelName != 'messaging') {
      button.addEventListener('click', () => dialAddress(channelValue))
    } else {

      button.addEventListener('click', () => {
        subscribeToNewMessages()
        openMessageModal(address)
      })
    }
    if (channelName === 'messaging') {
      icon.className = 'bi bi-chat'
    } else if (channelName === 'video') {
      icon.className = 'bi bi-camera-video'
    } else if (channelName === 'audio') {
      icon.className = 'bi bi-phone'
    }
    button.appendChild(icon)

    col2.appendChild(button)
  })

  const row2 = document.createElement('div')
  const addressUrl = Object.values(address.channels)[0]
  let strippedUrl = addressUrl.split('?')[0]
  row2.textContent = strippedUrl
  container.appendChild(row2)

  return listItem
}

function updateAddressUI() {
  const addressDiv = document.getElementById('addresses')
  const { data: addresses } = window.__addressData

  const addressUl = addressDiv.querySelector('ul')
  addressUl.innerHTML = ''
  addresses
    .map(createAddressListItem)
    .forEach((item) => addressUl.appendChild(item))
  subscribeToNewMessages();
}

async function fetchAddresses() {
  if (!client) return
  try {
    const searchText = searchInput.value
    const selectedType = searchType.value

    const addressData = await client.address.getAddresses({
      type: selectedType === 'all' ? undefined : selectedType,
      displayName: !searchText.length ? undefined : searchText,
      pageSize: 10,
    })
    window.__addressData = addressData
    updateAddressUI()
  } catch (error) {
    console.error('Unable to fetch addresses', error)
  }
}

window.dialAddress = async (address) => {
  const destinationInput = document.getElementById('destination')
  destinationInput.value = address
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

sendMessageBtn.addEventListener('click', async () => {
  if (!client) return
  const address = window.__currentAddress
  const text = conversationMessageInput.value
  await client.conversation.sendMessage({
    addressId: address.id,
    text,
  })
  conversationMessageInput.value = ''
})

/** ======= Address utilities end ======= */

/** ======= History utilities start ======= */
function formatMessageDate(date) {
  const dateOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }
  return new Date(date).toLocaleString('en-US', dateOptions)
}

function createConversationListItem(convo) {
  const item = document.createElement('li')
  item.classList.add('list-group-item')
  item.id = convo.id

  const convoDiv = document.createElement('div')
  convoDiv.className = 'd-flex align-items-center'

  const labelSpan = document.createElement('span')
  labelSpan.textContent = 'Conversation name: '
  labelSpan.className = 'me-1'

  const convoNameLink = document.createElement('button')
  convoNameLink.textContent = convo.name
  convoNameLink.className = 'btn btn-link p-0'
  convoNameLink.onclick = () => openMessageModal(convo)

  convoDiv.appendChild(labelSpan)
  convoDiv.appendChild(convoNameLink)
  item.appendChild(convoDiv)

  const lastMessageDiv = document.createElement('div')
  lastMessageDiv.textContent = `Last message at: ${formatMessageDate(
    convo.last_message_at
  )}`
  lastMessageDiv.classList.add('small', 'text-secondary')
  item.appendChild(lastMessageDiv)
  return item
}

function updateHistoryUI() {
  const historyDiv = document.getElementById('histories')
  const { data: histories } = window.__historyData

  const historyUl = historyDiv.querySelector('ul')
  historyUl.innerHTML = ''
  histories
    .map(createConversationListItem)
    .forEach((item) => historyUl.appendChild(item))
}

async function fetchHistories() {
  if (!client) return
  try {
    const historyData = await client.conversation.getConversations({
      pageSize: 10,
    })
    window.__historyData = historyData
    updateHistoryUI()
    subscribeToNewMessages()
  } catch (error) {
    console.error('Unable to fetch histories', error)
  }
}

function createLiveMessageListItem(msg) {
  const listItem = document.createElement('li')
  listItem.classList.add('list-group-item')
  listItem.id = msg.id
  const formattedTimestamp = formatMessageDate(msg.ts * 1000)
  listItem.innerHTML = `
    <div class="d-flex flex-column">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h6 class="mb-0 text-capitalize">${msg.type ?? 'unknown'}</h6>
          <p class="mb-1 fst-italic">${msg.conversation_name}</p>
        <div>
        <div class="d-flex align-items-center gap-1">
          <span class="badge bg-info">${msg.subtype ?? 'unknown'}</span>
          <span class="badge bg-success">${msg.kind ?? 'unknown'}</span>
        </div>
      </div>
      <p class="text-muted small mb-0">${formattedTimestamp}</p>
    </div>
  `
  return listItem
}

let isConvoSubscribed = false
function subscribeToNewMessages() {
  if (!isConvoSubscribed) {
    client.conversation.subscribe((newMsg) => {
      console.log('New message received!', newMsg)

      // Refetch both histories and directories to update the last message time (no await)
      Promise.all([fetchHistories(), fetchAddresses()])

      // If message modal is opened, update modal message list
      const oldMessages = window.__messageData
      if (
        oldMessages &&
        newMsg.conversation_id === oldMessages?.data?.[0]?.conversation_id
      ) {
        const messageList = msgModalDiv.querySelector('#messageList')
        const newListItem = createMessageListItem(newMsg)
        if (messageList.firstChild) {
          messageList.insertBefore(newListItem, messageList.firstChild)
        } else {
          messageList.appendChild(newListItem)
        }
      }

      // Update in call live messages
      const liveMessageList = document.querySelector('#liveMessageList')
      const newListItem = createLiveMessageListItem(newMsg)
      if (liveMessageList.firstChild) {
        liveMessageList.insertBefore(newListItem, liveMessageList.firstChild)
      } else {
        liveMessageList.appendChild(newListItem)
      }
    })
    isConvoSubscribed = true
  }
}

/** ======= History utilities end ======= */

/** ======= Message utilities start ======= */
function createMessageListItem(msg) {
  const listItem = document.createElement('li')
  listItem.classList.add('list-group-item')
  listItem.id = msg.id
  const formattedTimestamp = formatMessageDate(msg.ts * 1000)
  listItem.innerHTML = `
    <div class="d-flex flex-column">
      <div class="d-flex justify-content-between align-items-center">
        <h6 class="mb-0 text-capitalize">${msg.text}</h6>
        <div class="d-flex align-items-center gap-1">
          <span class="badge bg-info">${msg.type}</span>
          <span class="badge bg-info">${msg.subtype ?? 'unknown'}</span>
          <span class="badge bg-success">${msg.kind ?? 'unknown'}</span>
        </div>
      </div>
      <p class="text-muted small mb-0">${formattedTimestamp}</p>
    </div>
  `
  return listItem
}

const msgModalDiv = document.getElementById('messageModal')

msgModalDiv.addEventListener('hidden.bs.modal', clearMessageModal)

function clearMessageModal() {
  window.__messageData = null
  const titleH2 = msgModalDiv.querySelector('.title')
  const typeBadgeSpan = msgModalDiv.querySelector('.type-badge')
  const contactBtnDiv = msgModalDiv.querySelector('.contact-buttons')
  const messageList = msgModalDiv.querySelector('#messageList')
  const loaderListItem = msgModalDiv.querySelector('#messageList li')
  const avatarImage = msgModalDiv.querySelector('.avatar')
  titleH2.textContent = ''
  typeBadgeSpan.textContent = ''
  contactBtnDiv.classList.add('d-none')
  // Remove all the message list item except the first one (loader)
  Array.from(messageList.children)
    .slice(1)
    .forEach((item) => item.remove())
  loaderListItem.classList.remove('d-none')
  // Set the new image URL to the avatar image for the next time the modal opens
  const newImageUrl = `https://i.pravatar.cc/125?img=${
    Math.floor(Math.random() * 70) + 1
  }`
  if (avatarImage) {
    avatarImage.src = newImageUrl
  }
  window.__currentAddress = undefined
}

async function openMessageModal(data) {
  window.__currentAddress = data
  const modal = new bootstrap.Modal(msgModalDiv)
  modal.show()

  const titleH2 = msgModalDiv.querySelector('.title')
  titleH2.textContent = data.display_name || data.name || 'John Doe'

  if (data.type) {
    const typeBadgeSpan = msgModalDiv.querySelector('.type-badge')
    typeBadgeSpan.textContent = data.type
    typeBadgeSpan.classList.add('badge', 'bg-primary')
  }

  if (data.channels) {
    const contactBtnDiv = msgModalDiv.querySelector('.contact-buttons')
    contactBtnDiv.classList.remove('d-none')
    if (data.channels.audio) {
      const audioBtn = contactBtnDiv.querySelector('.btn-dial-audio')
      audioBtn.classList.remove('d-none')
      audioBtn.addEventListener('click', () => {
        dialAddress(data.channels.audio)
        modal.hide()
      })
    }
    if (data.channels.video) {
      const videoBtn = contactBtnDiv.querySelector('.btn-dial-video')
      videoBtn.classList.remove('d-none')
      videoBtn.addEventListener('click', () => {
        dialAddress(data.channels.video)
        modal.hide()
      })
    }
    if (data.channels.messaging) {
      const messagingBtn = contactBtnDiv.querySelector('.btn-dial-messaging')
      messagingBtn.classList.remove('d-none')
      messagingBtn.addEventListener('click', () => {
        dialAddress(data.channels.messaging)
        modal.hide()
      })
    }
  }

  // Fetch messages and populate the UI
  await fetchMessages(data.id)
}

function updateMessageUI() {
  const { data: messages } = window.__messageData
  const messageList = msgModalDiv.querySelector('#messageList')
  const loaderListItem = messageList.querySelector('li')
  loaderListItem.classList.add('d-none')
  if (!messages?.length) {
    const noMsglistItem = document.createElement('li')
    noMsglistItem.classList.add('list-group-item')
    noMsglistItem.innerHTML = `
      <div class="d-flex justify-content-center">
          <h6 class="my-2">No messages yet!</h6>
      </div>
    `
    messageList.appendChild(noMsglistItem)
    return
  }
  messages
    .map(createMessageListItem)
    .forEach((li) => messageList.appendChild(li))
}

async function fetchMessages(id) {
  if (!client) return
  try {
    const messages = await client.conversation.getConversationMessages({
      addressId: id,
    })
    window.__messageData = messages
    updateMessageUI()
  } catch (error) {
    console.error('Unable to fetch messages', error)
  }
}

/** ======= Message utilities end ======= */
