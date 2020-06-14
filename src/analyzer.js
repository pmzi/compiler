const logger = require('./logger');
const chalk = require('chalk');
const ASTInspect = require('./ASTInspecter');

function hasAtEnd(char, line){
  const reg = new RegExp(char + '$');
  return reg.test(line)
}

function getVarValueInfo(value, lineNumber){
  const STRING_REGEXP = /^(["'])(.*)(["'])$/;
  const NUMBER_REGEXP = /^(\d+(\.?)\d*)$/;

  let functionCall;
  if(STRING_REGEXP.test(value)){
    const regResult = STRING_REGEXP.exec(value);
    if(regResult[1] !== regResult[3]) {
      logger.syntaxError('Non pair matching quotation', lineNumber);
      return false;
    }
    const varValue = regResult[2];
    return {
      type: 'string',
      value: varValue,
    };
  } else if(NUMBER_REGEXP.test(value)) {
    const regResult = NUMBER_REGEXP.exec(value);
    const varValue = regResult[1];
    if(regResult[2] === '.') {
      return {
        type: 'double',
        value: Number(varValue),
      };
    }
    return {
      type: 'int',
      value: Number(varValue),
    }
  }else if((functionCall = analyzeFunctionCall(value, lineNumber, true)) !== null){
    const ASTResult = ASTInspect(getStackTree(), 'FUNCTION_DECLARATION', functionCall.name);

    if(functionCall === false){
      return false;
    }
    if(!ASTResult) {
      logger.error(`${functionCall.name} is not defined.`, lineNumber);
      return false;
    }

    return {
      type: ASTResult.returnType,
      value: functionCall,
    }
  }else if(/^[^\d].*$/.test(value)){
    const ASTResult = ASTInspect(getStackTree(), 'VAR_DECLARATION', value);
    if(ASTResult) {
      return {
        type: ASTResult.varType,
        value: ASTResult.value,
      }
    }
    logger.error(`Var ${value} is not defined.`, lineNumber);
  };

  return false;
}

function analyzeVar(line, lineNumber, noSemi = false){
  const VAR_DECLARATION = /^\s*(int|double|string)\s+([^\d]\S*?)\s*?(?:=\s*(.+?))?;?$/i;

  if(VAR_DECLARATION.test(line)) {
    const result = VAR_DECLARATION.exec(line);

    const type = result[1].trim();
    const varName = result[2].trim();
    const varValue = result[3] ? result[3].trim() : '';

    // if(ASTInspect(stack[stack.length - 1] || AST, 'VAR_DECLARATION', varName)) {
    //   logger.error(`Var ${varName} already exists in lexical scope.`, lineNumber);
    //   return false;
    // }


    if(!hasAtEnd(';', line) && !noSemi) {
      logger.semiColonError(lineNumber);
      return false;
    }

    const varValueInfo = varValue ? getVarValueInfo(varValue, lineNumber, AST) : {
      type,
      value: 'undefined',
    };

    if(!varValueInfo) {
      return false;
    }

    const { type: varValueType, value } = varValueInfo;

    if(type !== varValueType) {
      logger.semanticError(chalk`Assigning {red ${varValueType}} to {red ${type}}`, lineNumber);
      return false;
    }

    return {
      type: "VAR_DECLARATION",
      name: varName,
      varType: type,
      value,
    }
  }

  return null;
}

function analyzeFor(line, lineNumber){
  const FOR_DECLARATION = /^for\s+([^\d]\S*)\s+from\s+(\d+)\s+to\s+(\d+).?$/i;

  if(FOR_DECLARATION.test(line)) {
    const regResult = FOR_DECLARATION.exec(line);
    if(!hasAtEnd(':', line)) {
      logger.colonError(lineNumber);
      return false;
    }

    return {
      type: 'FOR_DECLARATION',
      variableName: regResult[1],
      initial: regResult[2],
      final: regResult[3],
      children: [
        {
          varType: 'int',
          type: 'VAR_DECLARATION',
          name: regResult[1].trim(),
          value: regResult[2],
        }
      ],
    };
  }

  return null;
}

function analyzeEndFor(line, lineNumber){
  const END_FOR_DECLARATION = /^end for.?$/i;

  if(END_FOR_DECLARATION.test(line)) {
    if(!hasAtEnd(';' ,line)){
      logger.semiColonError(lineNumber);
      return false;
    }
    return true;
  }
  return null;
}

function analyzeIf(line, lineNumber){
  const IF_DECLARATION = /^if\s+(.+?).?$/i;
  const ELSE_IF_DECLARATION = /^else if\s+(.+?).?$/i;
  const ELSE_DECLARATION = /^else\s*.?$/i;

  if(IF_DECLARATION.test(line)) {
    const regResult = IF_DECLARATION.exec(line);
    if(!hasAtEnd(':', line)) {
      logger.colonError(lineNumber);
      return false;
    }
    const conditionResult = analyzeCondition(regResult[1], lineNumber);

    if(!conditionResult) return false;
    return {
      type: 'IF_DECLARATION',
      condition: conditionResult,
      children: [],
    };
  }else if(ELSE_IF_DECLARATION.test(line)){
    const regResult = ELSE_IF_DECLARATION.exec(line);
    if(!hasAtEnd(':', line)) {
      logger.colonError(lineNumber);
      return false;
    }

    const conditionResult = analyzeCondition(regResult[1], lineNumber);

    if(!conditionResult) return false;

    return {
      type: 'ELSE_IF_DECLARATION',
      condition: conditionResult,
      children: [],
    };
  }else if(ELSE_DECLARATION.test(line)){
    if(!hasAtEnd(':', line)) {
      logger.colonError(lineNumber);
      return false;
    }

    return {
      type: 'ELSE_DECLARATION',
      children: [],
    };
  }

  return null;
}

function analyzeEndIf(line, lineNumber){
  const END_IF_DECLARATION = /^end if.?$/i;

  if(END_IF_DECLARATION.test(line)) {
    if(!hasAtEnd(';' ,line)){
      logger.semiColonError(lineNumber);
      return false;
    }
    return true;
  }
  return null;
}

function analyzeFunction(line, lineNumber){
  const FUNCTION_DECLARATION = /^(int|double|string)\s+function\s+([^\d]\S*?)\s*\((.*)\).?$/i;

  if(FUNCTION_DECLARATION.test(line)) {
    const regResult = FUNCTION_DECLARATION.exec(line);
    let arguments = regResult[3].split(',');
    if(!hasAtEnd(':', line)) {
      logger.colonError(lineNumber);
      return false;
    }

    const name = regResult[2];

    // if(ASTInspect(stack[stack.length - 1] || AST, 'FUNCTION_DECLARATION', name)) {
    //   logger.error(`Function ${name} already exists in lexical scope.`, lineNumber);
    //   return false;
    // }

    if(arguments.filter(item =>item).length) {
      arguments = arguments.map(item => analyzeVar(item.trim(), lineNumber, true));

      if(arguments.some(item => !item)){
        logger.syntaxError('Unknown argument call system', lineNumber);
        return false;
      }
    }

    return {
      type: 'FUNCTION_DECLARATION',
      name,
      args: arguments,
      returnType: regResult[1],
      children: arguments.map(item => ({
        varType: item.varType,
        type: 'VAR_DECLARATION',
        value: item.value,
        name: item.name
      })),
    };
  }

  return null;
}

function analyzeEndFunction(line, lineNumber){
  const END_IF_DECLARATION = /^end function.?$/i;

  if(END_IF_DECLARATION.test(line)) {
    if(!hasAtEnd(';' ,line)){
      logger.semiColonError(lineNumber);
      return false;
    }
    return true;
  }
  return null;
}

function analyzeFunctionCall(line, lineNumber, noSemi = false){
  const FUNCTION_CALL = /^\s*([^\d]\S*)\s*\((.*)\)\s*.?$/;

  if(FUNCTION_CALL.test(line)) {
    if(!hasAtEnd(';', line) &&!noSemi) {
      logger.semiColonError(lineNumber);
      return false;
    }
    const regResult = FUNCTION_CALL.exec(line);
    let arguments = regResult[2].split(',').filter(item => item);
    const name = regResult[1].trim();
    const functionDeclaration = ASTInspect(getStackTree(), 'FUNCTION_DECLARATION', name);

    if(!functionDeclaration) {
      logger.error('Function not defined.', lineNumber);
      return false;
    }
    if(arguments) {
      arguments = arguments.map(item => getVarValueInfo(item.trim()));
      if(arguments.some(item => !item)) {
        logger.syntaxError('Argument not recognized', lineNumber);
        return false;
      }
    }

    for(let i = 0;i<functionDeclaration.args.length;i++){
      if(!arguments[i]) {
        if(functionDeclaration.args[i].value !== 'undefined') {
          continue;
        }
        logger.error(`Function call has required argument.`, lineNumber);
        return false;
      }

      if(arguments[i].type !== functionDeclaration.args[i].varType) {
        logger.semanticError(`Assigning ${arguments[i].type} to ${functionDeclaration.args[i].varType}`, lineNumber);
        return false;
      }
    }

    return {
      type: 'FUNCTION_CALL',
      name,
      arguments,
    }
  }

  return null;
}

function analyzeCondition(value, lineNumber){
  const CONDITION = /^\s*(\S+?)\s*((?:==)|>|<|(?:<=)|(?:>=)|(?:!=))\s*(\S+?)\s*$/;

  if(CONDITION.test(value)) {
    const regResult = CONDITION.exec(value);

    const left = getVarValueInfo(regResult[1].trim(), lineNumber)
    const right = getVarValueInfo(regResult[3].trim(), lineNumber);

    if(!left || !right) return false;

    if(left.type !== right.type) {
      logger.semanticError(`Comparing ${right.type} to ${left.type}`, lineNumber);
      return false;
    }
    return {
      type: 'CONDITION',
      left,
      right,
    }
  }

  logger.syntaxError('Condition is not valid', lineNumber);
  return false;
}

function analyzeReturn(value, lineNumber){
  const RETURN = /^\s*return\s+(\S+?)\s*;?$/;

  if(RETURN.test(value)) {
    if(!hasAtEnd(';', value)) {
      logger.semiColonError(lineNumber);
      return false;
    }

    const regResult = RETURN.exec(value);

    const returnVar = getVarValueInfo(regResult[1], lineNumber);
    if(!returnVar) return false;
    const functionReturnType = stack.reverse().find(item => item.type === 'FUNCTION_DECLARATION').returnType
    if(returnVar.type !== functionReturnType) {
      logger.semanticError(`Returning ${returnVar.type} inside function with return type ${functionReturnType}`);
      return false;
    }

    return true;
  }

  return null;
}

function getStackTree(){
  return [
    ...AST.map(item => ({...item, children: !item.children})),
    ...stack,
  ]
}

const stack = [];
const AST = [];

module.exports = function analyze(lines){
  for(let i = 0;i<lines.length;i++){
    const functionAnalyzeResult = analyzeFunction(lines[i], i + 1);
    if(functionAnalyzeResult) {
      if(stack.length) {
        stack[stack.length - 1].children.push(functionAnalyzeResult);
      }else {
        AST.push(functionAnalyzeResult);
      }
      stack.push(functionAnalyzeResult);
      continue;
    } else if(functionAnalyzeResult === false){
      return;
    }

    const endFunctionAnalyzeResult = analyzeEndFunction(lines[i], i + 1);
    if(endFunctionAnalyzeResult) {
      if(stack.length && stack[stack.length - 1].type === 'FUNCTION_DECLARATION'){
        stack.pop();
        continue;
      }
      logger.syntaxError('End function matches no function', i + 1);
      return;
    } else if(endFunctionAnalyzeResult === false){
      return;
    }
  
    const varAnalyzeResult = analyzeVar(lines[i], i + 1);
    if(varAnalyzeResult) {
      if(stack.length) {
        stack[stack.length - 1].children.push(varAnalyzeResult);
      }else {
        AST.push(varAnalyzeResult);
      }
      continue;
    } else if(varAnalyzeResult === false){
      return;
    }

    const forAnalyzeResult = analyzeFor(lines[i], i + 1);
    if(forAnalyzeResult) {
      if(stack.length) {
        stack[stack.length - 1].children.push(forAnalyzeResult);
      }else {
        AST.push(forAnalyzeResult);
      }
      stack.push(forAnalyzeResult);
      continue;
    } else if(forAnalyzeResult === false){
      return;
    }

    const endForAnalyzeResult = analyzeEndFor(lines[i], i + 1);
    if(endForAnalyzeResult) {
      if(stack.length && stack[stack.length - 1].type === 'FOR_DECLARATION'){
        stack.pop();
        continue;
      }
      logger.syntaxError('End for matches no for', i + 1);
      return;
    } else if(endForAnalyzeResult === false){
      return;
    }

    const ifAnalyzeResult = analyzeIf(lines[i], i + 1);
    if(ifAnalyzeResult) {
      if(ifAnalyzeResult.type === 'ELSE_IF_DECLARATION') {
        if(stack.length && /IF/.test(stack[stack.length - 1].type)) {
          stack.pop();
        }else{
          logger.syntaxError('Else if without if', i+1);
          return;
        }
      }else if(ifAnalyzeResult.type === 'ELSE_DECLARATION'){
        if(stack.length && /IF/.test(stack[stack.length - 1].type)) {
          stack.pop();
        }else{
          logger.syntaxError('Else without if', i+1);
          return;
        }
      }
      if(stack.length) {
        stack[stack.length - 1].children.push(ifAnalyzeResult);
      }else {
        AST.push(ifAnalyzeResult);
      }
      stack.push(ifAnalyzeResult);
      continue;
    } else if(ifAnalyzeResult === false){
      return;
    }

    const endIfAnalyzeResult = analyzeEndIf(lines[i], i + 1);
    if(endIfAnalyzeResult) {
      if(stack.length && /(IF)|(ELSE)/.test(stack[stack.length - 1].type)){
        stack.pop();
        continue;
      }
      logger.syntaxError('End if matches no if', i + 1);
      return;
    } else if(endIfAnalyzeResult === false){
      return;
    }

    const functionCallAnalyzeResult = analyzeFunctionCall(lines[i], i + 1);
    if(functionCallAnalyzeResult) {
      AST.push(functionCallAnalyzeResult);
      continue;
    } else if(functionCallAnalyzeResult === false){
      return;
    }

    const returnAnalyzeResult = analyzeReturn(lines[i], i + 1);
    if(returnAnalyzeResult) {
      if(stack.find(item => item.type === 'FUNCTION_DECLARATION')) {
        continue;
      }
      logger.error('Return is out of the function', i + 1);
      return;
    } else if(returnAnalyzeResult === false){
      return;
    }

    if(lines[i].trim() !== '') {
      logger.error('Syntax not recognized', i + 1);
      return;
    }
  }

  return AST;
}