/* global AbortController, fetch */

'use strict'

import { createRequire } from 'module'
import { writeFile } from 'fs/promises'
import { load } from 'cheerio'
import pFilter from 'p-filter'
import pEvery from 'p-every'

const crawlers = createRequire(import.meta.url)('crawler-user-agents/crawler-user-agents.json')

const CHECK = { true: '✅', false: '❌' }
const MAX_CONCURRENCY = 10
const REQ_TIMEOUT = 10000

const candidates = [...new Set(crawlers.flatMap(crawler => crawler.instances))]

const teslaUrl = await fetch('https://api.teslahunt.io/cars?maxRecords=1', { headers: { 'x-api-key': process.env.TESLAHUNT_API_KEY } })
  .then(res => res.json())
  .then(cars => cars[0].detailsUrl)

const URLS = [
  'https://twitter.com/Kikobeats/status/1687837848802578432',
  teslaUrl
]

const verifyUrl = userAgent => async url => {
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), REQ_TIMEOUT)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': userAgent, redirect: 'manual' }
    })
    const html = await res.text()
    const $ = load(html)
    const imageUrl = $('meta[property="og:image"]').attr('content')
    return !!imageUrl
  } catch (_) {
    return false
  }
}

const verify = async (userAgent, index) =>
  pEvery(URLS, verifyUrl(userAgent)).then(result => {
    console.log(`${CHECK[result]} ${index}/${candidates.length} ${userAgent}`)
    return result
  })

Promise.resolve()
  .then(() => pFilter(candidates, verify, { concurrency: MAX_CONCURRENCY }))
  .then(async result => {
    await writeFile('index.json', JSON.stringify(result, null, 2))
    console.log(`\nGenerated ${result.length} crawlers ✨`)
  })
