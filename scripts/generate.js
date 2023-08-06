'use strict'

const crawlers = require('crawler-user-agents')
const { writeFile } = require('fs/promises')
const { load } = require('cheerio')
const pFilter = require('p-filter')

const EMOJI = { true: '✅', false: '❌' }
const MAX_CONCURRENCY = 10

const candidates = crawlers.map(crawler => crawler.instances[0]).filter(Boolean)

const verify = async (userAgent, index) => {
  try {
    const res = await fetch(
      'https://twitter.com/Kikobeats/status/1687837848802578432',
      {
        headers: { 'user-agent': userAgent, redirect: 'manual' }
      }
    )
    const html = await res.text()
    const $ = load(html)
    const imageUrl = $('meta[property="og:image"]').attr('content')
    const isValid = !!imageUrl
    console.log(`${index}/${candidates.length} ${userAgent} ${EMOJI[isValid]}`)
    return isValid
  } catch (_) {
    console.log(`${index}/${candidates.length} ${userAgent} ${EMOJI.false}`)
    return false
  }
}

Promise.resolve()
  .then(() => pFilter(candidates, verify, { concurrency: MAX_CONCURRENCY }))
  .then(async result => {
    await writeFile('index.json', JSON.stringify(result, null, 2))
    console.log(`Generated ${result.length} crawlers ✨`)
  })
