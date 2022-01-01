const tmi = require('tmi.js');
const OBSWebSocket = require('obs-websocket-js');
const obs = new OBSWebSocket();
require('dotenv').config();

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
  channels: [process.env.CHANNEL_NAME],
});

client.connect();

client.on('message', (channel, tags, message, self) => {
  const isModUp = tags.mod === true || channel.slice(1) === tags.username;

  if (self) return;

  if (isModUp && message.toLowerCase() === '!gamma') {
    obs
      .send('GetSourceFilterInfo', {
        sourceName: process.env.SOURCE_NAME,
        filterName: process.env.FILTER_NAME,
      })
      .then((data) => {
        if (data.enabled === true) {
          obs.send('SetSourceFilterVisibility', {
            sourceName: process.env.SOURCE_NAME,
            filterName: process.env.FILTER_NAME,
            filterEnabled: false,
          });
          client.say(channel, 'Gamma is now OFF');
        } else {
          obs.send('SetSourceFilterVisibility', {
            sourceName: process.env.SOURCE_NAME,
            filterName: process.env.FILTER_NAME,
            filterEnabled: true,
          });
          client.say(channel, `Gamma is now ON at ${data.settings.gamma}`);
        }
      })
      .catch((err) => {
        client.say(channel, `Error: ${err.error}`);
      });
  }

  obs
    .send('SetSceneItemProperties', {
      item: process.env.SOURCE_NAME,
      height: -1080,
      position: { alignment: 5, x: 1920, y: 1080 },
      scale: { filter: 'OBS_SCALE_DISABLE', x: -1, y: -1 },
      width: -1920,
    })
    .then((data) => {
      console.log(data);
    })
    .catch((err) => {
      console.log(err);
    });
});

obs.on('error', (err) => {
  console.log('socket error:', err);
});
