import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFile } from 'node:child_process'
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)))
const tmpSpecDir = '/tmp/suwapuyo-shorts-studio'
const maxBodyBytes = 512 * 1024
const renderTimeoutMs = 180_000
const checkTimeoutMs = 30_000

type RenderRequest = {
  spec: Record<string, unknown>
}

type CommandResult = {
  stdout: string
  stderr: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseRenderRequest(value: unknown): RenderRequest | null {
  if (!isRecord(value) || !isRecord(value.spec)) {
    return null
  }
  return { spec: value.spec }
}

function safeTitle(value: unknown): string {
  const raw = typeof value === 'string' ? value : 'shorts-video'
  const normalized = raw
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return normalized || 'shorts-video'
}

function sendJson(res: import('node:http').ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function readJsonBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody, rejectBody) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.byteLength
      if (size > maxBodyBytes) {
        rejectBody(new Error('request_body_too_large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown)
      } catch {
        rejectBody(new Error('invalid_json'))
      }
    })
    req.on('error', rejectBody)
  })
}

async function runCommand(file: string, args: string[], timeout: number): Promise<CommandResult> {
  const result = await execFileAsync(file, args, {
    cwd: rootDir,
    timeout,
    maxBuffer: 1024 * 1024 * 12,
  })
  return {
    stdout: result.stdout,
    stderr: result.stderr,
  }
}

function classifyCommandError(error: unknown) {
  if (isRecord(error)) {
    return {
      message: typeof error.message === 'string' ? error.message : 'command_failed',
      stdout: typeof error.stdout === 'string' ? error.stdout : '',
      stderr: typeof error.stderr === 'string' ? error.stderr : '',
    }
  }
  return { message: 'command_failed', stdout: '', stderr: '' }
}

function parseMetadata(stdout: string) {
  const metadata: Record<string, string> = {}
  for (const line of stdout.split('\n')) {
    const [key, value] = line.split('=')
    if (key && value) {
      metadata[key] = value
    }
  }
  return {
    duration: Number(metadata.duration || 0),
    size: Number(metadata.size || 0),
  }
}

function shortsStudioRenderPlugin() {
  return {
    name: 'shorts-studio-render-bridge',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (req.method === 'GET' && url.startsWith('/api/shorts-studio/download/')) {
          const fileName = basename(decodeURIComponent(url.replace('/api/shorts-studio/download/', '')))
          if (!/^[a-z0-9._-]+\.mp4$/.test(fileName)) {
            sendJson(res, 400, { status: 'error', type: 'invalid_file_name' })
            return
          }
          const filePath = join(rootDir, 'shorts', 'out', fileName)
          if (!existsSync(filePath)) {
            sendJson(res, 404, { status: 'error', type: 'file_not_found' })
            return
          }
          res.statusCode = 200
          res.setHeader('content-type', 'video/mp4')
          res.setHeader('content-disposition', `attachment; filename="${fileName}"`)
          createReadStream(filePath).pipe(res)
          return
        }

        if (req.method !== 'POST' || url !== '/api/shorts-studio/render') {
          next()
          return
        }

        try {
          const body = await readJsonBody(req)
          const request = parseRenderRequest(body)
          if (!request) {
            sendJson(res, 400, { status: 'error', type: 'schema_invalid', message: 'spec is required' })
            return
          }

          const title = safeTitle(request.spec.title)
          const spec = { ...request.spec, title }
          await mkdir(tmpSpecDir, { recursive: true })
          const specPath = join(tmpSpecDir, `${title}.json`)
          await writeFile(specPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8')

          let checkResult: CommandResult
          try {
            checkResult = await runCommand('python3', ['shorts/render.py', '--check', specPath], checkTimeoutMs)
          } catch (error) {
            const failure = classifyCommandError(error)
            sendJson(res, 422, {
              status: 'error',
              type: 'check_failed',
              message: failure.message,
              stdout: failure.stdout,
              stderr: failure.stderr,
            })
            return
          }

          try {
            await runCommand('python3', ['shorts/render.py', specPath], renderTimeoutMs)
          } catch (error) {
            const failure = classifyCommandError(error)
            sendJson(res, 500, {
              status: 'error',
              type: 'render_failed',
              message: failure.message,
              stdout: failure.stdout,
              stderr: failure.stderr,
            })
            return
          }

          const outputPath = join(rootDir, 'shorts', 'out', `${title}.mp4`)
          const ffprobe = await runCommand(
            'ffprobe',
            ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'default=noprint_wrappers=1', outputPath],
            checkTimeoutMs,
          )
          const metadata = parseMetadata(ffprobe.stdout)
          sendJson(res, 200, {
            status: 'success',
            title,
            outputPath: `shorts/out/${title}.mp4`,
            downloadUrl: `/api/shorts-studio/download/${title}.mp4`,
            duration: metadata.duration,
            size: metadata.size,
            check: JSON.parse(checkResult.stdout) as unknown,
          })
        } catch (error) {
          const failure = classifyCommandError(error)
          sendJson(res, 500, {
            status: 'error',
            type: failure.message,
            message: failure.message,
          })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), shortsStudioRenderPlugin()],
})
