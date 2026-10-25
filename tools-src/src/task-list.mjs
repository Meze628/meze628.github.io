// The offset comes from a parsed task checkbox, never a document-wide regex.
export function setTaskChecked(source,position,checked){
  if(!Number.isInteger(position)||position<0||!/^\[[ xX]\]/.test(source.slice(position)))return null;
  return source.slice(0,position+1)+(checked?'x':' ')+source.slice(position+2);
}
