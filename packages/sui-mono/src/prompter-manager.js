/* eslint-disable no-console */

const colors = require('@s-ui/helpers/colors')
const util = require('util')
const {exec: execNative} = require('child_process')
const {prompt} = require('enquirer')
const buildCommit = require('./build-commit')
const config = require('./config')
const {types: commitTypes} = require('./commit-types')

const exec = util.promisify(execNative)

const scopes = config.getWorkspaces().map(name => ({name}))

const allowedBreakingChanges = ['feat', 'fix']
const typesWithOtherScopes = ['feat', 'fix', 'release', 'test', 'docs', 'chore']
const defaultScopes = [{name: 'Root'}]
const otherScopes = defaultScopes

const getCommitTypesMapped = () =>
  Object.keys(commitTypes).map(value => ({
    name: value,
    message: commitTypes[value].description
  }))

const getCommitSteps = ({scopesWithChanges}) => [
  {
    type: 'select',
    name: 'type',
    message: "Type of change that you're committing",
    choices: getCommitTypesMapped()
  },
  {
    type: 'select',
    name: 'scope',
    message: '\nDenote the SCOPE of this change:',
    choices() {
      const {type} = this.state.answers

      console.log({scopesWithChanges, type})

      return typesWithOtherScopes.includes(type)
        ? scopesWithChanges.concat(otherScopes)
        : scopesWithChanges
    }
  },
  {
    type: 'input',
    name: 'subject',
    message: 'Write a SHORT, IMPERATIVE tense description of the change:\n',
    validate: value => !!value,
    filter: value => value.charAt(0).toLowerCase() + value.slice(1)
  },
  {
    type: 'input',
    name: 'body',
    message:
      'Provide a LONGER description of the change (optional). Use "|" to break new line:\n'
  },
  {
    type: 'input',
    name: 'breaking',
    message: 'List any BREAKING CHANGES (optional):\n',
    skip() {
      const {type} = this.state.answers
      return !allowedBreakingChanges.includes(type)
    }
  },
  {
    type: 'input',
    name: 'footer',
    message:
      'List any ISSUES CLOSED by this change (optional). E.g.: #31, #34:\n'
  },
  {
    type: 'confirm',
    name: 'confirmCommit',
    message() {
      const {answers} = this.state
      console.log(`\n${buildCommit(answers)}\n`)
      return 'Are you sure you want to proceed with the commit above?'
    }
  }
]

/**
 * Check if modified files are present
 * @param  {[type]}  path Folder to check
 * @return {Promise<Boolean>}
 */
const checkIfHasChangedFiles = async path => {
  const output = await exec(`git status ${path}`, {cwd: process.cwd()})
  return !output.stdout.includes('nothing to commit')
}

module.exports = async function startMainCommitFlow() {
  const scopesWithChanges = await Promise.all(
    scopes.map(pkg =>
      checkIfHasChangedFiles(pkg.name).then(hasFiles => hasFiles && pkg)
    )
  ).then(result => result.filter(Boolean))

  prompt(getCommitSteps({scopesWithChanges}))
    .then(async answers => {
      if (answers.confirmCommit === true) {
        const commitMsg = buildCommit(answers)
        const commitParams = commitMsg
          .split('\n') // separate each new line to
          .filter(Boolean) // filter empty strings
          .map(msg => `-m "${msg}"`)
          .join(' ')

        await exec(`git commit ${commitParams}`, {cwd: process.cwd()})
      } else {
        console.log(colors.red('Commit has been canceled.'))
      }
    })
    .catch(err => {
      console.error(err)
    })
}
