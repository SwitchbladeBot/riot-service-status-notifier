const fetch = require('node-fetch')

module.exports = class RiotServiceStatusAPI {
  static getStatus (service, region) {
    return fetch(`https://${service}.secure.dyn.riotcdn.net/channels/public/x/status/${region}.json`).then(res => res.json())
  }

  static getArchivedStatus (service, region) {
    return fetch(`https://${service}.secure.dyn.riotcdn.net/channels/public/x/status/archived/${region}.json`).then(res => res.json())
  }

  static getTranslation (language) {
    return fetch(`https://status.riotgames.com/locales/${language}/translation.json`).then(res => res.json())
  }
}
