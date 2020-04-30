const Sentry = require('@sentry/node')
Sentry.init({ dsn: process.env.SENTRY_DSN })

const DiscordAPI = require('./DiscordAPI.js')
const discord = new DiscordAPI({ token: process.argv[2] })

const RiotServiceStatusAPI = require('./RiotServiceStatusAPI.js')

const services = require('./services.json')

// CRITICAL - #be29cc
// WARNING - #e69700
// INFORMATIONAL - 7e7e7e

Promise.all(services.map(service => {
  return Promise.all(service.regions.map(region => {
    return RiotServiceStatusAPI.getStatus(service.name, region)
  }))
})).then(serviceStatuses => {
  // do stuff with the statuses here
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
