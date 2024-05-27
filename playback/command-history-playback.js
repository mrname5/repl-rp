// --------------------------------------------------------------------------
// -- command-history-playback.js
// --------------------------------------------------------------------------
//Code helped by AI

//IMPORTANT: FORGOT TO IGNORE SENTANCES WHICH START WITH * WHICH ARE COMMENTS. IN OTHER WORDS FORGOT COMMENTS WHICH START WITH *

// Works as long as all dependencies are there.
// Tried using eval to use require and await import. DID not work require and await import only works in top level modules not meant to be called programmatically
// Tried using .load 
// I got the eval method I use from: https://stackoverflow.com/a/23699187/19515980
//Using new Function might be an optino for loading dependencies https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function
//Example of using new Function here:
//b = new Function ('return require("konduktiva")')
//K = b()
//Using new Function inspiration from https://dev.to/amitkhonde/eval-is-evil-why-we-should-not-use-eval-in-javascript-1lbh and https://www.digitalocean.com/community/tutorials/js-eval
let fs = require('fs')
let path = require('path');

/*
let replServer = repl.start({
      ignoreUndefined: true,
      input: process.stdin,
      output: process.stdout
})
*/

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
    let absoluteFilePath = getAbsoluteFilePath(filePath)
    return JSON.parse(fs.readFileSync(absoluteFilePath, 'utf-8'))
}

class CommandHistoryPlayer {
    constructor (filePath){
        this.originalFilePath = filePath
        this.playbackFile = loadPlaybackFile(filePath)
        this.actionIndex = 0
        this.lastTime = this.playbackFile.startTime
        this.combineWithCurrentCommand = ''
        this.waitFor = undefined
        this.verbosity = false
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
            }, this.playbackFile.userInputs[this.actionIndex].time - this.lastTime)
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
            logIfVerbose('running action', currentCommandInfo)
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
//     reformatFunctions (command){
//         let functionStart = command.indexOf(command.slice(0, 9))
//         let functionNameEnd = command.indexOf('(')
//         return 'global.' + command.slice(functionStart + 9, functionNameEnd) + '= function ' + command.slice(functionNameEnd)
//     }
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
        let className = command.slice(5, endOfName)
        return className + '=' + command + '\n'
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
//         let importInString = variableName + "= await import('" + libraryName +" ')"
//         fs.writeFileSync('importing-library.js', command)
//         (1, eval)(".load ./importing-library.js")
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
        else if (this.combineWithCurrentCommand.slice(0, 6) === 'class '){
            this.combineWithCurrentCommand = this.reformatDefiningClasses(command)
            return false
         let variableName = command.slice(0, command.indexOf('=')).replace(/\s/g, '')
    //remove space helped by chatgpt
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
//           this.logIfVerbose('evaluating:', command, this.combineWithCurrentCommand);
//           eval(JSON.stringify(this.combineWithCurrentCommand));
//           I got this method of using eval from: https://stackoverflow.com/a/23699187/19515980
              (true, eval)(this.combineWithCurrentCommand)
//           this.logIfVerbose('evaluated:', this.combineWithCurrentCommand)
        this.combineWithCurrentCommand = '';
                this.logIfVerbose('command worked')
        } catch (error) {
          if (error instanceof SyntaxError) {
            // Incomplete command
           this.logIfVerbose('command incomplete', this.combineWithCurrentCommand)
          } else {
            console.log(error);
          }
        }
    }
}

module.exports = {
    CommandHistoryPlayer
}

// let historyPlayer = new p.playback.CommandHistoryPlayer('./27May-repl-history-1-.txt')
//console.log('running action', currentCommandInfo)

// historyPlayer1 = new CommandHistoryPlayer('./15Aug-repl-history-9-.txt')
// historyPlayer1 = new CommandHistoryPlayer('./15Jan-repl-history--.txt')
// historyPlayer1 = new CommandHistoryPlayer('./libraries-to-import.txt')
// historyPlayer1 = new CommandHistoryPlayer('./15Jan-repl-history-1-.txt')
// historyPlayer1.play()
// 
// historyPlayer1.stop()
// 
// historyPlayer1.repeat()
// 
//historyPlayer1.stop()

// historyPlayer.runAllNow()

// let testFunc = 'function testingIfFunctionsWork(arg) { console.log("hi", arg); console.log("Function testing success"); return arg; }';
// 
// const repl = require('repl');
// const replServer = repl.start({ prompt: '> ' });
// 
// const fs = require('fs');
// const path = require('path');
// const { Writable } = require('stream');
// 
// const outputFile = path.join(process.cwd(), 'output.txt');
// const outputStream = fs.createWriteStream(outputFile);
// 
// const originalEval = replServer.eval;
// 
// replServer.eval = function (cmd, context, filename, callback) {
//   const writableCallback = new Writable({
//     write(chunk, encoding, callback) {
//       // Write the output to the file or perform other handling
//       outputStream.write(chunk);
//       callback();
//     },
//   });
//   originalEval.call(replServer, cmd, context, filename, writableCallback);
// };
// 
// // Now the evaluated code output will be redirected to the file
// replServer.eval(`console.log('hi')`);
// 
// 
// function asyncImportEvalTest (libraryName, variableName){
//     (1, eval)('(' + variableName + ' = require(' + JSON.stringify(libraryName) + '))')
// }
// 
// function importingLibraries(command) {
//          let libraryName = command.slice(command.indexOf('(') + 1, command.indexOf(')'))
//          let variableName = command.slice(0, command.indexOf('=')).replace(/\s/g, '')
//     //remove space helped by chatgpt
//          let libraryData = requiringLib(libraryName)
//          global[variableName] = libraryData
// }
// 
// function requiringLib (libraryName){
//         let loadingFunc = new Function ('return require(' + libraryName + ')')
//     return loadingFunc()
// }
// 
// //HERe
// importingLibraries("R = require('ramda')")
// 
// 
// function requiringLib2 (libraryName){
//         let loadingFunc = new Function ('return require("' + libraryName + '")')
//     return loadingFunc()
// }
// 
// 
// hi = requiringLib2('array-toolkit')

// hi = loadPlaybackFile('./27May-repl-history--.txt')
// p = require('repl-recording+playback')
