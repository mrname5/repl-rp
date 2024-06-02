# repl-rp (repl-recording+playback)

Playback your Nodejs repl history like a video file.

Initial author: Steve Wang (stevesg168@gmail.com)

license: GPL 3.0

## Installation:

Requires: Nodejs

1. Install with NPM:

```
npm install repl-rp
```

2. Install with Github:
```
git pull 
```

## Import into code:

```
const P = require('repl-rp')
```
OR
```
const P = await import('repl-rp')
```

## Recording

To view recording tools run:
```
P.recording
```

### Start Recording:
```
P.recording.startRecording
```
Then start typing and the contents will be recorded. Will be saved to a new txt file which will contain the current date + repl-history and the file number.

### Stop Recording:
```
P.recording.stopRecording
```
Recording will be paused but can always be resumed with start recording command.

### View recorded contents:
```
 P.recording.historyStream
```

## Playback
Use the CommandHistoryPlayer class
It takes once argument the file path in string form:

```
let historyPlayer = new P.CommandHistoryPlayer(fileName)
```

To start playback with relative time:
```
historyPlayer.play()
```

To stop/pause playback do this:
```
historyPlayer.stop()
```

To just run all commands saved at once run:
```
historyPlayer.runAllNow()
```

To repeat run this:
```
historyPlayer.repeat()
```