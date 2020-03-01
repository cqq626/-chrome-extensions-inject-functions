let funcsG = [];
function getFuncs (cb) {
  chrome.storage.local.get('funcs', function(data) {
    funcsG = data.funcs;
    cb && cb();
  });
}
function updateFuncs () {
  chrome.storage.local.set({funcs: funcsG});
  chrome.runtime.sendMessage({type: 'updateFromContentScript'});
}

// inject script into webpage to get the window variable
// https://stackoverflow.com/questions/9602022/chrome-extension-retrieving-global-variable-from-webpage
let s = document.createElement('script');
s.src = chrome.extension.getURL('injectScript.js');
(document.head||document.documentElement).appendChild(s);
s.onload = function() {
  injectFuncs();
};

document.addEventListener('ChromeExtensionInjectFunctions', function(e) {
  let { type, data } = e.detail;
  if (type === 'used') {
    funcsG[data].used++;
    updateFuncs();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'updateFromPopup') {
    injectFuncs();
  }
});

function injectFuncs () {
  getFuncs(() => {
    document.dispatchEvent(new CustomEvent('ChromeExtensionInjectFunctions', {
      detail: {
        type: 'init',
        data: funcsG
      }
    }));
  });
}