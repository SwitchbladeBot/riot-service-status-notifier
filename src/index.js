const Sentry = require('@sentry/node')
Sentry.init({ dsn: process.env.SENTRY_DSN })

const { MongoClient } = require('mongodb')
const mongo = new MongoClient(process.env.MONGODB_URI, { useUnifiedTopology: true })

const DiscordAPI = require('./DiscordAPI.js')
const discord = new DiscordAPI({ token: process.env.DISCORD_TOKEN })

const RiotServiceStatusAPI = require('./RiotServiceStatusAPI.js')

const servicesConfig = require('./services.json')

Promise.all([
  mongo.connect().then(() => {
    console.info('Connected to the database')
  }),
  Promise.all(servicesConfig.map(service => {
    return Promise.all(service.regions.map(async region => {
      console.debug(`Fetching ocurrences for ${service.name} ${region}`)
      const serviceStatus = await RiotServiceStatusAPI.getStatus(service.name, region)
      console.debug(`Finished fetching ocurrences for ${service.name} ${region}`)
      return {
        serviceName: service.name,
        ...serviceStatus
      }
    }))
  })).then(services => {
    console.info('All ocurrences received')
    return services
  })
]).then(async ([, services]) => {
  const database = mongo.db(process.env.MONGODB_DATABASE)
  const notificationCollection = database.collection('notifications')

  const lastRun = await getLastRunDate(database)

  const ocurrences = []
  services.forEach(serviceRegions => {
    serviceRegions.forEach(region => {
      ['incidents', 'maintenances'].forEach(ocurrenceType => {
        region[ocurrenceType].forEach(ocurrence => {
          if (isOcurrenceNew(ocurrence, lastRun)) {
            const ocurrenceIndex = ocurrences.findIndex(o => ocurrence.id === o.id)
            if (ocurrenceIndex === -1) {
              ocurrences.push({
                ocurrenceType,
                serviceName: region.serviceName,
                affectedRegions: [region.id.toLowerCase()],
                ...ocurrence
              })
            } else {
              ocurrences[ocurrenceIndex] = {
                affectedRegions: ocurrences[ocurrenceIndex].affectedRegions.push(region.id.toLowerCase()),
                ...ocurrences[ocurrenceIndex]
              }
            }
          }
        })
      })
    })
  })

  const filters = getFilterArray(ocurrences)

  console.info('Fetching configs from the database')
  notificationCollection.find({
    source: 'riotservicestatus',
    event: 'status_update',
    enabled: true,
    'settings.filters': {
      $in: filters
    }
  }).toArray().then(configs => {
    console.info(`Got ${configs.length} configs with these filters`)
    console.info('Closing database connection')
    updateLastRunDate(database)
    mongo.close()
    ocurrences.forEach(ocurrence => {
      const filters = getOcurrenceFilters(ocurrence)
      configs.filter(config => config.settings.filters.some(f => filters.includes(f))).forEach(config => {
        console.log('Sending message')
        sendOcurrenceMessage(ocurrence, config.channel_id)
      })
    })
  })
})

function isOcurrenceNew (ocurrence, lastRun) {
  const createdDate = new Date(ocurrence.created_at || 0)
  const updatedDate = new Date(ocurrence.updated_at || 0)
  if (createdDate.getTime() > lastRun.getTime() || updatedDate.getTime > lastRun.getTime()) return true
  return false
}

async function getLastRunDate (database) {
  const globalConfigCollection = database.collection('globalconfig')
  const lastRunDoc = await globalConfigCollection.findOne({ _id: 'riot-service-status-notifier:lastRun' })
  return lastRunDoc ? new Date(lastRunDoc.value) : new Date(0)
}

async function updateLastRunDate (database) {
  const globalConfigCollection = database.collection('globalconfig')
  await globalConfigCollection.findOneAndUpdate({
    _id: 'riot-service-status-notifier:lastRun'
  }, {
    $set: {
      value: Date.now()
    }
  }, { upsert: true })
}

function sendOcurrenceMessage (ocurrence, channelId, language = 'en_US') {
  discord.sendMessage(channelId, {
    embed: {
      title: ocurrence.titles.find(t => t.locale === language).content,
      description: ocurrence.updates[0].translations.find(t => t.locale === language).content,
      author: {
        name: 'Riot Games Service Status',
        url: `https://status.riotgames.com/?locale=${language}`,
        icon_url: 'https://i.imgur.com/T2pSiG9.png'
      },
      footer: {
        text: `Affected regions: ${ocurrence.affectedRegions.join(', ')}`
      },
      color: getOcurrenceColor(ocurrence)
    }
  }).catch(console.error)
}

function getFilterArray (ocurrences) {
  function addFilter (filterString) {
    if (!filters.includes(filterString)) filters.push(filterString)
  }
  const filters = ['*']
  ocurrences.forEach(ocurrence => {
    getOcurrenceFilters(ocurrence).forEach(addFilter)
  })

  return filters
}

function getOcurrenceFilters (ocurrence) {
  return [
    '*',
    `${ocurrence.serviceName}.*`,
    ...ocurrence.affectedRegions.map(region => {
      return `${ocurrence.serviceName}.${region}`
    })
  ]
}

function getOcurrenceColor (ocurrence) {
  const colors = {
    warning: 0xe69700,
    critical: 0xbe29cc,
    informational: 0x7e7e7e
  }
  return colors[ocurrence.incident_severity] || 0x7e7e7e
}
