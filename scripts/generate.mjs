'use strict'

import { createRequire } from 'module'
import { writeFile } from 'fs/promises'
import Bottleneck from 'bottleneck'
// import { writeFileSync } from 'fs'
import { styleText } from 'util'
import { load } from 'cheerio'
import pFilter from 'p-filter'
import pEvery from 'p-every'

import { withFetch, withPrerender } from './fetcher.mjs'

const CHECK = { true: '✅', false: '❌' }
const MAX_CONCURRENCY = Number(process.env.MAX_CONCURRENCY) || 1
const MIN_WAIT_TIME = Number(process.env.MIN_WAIT_TIME) || 5000

const VERIFICATIONS = [
  [
    'https://twitter.com/Kikobeats/status/1687837848802578432',
    $ => !!$('meta[property="og:image"]').attr('content'),
    withFetch
  ],
  [
    'https://www.youtube.com/watch?v=vkddaKFgO5g&app=desktop',
    $ => $('title').text() === 'INFINITO AL 40% - YouTube',
    withPrerender
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
  minTime: MIN_WAIT_TIME
})

const verify = (userAgent, index) => {
  if (index !== 0) console.log()
  console.log(`[${index + 1}/${total}] ${userAgent}\n`)
  return pEvery(
    VERIFICATIONS,
    async ([url, verifyFn, fetcher]) =>
      limiter.schedule(async () => {
        let result = false
        let statusCode
        try {
          const { html, statusCode: _statusCode } = await fetcher(
            url,
            userAgent
          )
          statusCode = _statusCode
          result = await verifyFn(load(html))
        } catch (error) {
          console.log('ERROR', error)
        }
        console.log(
          ' ' + styleText('gray', `${url} (${statusCode}) ${CHECK[result]}`)
        )
        return result
      }),
    { concurrency: MAX_CONCURRENCY }
  )
}

console.log('Starting verification of user agents...')
console.log(`Using ${MAX_CONCURRENCY} concurrent requests and a minimum wait time of ${MIN_WAIT_TIME}ms`)

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
