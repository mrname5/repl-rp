// export  default {playback: await import('./playback/command-history-playback.js'),
//          recording: await import('./recording/save-command-history.js')
// }

let playback = await import('./playback/command-history-playback.js')
let recording = await import('./recording/save-command-history.js')

export {playback, recording}



//let p = await import('./es-export.mjs')
