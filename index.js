const tmi = require('tmi.js');
const OBSWebSocket = require('obs-websocket-js');
const obs = new OBSWebSocket();
require('dotenv').config();

const CHANNEL_NAME = ['channelname'];
const SOURCE_NAME = 'sourcename';
const FILTER_NAME = 'filtername';

obs
  .connect({
    address: process.env.WS_ADDRESS,
    password: process.env.WS_PASSWORD,
  })
  .then(() => {
    console.log(`Websocket connected & authenticated.`);
  })
  .catch((err) => {
    console.log(err);
  });

const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.BOT_OAUTH,
  },
  channels: CHANNEL_NAME,
});

client.connect();

client.on('message', (channel, user, message, self) => {
  const isMod = user.mod || user['user-type'] === 'mod';
  const isBroadcaster = channel.slice(1) === user.username;
  const isModUp = isMod || isBroadcaster;

  // Ignore echoed messages.
  if (self) return;

  if (isModUp) {
    if (message.toLowerCase() === '!gammaon') {
      obs
        .send('SetSourceFilterVisibility', {
          sourceName: SOURCE_NAME,
          filterName: FILTER_NAME,
          filterEnabled: true,
        })
        .then(() => {
          return obs.send('GetSourceFilterInfo', {
            sourceName: SOURCE_NAME,
            filterName: FILTER_NAME,
          });
        })
        .then((data) => {
          client.say(channel, `Gamma state set to: ${data.enabled}`);
        });
    }

    if (message.toLowerCase() === '!gammaoff') {
      obs
        .send('SetSourceFilterVisibility', {
          sourceName: SOURCE_NAME,
          filterName: FILTER_NAME,
          filterEnabled: false,
        })
        .then(() => {
          return obs.send('GetSourceFilterInfo', {
            sourceName: SOURCE_NAME,
            filterName: FILTER_NAME,
          });
        })
        .then((data) => {
          client.say(channel, `Gamma state set to: ${data.enabled}`);
        });
    }
  }
});
