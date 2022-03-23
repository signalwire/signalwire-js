import { Chat } from '@signalwire/js'

window.connect = async ({ channels, host, token }) => {
  const chat = new Chat.Client({
    host,
    token,
  })

  window.__chat = chat

  const _loadHistory = async () => {
    for (const channel of channels) {
      const history = await chat.getMessages({ channel })
      history.messages.reverse().forEach((message) => {
        console.debug('Append Message', message)
        _appendMessage({ ...message, channel })
      })
    }
  }

  const _getChannelMembers = async () => {
    const memberList = document.getElementById('members-list')

    for (const channel of channels) {
      const { members } = await chat.getMembers({
        channel,
      })
      members.forEach((member) => {
        const li = document.createElement('li')
        li.id = `member-${member.channel}-${member.id}`
        const a = document.createElement('a')
        a.onclick = function (e) {
          e.preventDefault()
          const memberId = e.target.getAttribute('data-id')
          const channel = e.target.getAttribute('data-channel')

          chat
            .getMemberState({
              channels: [channel],
              memberId,
            })
            .then((res) => {
              const { channels: states } = res
              Object.entries(states).forEach(([channel, { state }]) => {
                e.target.innerHTML = `${memberId} (channel=${channel}) (state=${JSON.stringify(
                  state
                )})`
              })
            })
        }
        a.href = '#'
        a.setAttribute('data-id', member.id)
        a.setAttribute('data-channel', member.channel)
        a.innerHTML = `${member.id} (channel=${
          member.channel
        }) (state=${JSON.stringify(member.state)})`
        li.appendChild(a)
        memberList.appendChild(li)
      })
    }
  }

  const _appendMessage = (message) => {
    const { content, channel, publishedAt } = message
    const messageEl = document.createElement('div')
    messageEl.classList.add('message', 'bg-indigo-200', 'p-2')
    messageEl.innerHTML = `
      <div class="message-meta"><span class="font-bold">At</span>: ${publishedAt}</div>
      <div class="message-body">${content}</div>
    `
    const channelEl = document.querySelector(
      `.chat-messages-channel-${channel}`
    )

    channelEl.appendChild(messageEl)
  }

  chat.on('session.expiring', async () => {
    console.debug('Fetch new token and keep the session up!')
    // chat.updateToken('<fresh-token-here>')
  })

  chat.on('message', (message) => {
    console.debug('Inbound Message', message)

    // message.id
    // message.channel
    // message.member
    // message.member.id
    // message.member.channel
    // message.member.state
    // message.publishedAt
    // message.content
    // message.meta // {}
    _appendMessage(message)
  })

  chat.on('member.joined', (member) => {
    console.log(
      'Member Joined a channel',
      member.id,
      member.channel,
      member.state
    )
  })
  chat.on('member.updated', (member) => {
    console.log('Member Updated', member.id, member.channel, member.state)
    const li = document.getElementById(`member-${member.channel}-${member.id}`)
    li.innerHTML = `${member.id} (channel=${
      member.channel
    }) (state=${JSON.stringify(member.state)})`
  })

  chat.on('member.left', (member) => {
    console.log(
      'Member Left a channel',
      member.id,
      member.channel,
      member.state
    )
  })

  await chat.subscribe(channels)

  // UI Sample code.
  // --------------------------
  const messageEl = document.getElementById('message')
  const messagesContainerEl = document.getElementById('chat-messages')
  const formEl = document.getElementById('chat-box')
  const channelSelectorEl = document.getElementById('chat-channels-selector')

  const stateFormEl = document.getElementById('state-form')
  const stateChannelSelectorEl = document.getElementById(
    'state-channels-selector'
  )

  window.disconnect = (channel) => {
    const el = document.querySelector(`.chat-messages-channel-${channel}`)
    el.classList.add('opacity-20', 'pointer-events-none')

    chat.unsubscribe(channel)
  }

  channels.forEach((channel) => {
    messagesContainerEl.insertAdjacentHTML(
      'beforeend',
      `<div
        class="chat-messages-channel-${channel} mt-6 px-4 py-5 bg-white space-y-6 sm:p-6"
       >
        <div class="font-bold">
          <button onclick="disconnect('${channel}')">Unsubscribe</button>
        </div>
        <p class="text-gray-700 text-xl font-extrabold tracking-tight mt-2">
          Channel: ${channel}
        </p>
      </div>`
    )
  })

  // Sets options for the channel selector.
  channelSelectorEl.innerHTML = channels
    .map((channel) => `<option value="${channel}">${channel}</option>`)
    .join('')

  stateChannelSelectorEl.innerHTML = channels
    .map((channel) => `<option value="${channel}">${channel}</option>`)
    .join('')

  formEl.addEventListener('submit', (e) => {
    e.preventDefault()

    const data = new FormData(formEl)

    chat.publish({
      channel: data.get('channel'),
      content: data.get('message'),
    })

    messageEl.value = ''
  })

  stateFormEl.addEventListener('submit', async (e) => {
    e.preventDefault()

    const data = new FormData(stateFormEl)
    const channel = data.get('channel')
    const state = data.get('state')
    await chat.setMemberState({
      channels: [channel],
      state: JSON.parse(state),
    })
    console.log('state state call done.')
  })

  _loadHistory()
  _getChannelMembers()
}

// UI Initialization
// --------------------------
document.getElementById('host').value =
  localStorage.getItem('relay.chat.example.host') || ''
document.getElementById('token').value =
  localStorage.getItem('relay.chat.example.token') || ''

window.saveInLocalStorage = (e) => {
  const key = e.target.name || e.target.id
  localStorage.setItem('relay.chat.example.' + key, e.target.value)
}

const chatJoin = document.getElementById('chat-join')
const chatConnected = document.getElementById('chat-connected')
const chatConnectEl = document.getElementById('chat-connect')

chatConnectEl.addEventListener('submit', async (e) => {
  e.preventDefault()

  const data = new FormData(chatConnectEl)
  const channels = data
    .get('channel')
    .split(',')
    .filter((channel) => channel.trim())
    .map((channel) => channel.trim())

  if (channels.length === 0) {
    // TODO: show error message
    return
  }

  // TODO: add loading indicator and try/catch
  await window.connect({
    channels,
    host: data.get('host'),
    token: data.get('token'),
  })

  chatJoin.style.display = 'none'
  chatConnected.style.display = 'block'
})
