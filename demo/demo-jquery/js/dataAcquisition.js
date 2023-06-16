var dataAcquisition = {
  store: {
    //配置项
    storeVer: "1.0.3", //版本号
    storeInput: "ACINPUT", //输入采集标记
    storePage: "ACPAGE", //页面采集标记
    storeClick: "ACCLIK", //点击事件采集标记
    storeReqErr: "ACRERR", //请求异常采集标记
    storeTiming: "ACTIME", //页面时间采集标记
    storeCodeErr: "ACCERR", //代码异常采集标记
    sendUrl: "http://127.0.0.1/push", //log采集地址（需配置）
    selector: "input", //通过控制输入框的选择器来限定监听范围,使用document.querySelector进行选择，值参考：https://www.runoob.com/cssref/css-selectors.html
    acRange: ["text", "tel"], //输入框采集范围, 不建议采集密码输入框内容，此处只为展示用
    userSha: "userSha", //用户标识
    // classTag     : '',          //自动埋点,数据大
    classTag: "isjs-ac", //主动埋点标识, 自动埋点时请配置空字符串
    maxDays: 5, //cookie期限
    acbLength: 2, //点击元素采集层数，自动埋点时会向上层查找，该选项可以配置查找层数
    useStorage: false, //自动检测是否使用storage，不要手动更改
    openInput: true, //是否开启输入数据采集
    openCodeErr: true, //是否开启代码异常采集
    openClick: true, //是否开启点击数据采集
    openAjaxData: true, //是否采集接口异常时的参数params
    openAjaxHock: true, //自动检测是否开启xhr异常采集
    openPerformance: true, //是否开启页面性能采集

    saveFirstTime: 0, // 记录进入页面的时间

    uuid: "", // 记录 浏览器指纹
  },
  util: {
    //工具函数
    isNullOrEmpty: function (obj) {
      return (
        (obj !== 0 || obj !== "0") &&
        (obj === undefined ||
          typeof obj === "undefined" ||
          obj === null ||
          obj === "null" ||
          obj === "")
      );
    },
    setCookie: function (name, value, Day) {
      if (dataAcquisition.store.useStorage) {
        window.localStorage.setItem(name, value);
      } else {
        if (!Day) Day = dataAcquisition.store.maxDays;
        var exp = new Date();
        exp.setTime(exp.getTime() + Day * 24 * 60 * 60000);
        document.cookie =
          name +
          "=" +
          encodeURIComponent(value) +
          ";expires=" +
          exp.toUTCString() +
          ";path=/";
      }
    },
    getCookie: function (name) {
      var arr,
        reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
      if (!name) return null;
      if (dataAcquisition.store.useStorage) {
        return window.localStorage.getItem(name);
      } else {
        if ((arr = document.cookie.match(reg))) {
          return decodeURIComponent(arr[2]);
        } else {
          return null;
        }
      }
    },
    delCookie: function (name) {
      if (dataAcquisition.store.useStorage) {
        window.localStorage.removeItem(name);
      } else {
        this.setCookie(name, "", -1);
      }
    },

    getTimeStr: function () {
      var date = new Date();
      var now = date.getFullYear() + "/";
      now += date.getMonth() + 1 + "/";
      now += date.getDate() + " ";
      now += date.getHours() + ":";
      now += date.getMinutes() + ":";
      now += date.getSeconds() + "";
      return now;
    },
  },

  // 获取浏览器指纹
  getUuid: function () {
    var that = this;
    if (window?.FingerprintJS) {
      const getFun = async function () {
        var fpPromise = FingerprintJS.load();
        // Analyze the visitor when necessary.
        var uuid = await fpPromise
          .then((fp) => fp.get())
          .then((result) => result.visitorId);
        that.store.uuid = uuid;
        that.util.setCookie(that.store.userSha, uuid);
      };

      getFun();
    }
  },
  routerChange: function () {
    var _this = this;
    window.onbeforeunload = function (e) {
      // window.alert("55555555");
      _this.postData();

      // return false;
    };
  },
  init: function () {
    var _this = this,
      _ACIDoms = document.querySelectorAll(this.store.selector);

    this.store.useStorage = typeof window.localStorage != "undefined";

    this.util.setCookie(this.store.storePage, window.location.pathname);

    if (this.util.isNullOrEmpty(this.util.getCookie(this.store.userSha))) {
      this.getUuid();
    }
    setTimeout(() => {
      this.postData();
    }, 300);
    this.routerChange();
    //对ajax绑定error处理，将异常信息做上报
    if (this.store.openAjaxHock) {
      this.bindAjaxHook();
    }

    //对页面加载信息进行监听上报  //加载信息不做处理
    // if (this.store.openPerformance) {
    //   this.setPerformanceAc();
    // }

    //对代码异常做监控，对异常上报
    if (this.store.openCodeErr) {
      this.bindCodeHook();
    }

    //输入框事件监听
    if (this.store.openInput) {
      //输入框事件监听
      for (var i = 0; i < _ACIDoms.length; i++) {
        var selector = _ACIDoms[i];
        if (
          selector.type &&
          dataAcquisition.store.acRange.indexOf(selector.type.toLowerCase()) >
            -1
        ) {
          selector.addEventListener("input", function () {
            dataAcquisition.setInputAc(this);
          });
          selector.addEventListener("focus", function () {
            dataAcquisition.setInputAc(this);
          });
          selector.addEventListener("blur", function () {
            dataAcquisition.setInputAc(this);
          });
        }
      }
    }

    //点击事件监听
    if (this.store.openClick) {
      //对本页面添加监听（ios兼容性问题）
      if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) {
        var elements = document.getElementsByTagName("body")[0].childNodes;
        for (var z = 0, length = elements.length; z < length; z++) {
          elements[z].addEventListener("click", function () {});
        }
      }

      document.addEventListener("click", function (e) {
        var event = window.event || e;
        var target = event.srcElement ? event.srcElement : event.target;
        _this.getACBtarget(target);
      });
    }
    return this;
  },
  bindAjaxHook: function () {
    //对ajax中的异常进行捕获,需将代码置于业务代码之前，对所有请求进行代理
    var nativeAjaxOpen = XMLHttpRequest.prototype.open;
    var nativeAjaxSend = XMLHttpRequest.prototype.send;
    var nativeAjaxonReady = XMLHttpRequest.onreadystatechange;
    var proxyXhrObj = {
      open: function () {
        this.method = arguments[0] || [];
        this._url =
          typeof arguments[1] === "string" ? arguments[1] : arguments[1].href;
        return nativeAjaxOpen && nativeAjaxOpen.apply(this, arguments);
      },
      send: function () {
        this.send_time = +new Date();
        this.post_data = arguments[0] || [] || "";

        this.addEventListener("error", function (e) {
          dataAcquisition.setAjErrAc(e.target);
        });

        this.onreadystatechange = function (xhr) {
          dataAcquisition.setAjErrAc(xhr.target);
          nativeAjaxonReady && nativeAjaxonReady.apply(this, arguments);
        };

        return nativeAjaxSend && nativeAjaxSend.apply(this, arguments);
      },
    };
    XMLHttpRequest.prototype.open = proxyXhrObj.open;
    XMLHttpRequest.prototype.send = proxyXhrObj.send;
  },
  bindCodeHook: function () {
    var _this = this;
    window.onerror = function (msg, url, line, col, err) {
      if (_this.util.isNullOrEmpty(url)) {
        return true;
      }
      col = col || (window.event && window.event.errorCharacter) || 0;
      var codeErrData = {
        type: _this.store.storeCodeErr,
        path: _this.util.getCookie(_this.store.storePage),
        sTme: _this.util.getTimeStr(),
        msg: msg,
        ua: navigator.userAgent,
        line: line,
        col: col,
      };
      if (!!err && !!err.stack) {
        //可以直接使用堆栈信息
        codeErrData.err = err.stack.toString();
      } else if (!!arguments.callee) {
        //尝试通过callee获取异常堆栈
        var errmsg = [];
        var f = arguments.callee.caller,
          c = 3; //防止堆栈信息过大
        while (f && --c > 0) {
          errmsg.push(f.toString());
          if (f === f.caller) {
            break;
          }
          f = f.caller;
        }
        errmsg = errmsg.join(",");
        codeErrData.err = errmsg;
      } else {
        codeErrData.err = "";
      }
      dataAcquisition.setCodeErrAc(codeErrData);
    };
  },
  setPerformanceAc: function () {
    var _this = this;
    if (!!window.performance) {
      var _PerforMance = window.performance;
      var _Timing = _PerforMance.timing;
      var ACPdata = [];
      if (_Timing) {
        var loadAcData = {
          type: _this.store.storeTiming,
          sTme: _this.util.getTimeStr(),
          path: _this.util.getCookie(_this.store.storePage),
          //connectEnd : _Timing.connectEnd,     //返回浏览器与服务器之间的连接建立时的Unix毫秒时间戳
          //connectStart : _Timing.connectStart, //返回HTTP请求开始向服务器发送时的Unix毫秒时间戳
          //domComplete:_Timing.domComplete,//返回当前文档解析完成时的Unix毫秒时间戳。
          //domContentLoadedEventEnd : _Timing.domContentLoadedEventEnd,//返回当所有需要立即执行的脚本已经被执行（不论执行顺序）时的Unix毫秒时间戳。
          //domContentLoadedEventStart : _Timing.domContentLoadedEventStart,//返回当解析器发送DOMContentLoaded 事件，即所有需要被执行的脚本已经被解析时的Unix毫秒时间戳。
          //domInteractive : _Timing.domInteractive,//返回当前网页DOM结构结束解析、开始加载内嵌资源时的Unix毫秒时间戳。
          //domLoading : _Timing.domLoading,//返回当前网页DOM结构开始解析的Unix毫秒时间戳。
          //domainLookupEnd: _Timing.domainLookupEnd, //表征了域名查询结束的UNIX时间戳。
          //domainLookupStart: _Timing.domainLookupStart, //表征了域名查询开始的UNIX时间戳。
          //fetchStart: _Timing.fetchStart, //表征了浏览器准备好使用HTTP请求来获取(fetch)文档的UNIX时间戳。这个时间点会在检查任何应用缓存之前。
          //loadEventEnd: _Timing.loadEventEnd,//返回当load事件结束，即加载事件完成时的Unix毫秒时间戳。
          //loadEventStart: _Timing.loadEventStart,//load事件被发送时的Unix毫秒时间戳。
          //navigationStart: _Timing.navigationStart,//准备加载新页面的起始时间
          //redirectEnd: _Timing.redirectEnd,  //表征了最后一个HTTP重定向完成时（也就是说是HTTP响应的最后一个比特直接被收到的时间）的UNIX时间戳
          //redirectStart: _Timing.redirectStart, //表征了第一个HTTP重定向开始时的UNIX时间戳
          //requestStart: _Timing.requestStart,//返回浏览器向服务器发出HTTP请求时（或开始读取本地缓存时）的Unix毫秒时间戳。
          //responseEnd: _Timing.responseEnd,//返回浏览器从服务器收到（或从本地缓存读取，或从本地资源读取）最后一个字节时的Unix毫秒时间戳。
          //responseStart: _Timing.responseStart,//返回浏览器从服务器收到（或从本地缓存读取）第一个字节时的Unix毫秒时间戳
          //secureConnectionStart: _Timing.secureConnectionStart,  //浏览器与服务器开始安全链接的握手时的Unix毫秒时间戳
          //unloadEventEnd: _Timing.unloadEventEnd,    //表征了unload事件处理完成时的UNIX时间戳
          //unloadEventStart: _Timing.unloadEventStart //表征了unload事件抛出时的UNIX时间戳
        };
        loadAcData.DNS = _Timing.domainLookupEnd - _Timing.domainLookupStart; //DNS查询时间
        loadAcData.TCP = _Timing.connectEnd - _Timing.connectStart; //TCP连接耗时
        loadAcData.WT = _Timing.responseStart - _Timing.navigationStart; //白屏时间
        loadAcData.PRDOM = _Timing.domComplete - _Timing.responseEnd; //dom解析耗时
        loadAcData.ONL = _Timing.loadEventEnd - _Timing.navigationStart; //执行onload事件耗时
        loadAcData.DR =
          _Timing.domContentLoadedEventEnd - _Timing.navigationStart; //dom ready时间，脚本加载完成时间
        loadAcData.ALLRT = _Timing.responseEnd - _Timing.requestStart; //所有请求耗时
        loadAcData.FXHR = _Timing.fetchStart - _Timing.navigationStart; //第一个请求发起时间
        ACPdata.push(loadAcData);
        this.util.setCookie(this.store.storeTiming, JSON.stringify(ACPdata));
      }
    }
  },
  setCodeErrAc: function (data) {
    var storeString = this.util.getCookie(this.store.storeCodeErr);
    var ACCEdata = this.util.isNullOrEmpty(storeString)
      ? []
      : JSON.parse(storeString);
    ACCEdata.push(data);
    this.util.setCookie(this.store.storeCodeErr, JSON.stringify(ACCEdata));
  },
  setAjErrAc: function (xhr) {
    var _ajax = xhr,
      method = xhr.method,
      send_time = xhr.send_time,
      post_data = xhr.post_data,
      _url = xhr._url;

    if (_ajax.readyState == 4) {
      var status = _ajax.status,
        statusText = _ajax.statusText,
        response = _ajax.response,
        responseURL = _ajax.responseURL,
        ready_time = +new Date();

      var longTime = ready_time > 5000 + send_time,
        httpError =
          !(status >= 200 && status < 208) && status !== 0 && status !== 302;
      var storeString = this.util.getCookie(this.store.storeReqErr);
      var ACEdata = this.util.isNullOrEmpty(storeString)
        ? []
        : JSON.parse(storeString);
      var nowStr = this.util.getTimeStr();
      var resp = response;
      try {
        resp = JSON.parse(response);
      } catch (e) {}

      // if(longTime || httpError || (resp && resp.code === 10000)){
      var ErrorData = {
        type: this.store.storeReqErr,
        path: this.util.getCookie(this.store.storePage),
        sTme: nowStr,
        // isMaster: isMaster, //是否是生产环境
        requrl: responseURL,
        _url: _url,
        method: method,
        readyState: _ajax.readyState, //状态码
        status: status,
        statusText: statusText,
        resMs: ready_time - send_time,
        textStatus: ("" + response).substr(0, 200),
      };
      if (this.store.openAjaxData) {
        ErrorData.reqData = post_data;
      }
      ACEdata.push(ErrorData);
      this.util.setCookie(this.store.storeReqErr, JSON.stringify(ACEdata));
      // }
    }
  },
  setInputAc: function (e) {
    //输入框操作数据保存
    var storeString = this.util.getCookie(this.store.storeInput);
    var elementId = e.id;
    var className = e.className;
    var storeKey = "#" + elementId + "|" + className; //存储主键，保证同一元素不重复添加
    var ACIdata = this.util.isNullOrEmpty(storeString)
      ? {}
      : JSON.parse(storeString);
    var inputData = ACIdata[storeKey];
    //已存在的数据做补充不新增
    var now = new Date().getTime();
    var nowStr = this.util.getTimeStr();

    if (this.util.isNullOrEmpty(inputData)) {
      inputData = {};
      inputData.type = this.store.storeInput;
      inputData.path = this.util.getCookie(this.store.storePage);
      inputData.eId = elementId;
      inputData.className = className;
      inputData.val = e.value || e.innerText;
      inputData.sTme = nowStr;
      inputData.eTme = nowStr;
    } else {
      // inputData.val +=
      //   "," + (now - new Date(inputData.eTme).getTime()) + ":" + e.value;

      inputData.val = e.value;
      inputData.eTme = nowStr;
    }
    ACIdata[storeKey] = inputData;
    this.util.setCookie(this.store.storeInput, JSON.stringify(ACIdata));
  },
  setClickAc: function (e) {
    //元素点击数据保存
    if (this.util.isNullOrEmpty(e.id) && this.util.isNullOrEmpty(e.className)) {
      return;
    }
    //主动埋点生效
    if (
      !this.util.isNullOrEmpty(this.store.classTag) &&
      e.className.indexOf(this.store.classTag) < 0
    ) {
      return;
    }
    var storeString = this.util.getCookie(this.store.storeClick);
    var ACBdata = this.util.isNullOrEmpty(storeString)
      ? []
      : JSON.parse(storeString);

    var nowStr = this.util.getTimeStr();
    console.log(
      "🚀 ~ file: dataAcquisition.js:598 ~ dataAcquisition.e:",
      e.dataset
    );
    var clickData = {
      type: this.store.storeClick,
      path: this.util.getCookie(this.store.storePage),
      eId: e.id,
      className: e.className,
      val: e.value || e.innerText,
      sTme: nowStr,
      eTme: nowStr,
      // a 标签 属性
      href: e.href,

      typeName: e.dataset.myname,
    };
    ACBdata.push(clickData);
    this.util.setCookie(this.store.storeClick, JSON.stringify(ACBdata));
  },
  getAc2Type: function (type) {
    //获取本地数据
    var storeArr = [];
    var storeString = this.util.getCookie(type);
    if (!this.util.isNullOrEmpty(storeString)) {
      storeArr = JSON.parse(storeString);
    }
    // 上报数据后清除 本地数据
    this.util.delCookie(type);
    return storeArr;
  },
  getACBtarget: function (node, length) {
    //冒泡场景下将除document外所有父元素添加点击事件
    if (this.util.isNullOrEmpty(length)) {
      length = 0;
    }
    //length限制采集内容大小，只采集有效数据
    if (!this.util.isNullOrEmpty(node)) {
      var parentNode = node && node.parentNode;
      /* 自动埋点采集点击数据时,使用下面的建议*/
      this.setClickAc(node);
      if (
        Object.prototype.toString.call(parentNode) !==
          Object.prototype.toString.call(document) &&
        length < this.store.acbLength
      ) {
        this.getACBtarget(parentNode, ++length);
      }
    }
  },

  getIPs: function (callback) {
    console.log("--------");
    var ip_dups = {};
    var RTCPeerConnection =
      window.RTCPeerConnection ||
      window.mozRTCPeerConnection ||
      window.webkitRTCPeerConnection;
    var useWebKit = !!window.webkitRTCPeerConnection;
    var mediaConstraints = {
      optional: [{ RtpDataChannels: true }],
    };
    // 这里就是需要的ICEServer了
    var servers = {
      iceServers: [
        { urls: "stun:stun.services.mozilla.com" },
        { urls: "stun:stun.l.google.com:19302" },
      ],
    };
    var pc = new RTCPeerConnection(servers, mediaConstraints);
    function handleCandidate(candidate) {
      var ip_regex =
        /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/;
      var hasIp = ip_regex.exec(candidate);
      if (hasIp) {
        var ip_addr = ip_regex.exec(candidate)[1];
        if (ip_dups[ip_addr] === undefined) callback(ip_addr);

        ip_dups[ip_addr] = true;
      }
    }
    // 网络协商的过程
    pc.onicecandidate = function (ice) {
      if (ice.candidate) {
        handleCandidate(ice.candidate.candidate);
      }
    };
    pc.createDataChannel("");
    //创建一个SDP(session description protocol)会话描述协议 是一个纯文本信息 包含了媒体和网络协商的信息
    pc.createOffer(
      function (result) {
        pc.setLocalDescription(
          result,
          function () {},
          function () {}
        );
      },
      function () {}
    );
    setTimeout(function () {
      var lines = pc.localDescription.sdp.split("\n");
      lines.forEach(function (line) {
        if (line.indexOf("a=candidate:") === 0) handleCandidate(line);
      });
    }, 1000);
  },
  postData: async function () {
    //数据上报
    var _this = this,
      data = [],
      storePath = window.location.pathname,
      nowStr = this.util.getTimeStr(),
      inputAcData = this.getAc2Type(this.store.storeInput),
      clickAcData = this.getAc2Type(this.store.storeClick),
      reqErrAcData = this.getAc2Type(this.store.storeReqErr),
      timingAcData = this.getAc2Type(this.store.storeTiming),
      codeErrAcData = this.getAc2Type(this.store.storeCodeErr);

    this.store.saveFirstTime =
      this.store.saveFirstTime || this.util.getTimeStr();

    //上报数据
    data.push({
      type: _this.store.storePage,
      path: storePath,
      sTme: _this.store.saveFirstTime,
      eTme: nowStr,
      uuid: _this.util.getCookie(_this.store.userSha),
      referrer: document.referrer,
    });
    if (!_this.util.isNullOrEmpty(inputAcData)) {
      for (var key in inputAcData) {
        data.push(inputAcData[key]);
      }
    }
    data = data.concat(clickAcData, reqErrAcData, codeErrAcData, timingAcData);

    console.log("===================上报数据集合", data);

    // this.sendData(`data=${JSON.stringify(data)}`);

    // //接口上报
    // this._ajax({
    //   type: "POST",
    //   dataType: "json",
    //   contentType: "application/json",
    //   data: JSON.stringify({ uuid: uuid, acData: data }),
    //   url: _this.store.sendUrl,
    // });
  },

  //利用gif 上报
  sendData: function (data) {
    const img = new Image();
    const params = new URLSearchParams(data).toString();
    img.src = `${this.store.sendUrl}/track.gif?${params}`;
  },

  _ajax: function (options) {
    var xhr, params;
    options = options || {};
    options.type = (options.type || "GET").toUpperCase();
    options.dataType = options.dataType || "json";
    options.async = options.async || true;
    if (options.data) {
      params = options.data;
    }
    // 非IE6
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
      if (xhr.overrideMimeType) {
        xhr.overrideMimeType("text/xml");
      }
    } else {
      //IE6及其以下版本浏览器
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }

    if (options.type == "GET") {
      xhr.open("GET", options.url + "?" + params, options.async);
      xhr.send(null);
    } else if (options.type == "POST") {
      xhr.open("POST", options.url, options.async);
      xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
      if (params) {
        xhr.send(params);
      } else {
        xhr.send();
      }
    }
  },
};

if (typeof define === "function" && define.amd) {
  define("dataAc", ["jquery"], function () {
    return dataAcquisition.init();
  });
} else {
  window["dataAc"] = dataAcquisition.init();
}
