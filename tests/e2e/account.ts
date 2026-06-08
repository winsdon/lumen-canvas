import fs from 'node:fs'

const separator = /[\/|,，、:：=\s]+/

export function parseAccount(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error('account.txt must contain mobile and password on separate non-empty lines')
  }

  const mobile = lines[0].match(/1[3-9]\d{9}/)?.[0] || ''
  if (!mobile) {
    throw new Error('account.txt must contain a valid mobile number for password login')
  }

  const firstLineParts = lines[0].split(separator).filter(Boolean)
  const mobilePartIndex = firstLineParts.findIndex(part => part.includes(mobile))
  const sameLinePassword = mobilePartIndex >= 0 ? firstLineParts[mobilePartIndex + 1] || '' : ''

  return {
    mobile,
    password: sameLinePassword || lines[1].split(separator).filter(Boolean).at(-1) || lines[1]
  }
}

export function readAccount(accountPath: string) {
  return parseAccount(fs.readFileSync(accountPath, 'utf8'))
}
