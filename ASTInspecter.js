module.exports = function ASTInspector(AST, type, name){
  for(let i = 0;i<AST.length;i++){
    const current = AST[i];
    if(current.type === type && current.name === name) {
      return current;
    }

    if(current.children && current.children.length) {
      const returnValue = ASTInspector(current.children, type, name);
      if(returnValue) return returnValue;
    }
  }
  return false;
}