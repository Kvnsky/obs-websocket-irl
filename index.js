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
    console.log(`WebSocket: connected & authenticated.`);
  })
  .catch((err) => {
    console.log(`WebSocket Error: ${err.code}`);
  });

obs.on('ConnectionClosed', () => {
  setTimeout(() => {
    obs
      .connect({
        address: process.env.WS_ADDRESS,
        password: process.env.WS_PASSWORD,
      })
      .then(() => {
        console.log(`WebSocket: connected & authenticated.`);
      })
      .catch(() => {
        console.log(`WebSocket: trying to reconnect!`);
      });
  }, 15000);
});

obs.on('error', (err) => {
  console.log('WebSocket Error:', err);
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

  if (isModUp && message.toLowerCase() === '!flip') {
    obs
      .send('GetSceneItemProperties', { item: process.env.SOURCE_NAME })
      .then((data) => {
        if (
          data.height === -1080 &&
          data.width === -1920 &&
          data.position.x === 1920 &&
          data.position.y === 1080 &&
          data.scale.x === -1 &&
          data.scale.y === -1
        ) {
          obs.send('SetSceneItemProperties', {
            item: process.env.SOURCE_NAME,
            height: 1080,
            width: 1920,
            position: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
          });
          client.say(channel, 'Source is now NORMAL');
        } else {
          obs.send('SetSceneItemProperties', {
            item: process.env.SOURCE_NAME,
            height: -1080,
            width: -1920,
            position: { x: 1920, y: 1080 },
            scale: { x: -1, y: -1 },
          });
          client.say(channel, 'Source is now FLIPPED');
        }
      })
      .catch((err) => {
        client.say(channel, `Error: ${err.error}`);
      });
  }
});
