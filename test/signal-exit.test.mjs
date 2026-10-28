import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { onExit } from 'signal-exit'

test('signal-exit is a direct dependency and exports onExit', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

  assert.equal(typeof pkg.devDependencies['signal-exit'], 'string')
  assert.equal(typeof onExit, 'function')
})
