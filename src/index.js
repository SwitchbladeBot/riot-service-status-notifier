const Sentry = require('@sentry/node')
Sentry.init({ dsn: process.env.SENTRY_DSN })

const DiscordAPI = require('./DiscordAPI.js')
const discord = new DiscordAPI({ token: process.argv[2] })

const RiotServiceStatusAPI = require('./RiotServiceStatusAPI.js')

const servicesConfig = require('./services.json')

// CRITICAL - #be29cc
// WARNING - #e69700
// INFORMATIONAL - 7e7e7e

const incidents = []

Promise.all(servicesConfig.map(service => {
  return Promise.all(service.regions.map(region => {
    return RiotServiceStatusAPI.getStatus(service.name, region)
  }))
})).then(services => {
  services.forEach(serviceRegions => {
    const ocurrences = []
    serviceRegions.forEach(region => {
      ['incidents', 'maintenances'].forEach(ocurrenceType => {
        region[ocurrenceType].forEach(incident => {
          if (ocurrences.findIndex(o => incident.id === o.id) === -1) ocurrences.push(incident)
        })
      })
    })
    ocurrences.forEach(ocurrence => {
      console.log(ocurrence)
      sendOcurrenceMessage(ocurrence, '516243264635011072')
    })
  })
})

function sendOcurrenceMessage (ocurrence, channelId, language = 'en_US') {
  discord.sendMessage(channelId, {
    embed: {
      title: ocurrence.titles.find(t => t.locale === language).content,
      description: ocurrence.updates[0].translations.find(t => t.locale === language).content,
      author: {
        name: 'Status de Serviço da Riot Games',
        url: `https://status.riotgames.com/?locale=${language}`,
        icon_url: 'https://i.imgur.com/T2pSiG9.png'
      },
      color: 13776442
    }
  })
}
