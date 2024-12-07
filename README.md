# top-crawler-agents

![Last version](https://img.shields.io/github/tag/Kikobeats/top-crawler-agents.svg?style=flat-square)
[![NPM Status](https://img.shields.io/npm/dm/top-crawler-agents.svg?style=flat-square)](https://www.npmjs.org/package/top-crawler-agents)

> A list of common crawler user agents useful for retrieving metadata from links<br>
> derivated from [crawler-user-agents](https://github.com/monperrus/crawler-user-agents).

Some websites (such as [Twitter](https://twitter.com/Kikobeats/status/1687844145019092993)) only return rich HTML metadata if you are identified as popular crawler (like Slack, or WhatsApp).

The list is derivated from [crawler-user-agents](https://github.com/monperrus/crawler-user-agents) after applying a [script](/scripts/generate.js), so it's always up-to-date to latest changes.

## Install

```bash
$ npm install top-crawler-agents --save
```

## Usage

```js
const uniqueRandomArray = require('unique-random-array')

const randomCrawlerAgent = uniqueRandomArray(require('top-crawler-agents'))

console.log(randomCrawlerAgent())
// => 'Slackbot-LinkExpanding (+https://api.slack.com/robots)'
```

## Related

- [top-user-agents](https://github.com/Kikobeats/top-user-agents) – A list of most common User Agent used on Internet.

**top-crawler-agents** © [Kiko Beats](https://kikobeats.com), released under the [MIT](https://github.com/Kikobeats/top-crawler-agents/blob/master/LICENSE.md) License.<br>
Authored and maintained by [Kiko Beats](https://kikobeats.com) with help from [contributors](https://github.com/Kikobeats/top-crawler-agents/contributors).

> [kikobeats.com](https://kikobeats.com) · GitHub [Kiko Beats](https://github.com/Kikobeats) · X [@Kikobeats](https://x.com/Kikobeats)
