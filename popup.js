let infoSuccessDom = document.querySelector('.info__success');
let infoErrorDom = document.querySelector('.info__error');
function setInfo (info, isErr) {
  let dom = isErr ? infoErrorDom : infoSuccessDom;
  dom.style.display = 'block';
  dom.innerText = info;
  setTimeout(() => {
    dom.style.display = 'none';
    dom.innerText = '';
  }, 2000);
}
let codeContentDOM = document.querySelector('.code__content');
let codeDescDOM = document.querySelector('.code__desc');
let codeOptsInfoDom = document.querySelector('.code-opts-info__inner');
let codeOptsInfoNameDom = document.querySelector('.code-opts-info__name');
let listPageInfoCurDom = document.querySelector('.list-page-info__cur');
let listPageInfoTotalDom = document.querySelector('.list-page-info__total');

let Data = new Proxy({}, {
  set: function (obj, prop, value, receiver) {
    switch (prop) {
      case 'infoSuccess':
        setInfo(value);
        return true;
      case 'infoError':
        setInfo(value, true)
        return true;
      case 'funcOriContent':
        codeContentDOM.value = value;
        return true;
      case 'funcDesc':
        codeDescDOM.value = value;
        return true;
      case 'pageCur':
        listPageInfoCurDom.innerText = value;
        setTimeout(updateList, 0);
        break;
      case 'pageTotal':
        listPageInfoTotalDom.innerText = value;
        break;
      case 'funcs':
        obj[prop] = new Proxy(value, {
          set: function (obj2, prop2, value2) {
            if (prop2 === 'length') {
              receiver.pageCur = 1;
              receiver.funcOriContent = '';
              receiver.funcDesc = '';
              receiver.funcEditing = '';
              receiver.pageTotal = Math.ceil(value2 / receiver.pageSize) || 1;
              chrome.storage.local.set({funcs: obj2});
              setTimeout(updateList, 0); 
            }
            obj2[prop2] = value2;
            return true;
          }
        });
        setTimeout(() => {
          obj[prop].splice(0, 0); // trigger proxy set function
        }, 0);
        return true;
      case 'funcEditing':
        if (value) {
          codeOptsInfoNameDom.innerText = value.funcName;
          codeOptsInfoDom.style.display = 'block';
          receiver.funcOriContent = value.funcOriContent;
          receiver.funcDesc = value.funcDesc;
        } else {
          codeOptsInfoNameDom.innerText = '';
          codeOptsInfoDom.style.display = 'none';
          receiver.funcOriContent = '';
          receiver.funcDesc = '';
        }
        break;
      default:
        break;
    }
    obj[prop] = value;
    return true;
  },
  get: function (obj, prop) {
    switch (prop) {
      case 'funcOriContent':
        return codeContentDOM.value.trim();
      case 'funcDesc':
        return codeDescDOM.value.trim();
      case 'pageSize':
        return 10;
      case 'pageCur':
        return obj[prop] || 1;
      default:
        return obj[prop];
    }
  }
});

let saveBtnDOM = document.querySelector('.code-opts__save');
let codeClearBtnDom = document.querySelector('.code-opts-info__clear');
let prevBtnDom = document.querySelector('.list-page-opts__prev');
let nextBtnDom = document.querySelector('.list-page-opts__next');
let listDom = document.querySelector('.list__content tbody');

saveBtnDOM.onclick = function () {
  let funcInfo = analyzeFunc(Data.funcOriContent);
  if (!funcInfo) {
    Data.infoError = `function parse error! please make sure it's valid function`;
    return true;
  }

  let newFuncItem = {
    funcName: funcInfo.funcName,
    funcDesc: Data.funcDesc,
    funcOriContent: Data.funcOriContent,
    used: 0,
    funcArgs: funcInfo.funcArgs,
    funcBody: funcInfo.funcBody
  };
  if (Data.funcEditing) {
    newFuncItem.used = Data.funcEditing.used;
    Data.funcs.splice(Data.funcEditing.idx, 1, newFuncItem);
    Data.infoSuccess = 'modify success!';
  } else {
    Data.funcs.push(newFuncItem);
    Data.infoSuccess = 'save success!';
  }
}

codeClearBtnDom.onclick = function () {
  Data.funcEditing = '';
}

prevBtnDom.onclick = function () {
  Data.pageCur = Data.pageCur - 1 >= 1 ? Data.pageCur - 1 : 1;
}

nextBtnDom.onclick = function () {
  Data.pageCur = Data.pageCur + 1 <= Data.pageTotal ? Data.pageCur + 1 : Data.pageTotal;
}

function updateList () {
  let { pageCur, pageSize, funcs } = Data;
  let baseIdx = (pageCur - 1) * pageSize;
  let showFuncs = funcs.slice(baseIdx, baseIdx + pageSize);
  let domFragment = document.createDocumentFragment();
  for (let i = 0; i < pageSize && showFuncs[i]; i++) {
    let func = showFuncs[i];
    let trDom = document.createElement('tr');
    let { funcName, funcDesc, used } = func;
    let nameDom = document.createElement('td');
    nameDom.innerText = funcName;
    nameDom.setAttribute('title', funcName);
    let descDom = document.createElement('td');
    descDom.innerText = funcDesc;
    descDom.setAttribute('title', funcDesc);
    let usedDom = document.createElement('td');
    usedDom.innerText = used;

    let optsDom = document.createElement('td');
    let editDom = document.createElement('a');
    editDom.innerText = 'edit';
    editDom.onclick = () => {
      modifyFunc(func, baseIdx + i, 'edit');
    };
    let deleteDom = document.createElement('a');
    deleteDom.innerText = 'delete';
    deleteDom.onclick = () => {
      modifyFunc(func, baseIdx + i, 'delete');
    };
    optsDom.appendChild(editDom);
    optsDom.appendChild(deleteDom);

    trDom.appendChild(nameDom);
    trDom.appendChild(descDom);
    trDom.appendChild(usedDom);
    trDom.appendChild(optsDom);
    domFragment.appendChild(trDom);
  }
  listDom.innerHTML = '';
  listDom.appendChild(domFragment);
}

function analyzeFunc (input) {
  let reg = /^\s*function\s*([a-zA-Z0-9_]*)\s*\(([a-zA-Z0-9,\._\s]*)\)\s*\{([^]*)\}\s*/g;
  let res = reg.exec(input);
  if (!res) {
    return null;
  }
  let args = res[2].trim();
  if (args) {
    args = args.split(',').map(val => val.trim());
  } else {
    args = [];
  }
  return {
    funcName: res[1].trim(),
    funcArgs: args,
    funcBody: res[3].trim()
  }
}

function modifyFunc (func, idx, type) {
  if (type === 'edit') {
    Data.funcEditing = {...func, idx};
  } else if (type === 'delete') {
    Data.funcs.splice(idx, 1);
    Data.infoSuccess = 'delete success!';
  }
}

function loadFuncs () {
  chrome.storage.local.get('funcs', function(data) {
    Data.funcs = data.funcs;
  });
}

loadFuncs();