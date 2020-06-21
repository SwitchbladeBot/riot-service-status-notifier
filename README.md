# riot-service-status-notifier

CronJob that sends Discord notifications about changes in [Riot Games' Service Status](https://status.riotgames.com/)

## TO-DOs
- [x] Query service status from Riot
- [x] Query configured notifications from the database
  - [x] Filter configs when pulling them
- [x] Send ocurrences as messages to Discord
  - [x] To the correct channel
- [ ] Translation
- [ ] Custom messages/embeds
  - [ ] Templating
- [ ] **Only send ocurrences that have been updated/created since last run**
- [ ] Send notifications when an ocurrence gets archived/closed

## Example
![Example](https://i.imgur.com/WIwvWD1.png)