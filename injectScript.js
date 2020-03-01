document.addEventListener('ChromeExtensionInjectFunctions', function(e) {
  let { type, data } = e.detail;
  if (type === 'init') {
    for (let i = 0; i < data.length; i++) {
      let { funcName, funcArgs, funcBody } = data[i];
      window[funcName] = genFunc(funcArgs, funcBody, i);
      console.log(`inject ${funcName}`);
    }
  }
});

function genFunc (funcArgs, funcBody, funcIdx) {
  let func = new Function(...funcArgs, funcBody);
  return function (...args) {
    document.dispatchEvent(new CustomEvent('ChromeExtensionInjectFunctions', {
      detail: {
        type: 'used',
        data: funcIdx
      }
    }));
    return func(...args);
  }
}