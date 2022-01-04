const tmi = require('tmi.js');
const OBSWebSocket = require('obs-websocket-js');
const obs = new OBSWebSocket();
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});

obs
  .connect({
    address: process.env.WS_ADDRESS,
    password: process.env.WS_PASSWORD,
  })
  .then(() => {
    console.log(`WebSocket: connected & authenticated.`);
  })
  .catch((err) => {
    console.log(`WebSocket Error:`, err);
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
  const [command, ...args] = message.toLowerCase().split(' ');

  if (self) return;

  if (isModUp && command === '!gamma') {
    if (args[0] === undefined) {
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
    } else if (!isNaN(args[0])) {
      obs
        .send('SetSourceFilterSettings', {
          sourceName: process.env.SOURCE_NAME,
          filterName: process.env.FILTER_NAME,
          filterSettings: { gamma: Number(args[0]) },
        })
        .then(() => {
          return obs.send('GetSourceFilterInfo', {
            sourceName: process.env.SOURCE_NAME,
            filterName: process.env.FILTER_NAME,
          });
        })
        .then((data) => {
          client.say(channel, `Gamma changed to ${data.settings.gamma}`);
        })
        .catch((err) => {
          client.say(channel, `Error: ${err.error}`);
        });
    }
  }

  if (isModUp && command === '!flip') {
    if (args[0] === undefined) {
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
  }
});

obs.on('StreamStarting', () => {
  obs
    .send('SetSceneItemProperties', {
      item: process.env.SOURCE_NAME,
      height: 1080,
      width: 1920,
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
    })
    .catch((err) => {
      console.log(`WebSocket Error - Reset flip on start:`, err);
    });

  obs
    .send('SetSourceFilterVisibility', {
      sourceName: process.env.SOURCE_NAME,
      filterName: process.env.FILTER_NAME,
      filterEnabled: false,
    })
    .catch((err) => {
      console.log(`WebSocket Error - Reset gamma on start:`, err);
    });
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
  }, 5000);
});

obs.on('error', (err) => {
  console.log(`WebSocket Error:`, err);
});
