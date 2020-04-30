const Sentry = require('@sentry/node')
Sentry.init({ dsn: process.env.SENTRY_DSN })

const fetch = require('node-fetch')

const LANG = 'en_US'

fetch('https://lol.secure.dyn.riotcdn.net/channels/public/x/status/na1.json').then(res => res.json()).then( json => {
  console.log(json)
  json.incidents.forEach(incident => {
    fetch('https://discordapp.com/api/channels/445647209892020234/messages', {
      method: 'post',
      body: JSON.stringify({
        embed: {
          title: incident.titles.find(t => t.locale === LANG).content,
          description: incident.updates[0].translations.find(t => t.locale === LANG).content,
          author: {
            name: 'Status de Serviço da Riot Games',
            url: `https://status.riotgames.com/?locale=${LANG}`,
            icon_url: 'https://i.imgur.com/T2pSiG9.png'
          },
          color: 13776442
        }
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${process.argv[2]}`
      }
    })
  })
})