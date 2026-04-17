const CONV_KEY  = 'claude_conversations'
const THEME_KEY = 'claude_theme'
const MODEL_KEY = 'claude_model'

export function loadConversations() {
  try { return JSON.parse(localStorage.getItem(CONV_KEY) || '[]') }
  catch { return [] }
}

export function saveConversations(convs) {
  try { localStorage.setItem(CONV_KEY, JSON.stringify(convs)) }
  catch { /* storage quota exceeded */ }
}

export function loadTheme()        { return localStorage.getItem(THEME_KEY) || 'light' }
export function saveTheme(theme)   { localStorage.setItem(THEME_KEY, theme) }

export function loadModel()        { return localStorage.getItem(MODEL_KEY) || 'claude-sonnet-4-6' }
export function saveModel(model)   { localStorage.setItem(MODEL_KEY, model) }
