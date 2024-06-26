// --------------------------------------------------------------------------
// -- save-command-history.js
// --------------------------------------------------------------------------

let fs = require('fs')
let months = ['Jan','Feb','March','April','May','June','July','Aug','Sep','Oct','Nov','Dec']
let day = new Date()
let backups = 0

fs.readdir(process.cwd(), (err, files) => {
    files.forEach(x=>{
        if (x.includes(day.getDate() + months[day.getMonth()] + '-repl-history-') == true){
            backups+=1
        }
    })
    if (backups == 0){
        backups = ''
    }
});

const readline = require('node:readline');
const { stdin: input} = require('node:process');
const rl = readline.createInterface({input});

let historyStream = {startTime: new Date().getTime(), userInputs: []}

function saveHistoryToFile (){
        historyStream.endTime = new Date().getTime()
        fs.writeFileSync(day.getDate() + months[day.getMonth()] + '-repl-history-'+ backups + '-' + '.txt' , JSON.stringify(historyStream))
}

function saveInputs() {
  let currentIndex = repl.repl.history.indexOf(lastLineSave) - 1
//     console.log('current last save', currentIndex,lastLineSave)
    if (currentIndex < 0){
        return false
    }
//     console.log('new save', repl.repl.history[currentIndex])
    historyStream.userInputs.push({
      time: new Date().getTime() - 100,
      input: repl.repl.history[currentIndex]
    });
    lastLineSave = repl.repl.history[currentIndex];
    try{
        if ((lastLineSave.slice(0, 6) === '.load ' && fs.existsSync(lastLineSave.slice(6)) === true) || currentIndex > 0){
//             console.log('loading file detected', currentIndex, repl.repl.history[0])
            for (let i = currentIndex; i > 0; i--) {
                currentIndex -= 1
                historyStream.userInputs.push({
                  time: new Date().getTime() - 100,
                  input: repl.repl.history[currentIndex]
                });
            }
            lastLineSave = repl.repl.history[currentIndex];
        }
    }
    catch{}
}

// Event listener for when the user closes the program
process.on('exit', () => {
    if (historyStream.userInputs.length > 0){
        saveHistoryToFile()
    }
});

//https://stackoverflow.com/a/49961675/19515980

function handleInputs (input){
    setTimeout(() => {
        saveInputs() 
    }, 100)
}

function startRecording () {
     lastLineSave = repl.repl.history[0]
    rl.on('line', handleInputs);
    console.log('history recording started')

}

function stopRecording (){
    rl.removeListener('line', handleInputs);
    console.log('history recording stopped')
}

console.log('use the .save command to save without time: https://stackoverflow.com/a/49961675/19515980')

let lastLineSave = repl.repl.history[0]

module.exports = {
    startRecording,
    stopRecording,
    historyStream
}

