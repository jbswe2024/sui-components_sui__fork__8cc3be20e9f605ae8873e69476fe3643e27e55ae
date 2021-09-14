#!/usr/bin/env node

const defaultConfig = require('./swc-config.js')
const {transformFile} = require('@swc/core')
const fg = require('fast-glob')
const fs = require('fs-extra')

;(async () => {
  const files = await fg('./src/**/*.{js,jsx}')

  console.time('[sui-js-compiler]')

  await Promise.all(
    files.map(async file => {
      const output = await transformFile(file, defaultConfig)
      const {code} = output
      const outputPath = file.replace('./src', './lib')
      return fs.outputFile(outputPath, code)
    })
  )

  console.timeEnd('[sui-js-compiler]')
})()
