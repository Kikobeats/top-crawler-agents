'use strict'

import { createRequire } from 'module'
import { writeFile } from 'fs/promises'
import Bottleneck from 'bottleneck'
import { styleText } from 'util'
import { load } from 'cheerio'
import pFilter from 'p-filter'
import pEvery from 'p-every'

const CHECK = { true: '✅', false: '❌' }
const MAX_CONCURRENCY = 1
const REQ_TIMEOUT = 10000

const VERIFICATIONS = [
  [
    'https://twitter.com/Kikobeats/status/1687837848802578432',
    $ => !!$('meta[property="og:image"]').attr('content')
  ],
  [
    'https://www.youtube.com/watch?v=vkddaKFgO5g&app=desktop',
    $ => $('title').text() === 'INFINITO AL 40% - YouTube'
  ]
]

const SOURCES = [
  async () => {
    const res = await fetch(
      'https://raw.githubusercontent.com/arcjet/well-known-bots/main/well-known-bots.json'
    )
    const json = await res.json()
    return json.map(item => item.instances.accepted).flat()
  },
  () => {
    const mod = createRequire(import.meta.url)(
      'crawler-user-agents/crawler-user-agents.json'
    )
    const userAgents = mod.map(item => item.instances).flat()
    return userAgents
  }
]

const userAgents = [
  ...new Set((await Promise.all(SOURCES.map(fn => fn()))).flat())
].sort((a, b) => a.localeCompare(b))

const total = userAgents.length

const limiter = new Bottleneck({
  minTime: 5000
})

const verify = (userAgent, index) => {
  if (index !== 0) console.log()
  console.log(`[${index + 1}/${total}] ${userAgent}\n`)
  return pEvery(
    VERIFICATIONS,
    async ([url, verifyFn]) =>
      limiter.schedule(async () => {
        let result = false
        let statusCode
        try {
          const controller = new AbortController()
          setTimeout(() => controller.abort(), REQ_TIMEOUT)
          const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'user-agent': userAgent, redirect: 'manual' }
          })
          const html = await res.text()
          statusCode = res.status
          result = await verifyFn(load(html))
        } catch (_) {}
        console.log(
          ' ' + styleText('gray', `${url} (${statusCode}) ${CHECK[result]}`)
        )
        return result
      }),
    { concurrency: MAX_CONCURRENCY }
  )
}

Promise.resolve()
  .then(() =>
    pFilter(userAgents, verify, {
      concurrency: MAX_CONCURRENCY
    })
  )
  .then(async result => {
    const sorted = result.sort((a, b) => a.localeCompare(b))
    await writeFile('index.json', JSON.stringify(sorted, null, 2))
    console.log(`\nGenerated ${sorted.length} crawlers ✨`)
  })
