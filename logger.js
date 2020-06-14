const chalk = require('chalk');

const logger =  {
  error(message, lineNumber){
    console.error(chalk`{red Fatal Error}: ${message} at line: ${lineNumber}`);
  },
  finishError(message){
    console.error(chalk`{red Error}: ${message}`);
  },
  syntaxError(message, lineNumber){
    console.error(chalk`{red SyntaxError}: ${message} at line: ${lineNumber}`);
  },
  semanticError(message, lineNumber){
    console.error(chalk`{red SemanticError}: ${message} at line: ${lineNumber}`);
  },
  semiColonError(lineNumber){
    this.syntaxError('SemiColon expected', lineNumber);
  },
  colonError(lineNumber) {
    this.syntaxError('Colon expected', lineNumber);
  },
  successCompile(message, time){
    console.log(chalk`{green Success}: ${message}, job executed in ${time}ms`);
  }
};

module.exports = logger;