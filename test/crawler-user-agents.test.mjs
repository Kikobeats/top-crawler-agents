import assert from 'node:assert/strict'
import { test } from 'node:test'

import crawlerUserAgents from 'crawler-user-agents'

test('every crawler-user-agents entry has a list of User-Agent strings', () => {
  const userAgents = crawlerUserAgents.map(item => item.instances).flat()

  assert.ok(userAgents.length > 0)
  assert.ok(userAgents.every(ua => typeof ua === 'string' && ua.length > 0))
})
