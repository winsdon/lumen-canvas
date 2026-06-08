import { expect, test } from '@playwright/test'
import { parseAccount } from './account'

test('parseAccount supports separate mobile and password lines', () => {
  expect(parseAccount('15601691300\nsecret123')).toEqual({
    mobile: '15601691300',
    password: 'secret123'
  })
})

test('parseAccount extracts mobile and same-line password without exposing values', () => {
  expect(parseAccount('user/15601691300/secret123\nfallback')).toEqual({
    mobile: '15601691300',
    password: 'secret123'
  })
})

test('parseAccount supports labelled mobile and password lines', () => {
  expect(parseAccount('账号 15601691300\n密码 secret123')).toEqual({
    mobile: '15601691300',
    password: 'secret123'
  })
})
