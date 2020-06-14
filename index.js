const startTime = Date.now();

const fs = require('fs');
const logger = require('./src/logger');

const analyzer = require('./src/analyzer');

const content = fs.readFileSync('./a.txt', 'utf-8');

const contentPerLine = content.split('\n');

const tokenized = analyzer(contentPerLine);

if(!tokenized) {
  logger.finishError(`Program exited with code 0 at lexical time. job executed in ${Date.now() - startTime}ms`);
}else {
  fs.writeFileSync('AST.json', JSON.stringify(tokenized, null, 2));
  logger.successCompile('AST is available at AST.json', Date.now() - startTime);
}