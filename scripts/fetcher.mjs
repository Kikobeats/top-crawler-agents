import createBrowser from 'browserless'
import { onExit } from 'signal-exit'
import puppeteer from 'puppeteer'

const REQ_TIMEOUT = 10000

let singletonBrowser = null

const browser = async () => {
  if (!singletonBrowser) {
    const browser = createBrowser({ puppeteer })
    onExit(browser.close)
    singletonBrowser = browser
  }
  return singletonBrowser.createContext()
}

export const withPrerender = async (url, userAgent) => {
  const browserless = await browser()
  const fn = browserless.evaluate(
    async (_, response, error) => {
      if (error) throw error
      const status = response.status()
      if (response.status() !== 200) {
        throw new TypeError(`Response status: ${status}`)
      }

      return {
        html: await response.text(),
        statusCode: status
      }
    },
    {
      headers: { 'user-agent': userAgent }
    }
  )

  const result = await fn(url)
  await browserless.destroyContext()
  return result
}

export const withFetch = async (url, userAgent) => {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), REQ_TIMEOUT)
  const res = await fetch(url, {
    signal: controller.signal,
    headers: { 'user-agent': userAgent, redirect: 'manual' }
  })
  const html = await res.text()
  return { html, statusCode: res.status }
}
