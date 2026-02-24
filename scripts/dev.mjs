import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const run = (name, command, args, cwd) => {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: process.env
  })

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`)
      process.exitCode = code
    }
  })

  child.on('error', (err) => {
    console.error(`[${name}] failed:`, err.message)
    process.exitCode = 1
  })
}

run('client', 'node', ['./node_modules/vite/bin/vite.js'], path.join(root, 'client'))
run('server', 'node', ['./node_modules/ts-node-dev/lib/bin.js', '--respawn', '--transpile-only', 'src/index.ts'], path.join(root, 'server'))
