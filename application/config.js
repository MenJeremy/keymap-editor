function parseBoolean (val) {
  return val && ['1', 'on', 'yes', 'true'].includes(val.toString().toLowerCase())
}

export const apiBaseUrl = 'http://localhost:8080' //process.env.API_BASE_URL
export const appBaseUrl = 'http://localhost' //process.env.APP_BASE_URL
export const githubAppName = 'Adv360Pro'//process.env.GITHUB_APP_NAME
export const enableGitHub = true// parseBoolean(process.env.ENABLE_GITHUB)
export const enableLocal = true //parseBoolean(process.env.ENABLE_LOCAL)
