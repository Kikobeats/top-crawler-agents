import assert from 'node:assert/strict'
import { test } from 'node:test'

import { acceptedUserAgents } from '../scripts/accepted-user-agents.mjs'

test('keeps accepted User-Agents and skips entries that have none', () => {
  const bots = [
    {
      id: 'google',
      instances: { accepted: ['Googlebot/2.1'], rejected: ['not-google'] },
      pattern: { accepted: ['Googlebot\\/'] }
    },
    // '' is present, so ?? [] must keep it. || [] would drop it.
    { id: 'blank', instances: { accepted: '' } },
    { id: 'chatgpt-agent', pattern: { accepted: ['ChatGPT\\/'] } },
    { id: 'missing-accepted', instances: {} },
    { id: 'null-accepted', instances: { accepted: null } },
    { id: 'empty-accepted', instances: { accepted: [] } }
  ]

  assert.deepEqual(acceptedUserAgents(bots), ['Googlebot/2.1', ''])
})

test('a payload that is not an array fails instead of writing an empty list', () => {
  assert.throws(() => acceptedUserAgents({ bots: [] }), TypeError)
})
