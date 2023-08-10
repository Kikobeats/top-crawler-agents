'use strict'

const crawlers = require('crawler-user-agents')
const { writeFile } = require('fs/promises')
const { load } = require('cheerio')
const pFilter = require('p-filter')
const pEvery = require('p-every')

const CHECK = { true: '✅', false: '❌' }
const MAX_CONCURRENCY = 10
const REQ_TIMEOUT = 10000

const candidates = [...new Set(crawlers.flatMap(crawler => crawler.instances))]

const URLS = [
  'https://twitter.com/Kikobeats/status/1687837848802578432'
  // 'https://www.tesla.com/nl_NL/m3/order/LRW3228_606edc0abaa8666f9e88d89a1b30e988?titleStatus=new&redirect=no#overview'
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
