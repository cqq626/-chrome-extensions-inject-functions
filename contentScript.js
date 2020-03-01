function injectScripts () {
  chrome.storage.local.get('funcs', function(data) {
    for (let func of data.funcs) {
      let { funcName, func: fn } = func;
      window[funcName] = fn;
    }
  });
}

injectScripts();