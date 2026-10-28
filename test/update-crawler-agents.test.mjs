import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const stub = `import { writeFileSync } from 'node:fs'
if (process.env.GENERATE_EXIT) process.exit(Number(process.env.GENERATE_EXIT))
writeFileSync('index.json', process.env.GENERATE_BODY ?? '[]\\n')
`

const git = (cwd, args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

const setup = () => {
  const root = mkdtempSync(join(tmpdir(), 'crawler-update-'))
  const bare = join(root, 'bare.git')
  const work = join(root, 'work')
  const quiet = { stdio: 'ignore' }
  execFileSync('git', ['init', '--bare', '-b', 'master', bare], quiet)
  execFileSync('git', ['clone', bare, work], quiet)
  git(work, ['config', 'user.email', 'test@example.com'])
  git(work, ['config', 'user.name', 'Test'])
  git(work, ['config', 'core.hooksPath', '/dev/null'])
  mkdirSync(join(work, 'scripts'))
  writeFileSync(join(work, 'index.json'), '[]\n')
  writeFileSync(join(work, 'scripts', 'generate.mjs'), stub)
  writeFileSync(join(work, 'package.json'), JSON.stringify({
    scripts: {
      cronjob: pkg.scripts.cronjob,
      healthcheck: "node -e \"require('node:fs').writeFileSync('healthcheck-ran','')\"",
      'update:crawler-agents': pkg.scripts['update:crawler-agents']
    }
  }))
  execFileSync('git', ['add', 'index.json'], { cwd: work, stdio: 'ignore' })
  execFileSync('git', ['commit', '-m', 'init', '--no-verify'], { cwd: work, stdio: 'ignore' })
  execFileSync('git', ['push', '-u', 'origin', 'HEAD'], { cwd: work, stdio: 'ignore' })
  return { root, bare, work }
}

const run = (work, script, env = {}) =>
  execFileSync('npm', ['run', script], {
    cwd: work,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  })

const fails = (fn) => {
  try {
    fn()
  } catch (error) {
    assert.notEqual(error.status, 0)
    return
  }
  assert.fail('expected the script to fail')
}

test('an unchanged index.json does not create a commit', t => {
  const repo = setup()
  t.after(() => rmSync(repo.root, { recursive: true, force: true }))
  const before = git(repo.work, ['rev-parse', 'HEAD'])

  run(repo.work, 'update:crawler-agents')

  assert.equal(git(repo.work, ['rev-parse', 'HEAD']), before)
  assert.equal(git(repo.bare, ['rev-parse', 'HEAD']), before)
})

test('a changed index.json is committed and pushed', t => {
  const repo = setup()
  t.after(() => rmSync(repo.root, { recursive: true, force: true }))

  run(repo.work, 'update:crawler-agents', { GENERATE_BODY: '["Googlebot"]\n' })

  assert.equal(git(repo.work, ['log', '-1', '--format=%s']), 'build(update): crawlers')
  assert.equal(readFileSync(join(repo.work, 'index.json'), 'utf8'), '["Googlebot"]\n')
  assert.equal(git(repo.bare, ['log', '-1', '--format=%s']), 'build(update): crawlers')
})

test('a failed generate does not commit and fails the job', t => {
  const repo = setup()
  t.after(() => rmSync(repo.root, { recursive: true, force: true }))
  const before = git(repo.work, ['rev-parse', 'HEAD'])

  fails(() => run(repo.work, 'update:crawler-agents', { GENERATE_EXIT: '1' }))

  assert.equal(git(repo.work, ['rev-parse', 'HEAD']), before)
})

test('a failed commit fails the job', t => {
  const repo = setup()
  t.after(() => rmSync(repo.root, { recursive: true, force: true }))

  fails(() => run(repo.work, 'update:crawler-agents', {
    GENERATE_BODY: '["NoIdentity"]\n',
    GIT_AUTHOR_NAME: '',
    GIT_AUTHOR_EMAIL: '',
    GIT_COMMITTER_NAME: '',
    GIT_COMMITTER_EMAIL: ''
  }))
})

test('a failed push fails the job', t => {
  const repo = setup()
  t.after(() => rmSync(repo.root, { recursive: true, force: true }))
  git(repo.work, ['remote', 'set-url', 'origin', join(repo.root, 'missing.git')])

  fails(() => run(repo.work, 'update:crawler-agents', { GENERATE_BODY: '["PushFails"]\n' }))
})

test('cronjob does not ping the healthcheck when the update fails', t => {
  const repo = setup()
  t.after(() => rmSync(repo.root, { recursive: true, force: true }))

  fails(() => run(repo.work, 'cronjob', { GENERATE_EXIT: '1' }))

  assert.equal(existsSync(join(repo.work, 'healthcheck-ran')), false)
})

test('cronjob reaches the healthcheck when the update succeeds', t => {
  const repo = setup()
  t.after(() => rmSync(repo.root, { recursive: true, force: true }))

  run(repo.work, 'cronjob')

  assert.equal(existsSync(join(repo.work, 'healthcheck-ran')), true)
})
