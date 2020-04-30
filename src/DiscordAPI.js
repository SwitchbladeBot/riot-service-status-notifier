const fetch = require('node-fetch')

module.exports = class DiscordAPI {
  constructor (options) {
    this.token = options.token
    this.baseUrl = 'https://discordapp.com/api/v6'
  }

  post (path, body) {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${this.token}`
      }
    }).then(res => res.json())
  }

  sendMessage (channelId, message) {
    return this.post(`/channels/${channelId}/messages`, message)
  }
}
