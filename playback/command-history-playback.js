// --------------------------------------------------------------------------
// -- command-history-playback.js
// --------------------------------------------------------------------------
//Code helped by AI

// I got the eval method I use from: https://stackoverflow.com/a/23699187/19515980
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function
//Using new Function inspiration from https://dev.to/amitkhonde/eval-is-evil-why-we-should-not-use-eval-in-javascript-1lbh and https://www.digitalocean.com/community/tutorials/js-eval
let fs = require('fs')
let path = require('path');

function getAbsoluteFilePath (filePath){
    if (path.isAbsolute(filePath)){
        return filePath
    }
    else if (filePath[0] == '/'){
        return process.cwd() + filePath
    }
    else {
        return process.cwd() + '/' + filePath
    }
}

function loadPlaybackFile (filePath){
//     let absoluteFilePath = getAbsoluteFilePath(filePath)
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

class CommandHistoryPlayer {
    constructor (filePath){
        this.originalFilePath = filePath
        this.playbackFile = loadPlaybackFile(filePath)
        this.actionIndex = 0
        this.convertTimeToRelative()
        this.lastTime = this.playbackFile.startTime
        this.combineWithCurrentCommand = ''
        this.waitFor = undefined
        this.verbosity = false
        this.speed = 1
    }
    convertTimeToRelative() {
        this.originalFile = JSON.parse(JSON.stringify(this.playbackFile))
        this.playbackFile.startTime = 0
        this.playbackFile.userInputs = this.playbackFile.userInputs.map((x, i) => {
            if (i === 0){
                x.time -= this.originalFile.startTime
            }
            else {
                x.time -= this.originalFile.userInputs[i - 1].time
            }
            return x
        })
        this.playbackFile.endTime -= this.originalFile.userInputs[this.originalFile.userInputs.length - 1].time
    }
    logIfVerbose (){
        if (this.verbosity === false){
            return false
        }
        else if (arguments.length > 1){
            let combinedString = ''
            Object.values(arguments).forEach(x => {combinedString += x + ' '})
            console.log(combinedString)
            return true
        }
        else {
            console.log(arguments[0])
            return true
        }
    }
    play (){
        if (this.checkForWaitFor() === false){
            return false
        }
        this.state = 'playing'
        this.scheduleNextAction()
        this.waitFor = undefined
        this.waitingFor = undefined
        this.logIfVerbose('Playing')
    }
    stop (){
        this.state = 'stopped'
        this.logIfVerbose('Stopped')
    }
    repeat (){
        this.actionIndex = 0
        this.lastTime = this.playbackFile.startTime
        this.combineWithCurrentCommand = ''
        this.play() 
        this.logIfVerbose('Repeating')
    }
    checkForWaitFor (){
        if (this.waitFor === undefined){
            return true
        }
        else if (typeof (1, eval)(this.waitFor) === 'object'){
            return true
        }
        else {
            console.log('Please import this library by running this command before continueing playback')
            console.log('\x1b[0m', this.waitingFor)
            console.log('You will be unable to continue playback before running this line of code. To overide this behaviour run [nameOfPlaybackClass].waitFor = undefined')
            return false
        }
    }
    scheduleNextAction (){
        if (this.state === 'playing' && this.actionIndex < this.playbackFile.userInputs.length){
            this.logIfVerbose('time till next action', this.playbackFile.userInputs[this.actionIndex].time - this.lastTime)
            setTimeout(() => {
                this.runNextAction()
            }, (this.playbackFile.userInputs[this.actionIndex].time - this.lastTime) / this.speed)
        }
        else {
            this.logIfVerbose('All actions from', this.originalFilePath, 'have been run. Use the repeat method to repeat')
        }
    }
    runAllNow (){
        this.playbackFile.userInputs.forEach(x => {
            this.evaluateCommand(x.input)
        })
    }
    runNextAction () {
        if (this.state === 'playing'){
            let currentCommandInfo = this.playbackFile.userInputs[this.actionIndex]
            this.logIfVerbose('running action', currentCommandInfo)
            if (currentCommandInfo.input.includes('historyStream')){
                this.evaluateCommand(this.playbackFile)
            }
            else {
                this.evaluateCommand(currentCommandInfo.input)
            }
            this.lastTime = currentCommandInfo.time
            this.actionIndex += 1
            this.scheduleNextAction()
        }
    }
    reformDefiningVariables(command) {
      const definingKeywords = ['const', 'let', 'var'];
      const keyword = definingKeywords.find((keyword) => command.startsWith(keyword));
      if (keyword) {
        return command.slice(keyword.length).trim();
      }
      return command;
    }
    reformatDefiningClasses (command){
        let endOfName = command.indexOf('{') - 1
        let className = command.slice(5, endOfName).trim()
        console.log('CLassName: ', className)
        global[className] = new Function('return( ' + command + ')')()
        //Idea of reformatting classes from: https://stackoverflow.com/a/39299283
    }
    changeCommandToAsyncEval (command){
        return '(async () => {' + command + '})()'
        //Using async with eval from: https://stackoverflow.com/a/56187201/19515980
    }
    promptUserToManuallyImportLibrary (command, variableName){
        this.stop()
        console.log('The history save imports this library at this time. The state of this code is currently unable to automatically import it. You will have to manually run this line of code in this nodejs session')
        console.log('\x1b[1m', command)
        console.log('You will be unable to continue playback before running this line of code. To overide this behaviour run [nameOfPlaybackClass].waitFor = undefined')
        this.waitFor = variableName
        this.waitingFor = command
    }
    tryImportingDependencies (command){
         let libraryName = command.slice(command.indexOf('(') + 1, command.indexOf(')'))
         let variableName = command.slice(0, command.indexOf('=')).replace(/\s/g, '')
    //remove space helped by chatgpt
        this.logIfVerbose('importing modules')
        let loadingFunc = new Function ('return require(' + libraryName + ')')
         global[variableName] = loadingFunc()
    }
    preEvaluateChecks (command){
        if (command.slice(0, 6).includes('.load') || command.slice(0, 2) === '//'){
            return false
        }
         else if (command.slice(0,9).includes('function ')){
             this.logIfVerbose('reformating function')
             this.combineWithCurrentCommand = command + '\n'
             return false
         }
        else if (this.combineWithCurrentCommand === ''){
            this.logIfVerbose('reformating defining statement')
            this.combineWithCurrentCommand = this.reformDefiningVariables(command)
        }
        else{
            this.combineWithCurrentCommand += command + '\n';
        }
        this.logIfVerbose('combineWithCurrentCommand', this.combineWithCurrentCommand, typeof this.combineWithCurrentCommand)
        this.logIfVerbose('testing if importing modules: ', this.combineWithCurrentCommand.includes('await import'), this.combineWithCurrentCommand)
        if (this.combineWithCurrentCommand.includes('await import') === true){
            this.tryImportingDependencies(this.combineWithCurrentCommand)
            this.combineWithCurrentCommand = ''
            return false
        }
      else if (this.combineWithCurrentCommand.includes('await')){
          this.combineWithCurrentCommand = this.changeCommandToAsyncEval(this.combineWithCurrentCommand)
      }
    }
    evaluateCommand (command){
        let checkStatus = this.preEvaluateChecks(command)
        this.logIfVerbose('check status', checkStatus)
        if (checkStatus === false){
            return false
        }
        this.logIfVerbose('gonna try:', this.combineWithCurrentCommand)
        try {
//           I got this method of using eval from: https://stackoverflow.com/a/23699187/19515980
              (true, eval)(this.combineWithCurrentCommand)
            if (this.combineWithCurrentCommand.split('\n')[0].trim().slice(0, 6).includes( 'class')){
                this.logIfVerbose('Class detected')
                this.reformatDefiningClasses(this.combineWithCurrentCommand)
            }
            this.combineWithCurrentCommand = '';
                this.logIfVerbose('command worked')
        } catch (error) {
          if (error instanceof SyntaxError) {
            // Incomplete command
           this.logIfVerbose('command incomplete', this.combineWithCurrentCommand)
          } else {
            this.combineWithCurrentCommand = ''
            console.log(error);
            }
        }
    }
}

module.exports = {
    CommandHistoryPlayer
}
